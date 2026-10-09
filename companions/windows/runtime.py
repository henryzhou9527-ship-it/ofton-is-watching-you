"""Local lifecycle and diagnostic state. Never stores activity titles or credentials."""
import ctypes
from datetime import datetime, timezone
import hashlib
import json
import logging
from logging.handlers import RotatingFileHandler
import os
from pathlib import Path
import sys
import threading
import time

_health = {}
_lock = threading.Lock()


def data_dir():
    installed = Path(sys.executable).parent
    default = installed.parent / 'data' if getattr(sys, 'frozen', False) and installed.name == 'app' else Path(os.environ.get('LOCALAPPDATA', Path.home())) / 'OftonWatching' / 'data'
    path = Path(os.environ.get('OFTON_DATA_DIR') or default)
    path.mkdir(parents=True, exist_ok=True)
    return path


def utc_now():
    return datetime.now(timezone.utc).isoformat()


def atomic_json(path, value):
    path = Path(path)
    tmp = path.with_name(f'.{path.name}.{os.getpid()}.{threading.get_ident()}.tmp')
    try:
        tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2), encoding='utf-8')
        os.replace(tmp, path)
    finally:
        tmp.unlink(missing_ok=True)


def read_json(path, default=None):
    try:
        value = json.loads(Path(path).read_text(encoding='utf-8-sig'))
        return value if isinstance(value, dict) else (default or {})
    except (OSError, ValueError):
        return default or {}


def enabled():
    return read_json(data_dir() / 'control.json').get('enabled') is True


def set_enabled(value):
    atomic_json(data_dir() / 'control.json', {'enabled': bool(value), 'updated_at': utc_now()})
    (data_dir() / 'control.txt').write_text('run\n' if value else 'stop\n', encoding='utf-8')


def pause():
    set_enabled(False)


def automatic_recovery_enabled():
    return read_json(data_dir() / 'installation.json').get('automatic_recovery') is True


def setup_logging(role):
    handler = RotatingFileHandler(data_dir() / f'{role}.log', maxBytes=2_000_000, backupCount=2, encoding='utf-8')
    handler.setFormatter(logging.Formatter('%(asctime)s [%(levelname)s] %(message)s'))
    root = logging.getLogger()
    root.setLevel(logging.INFO)
    for old in root.handlers[:]:
        root.removeHandler(old)
        old.close()
    root.addHandler(handler)


def update_health(**values):
    with _lock:
        _health.update(values)
        _health.update(pid=os.getpid(), updated_at=utc_now())
        atomic_json(data_dir() / 'health.json', _health)


def touch_loop(timeout=120):
    update_health(phase='running', loop_monotonic=time.monotonic(), loop_timeout=timeout)


def set_phase(phase):
    update_health(phase=phase, loop_monotonic=time.monotonic())


def report_attempt():
    update_health(last_attempt_at=utc_now())


def report_success():
    update_health(last_success_at=utc_now(), last_error=None, consecutive_failures=0)


def report_failure(reason):
    update_health(last_error=reason, consecutive_failures=int(_health.get('consecutive_failures', 0)) + 1)


def stalled(health, pid, now, grace_until):
    if now < grace_until or health.get('phase') == 'settings':
        return False
    if health.get('pid') != pid:
        return True
    last = health.get('loop_monotonic')
    if not isinstance(last, (int, float)):
        return True
    return now - last > max(120, float(health.get('loop_timeout', 120)))


class InstanceLock:
    def __init__(self, role):
        # Local session namespace and per-install identity avoid affecting other users.
        identity = hashlib.sha256(str(data_dir().resolve()).lower().encode()).hexdigest()[:20]
        kernel = ctypes.WinDLL('kernel32', use_last_error=True)
        kernel.CreateMutexW.argtypes = [ctypes.c_void_p, ctypes.c_bool, ctypes.c_wchar_p]
        kernel.CreateMutexW.restype = ctypes.c_void_p
        kernel.CloseHandle.argtypes = [ctypes.c_void_p]
        kernel.CloseHandle.restype = ctypes.c_bool
        self.kernel = kernel
        self.handle = kernel.CreateMutexW(None, False, f'Local\\Ofton-{role}-{identity}')
        if not self.handle:
            raise ctypes.WinError(ctypes.get_last_error())
        self.acquired = ctypes.get_last_error() != 183

    def close(self):
        if self.handle:
            self.kernel.CloseHandle(self.handle)
            self.handle = None
