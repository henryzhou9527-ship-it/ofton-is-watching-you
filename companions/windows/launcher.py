"""Ofton desktop supervisor. The scheduled task may safely invoke it repeatedly."""
import argparse
import ctypes
import json
import logging
import os
from pathlib import Path
import subprocess
import sys
import time

import psutil
import runtime

log = logging.getLogger('supervisor')


def command(mode):
    prefix = [sys.executable] if getattr(sys, 'frozen', False) else [sys.executable, str(Path(__file__).resolve())]
    return prefix + [mode, '--data-dir', str(runtime.data_dir())]


def owned_worker(record):
    try:
        process = psutil.Process(int(record.get('worker_pid', 0)))
        if abs(process.create_time() - float(record.get('worker_created_at', 0))) > 1:
            return None
        args = process.cmdline()
        if '--worker' not in args or '--data-dir' not in args:
            return None
        if Path(args[args.index('--data-dir') + 1]).resolve() != runtime.data_dir().resolve():
            return None
        if Path(process.exe()).resolve() != Path(sys.executable).resolve():
            return None
        if not getattr(sys, 'frozen', False) and str(Path(__file__).resolve()) not in args:
            return None
        return process if process.is_running() else None
    except (psutil.Error, ValueError, TypeError, IndexError):
        return None


def owned_supervisor(record):
    try:
        process = psutil.Process(int(record.get('supervisor_pid', 0)))
        if abs(process.create_time() - float(record.get('supervisor_created_at', 0))) > 1:
            return None
        if Path(process.exe()).resolve() != Path(sys.executable).resolve():
            return None
        args = process.cmdline()
        if '--data-dir' not in args or Path(args[args.index('--data-dir') + 1]).resolve() != runtime.data_dir().resolve():
            return None
        if '--worker' in args or not any(mode in args for mode in ['--start', '--supervise']):
            return None
        return process
    except (psutil.Error, ValueError, TypeError, IndexError):
        return None


def status():
    record = runtime.read_json(runtime.data_dir() / 'supervisor.json')
    health = runtime.read_json(runtime.data_dir() / 'health.json')
    worker = owned_worker(record)
    return {
        'enabled': runtime.enabled(),
        'supervisor_running': bool(owned_supervisor(record)),
        'worker_running': bool(worker),
        'worker_pid': worker.pid if worker else None,
        'last_success_at': health.get('last_success_at') if worker and health.get('pid') == worker.pid else None,
        'last_error': health.get('last_error'),
        'phase': 'paused' if not runtime.enabled() else health.get('phase', 'starting'),
        'automatic_recovery': runtime.automatic_recovery_enabled(),
    }


def supervise():
    if not runtime.enabled():
        return 0
    lock = runtime.InstanceLock('supervisor')
    if not lock.acquired:
        lock.close()
        return 0
    runtime.setup_logging('supervisor')
    record_path = runtime.data_dir() / 'supervisor.json'
    record = runtime.read_json(record_path)
    worker = owned_worker(record)
    own = psutil.Process()
    record.update(supervisor_pid=own.pid, supervisor_created_at=own.create_time(), started_at=runtime.utc_now())
    grace_until = time.monotonic() + 120
    restart_delay = 2
    last_tick = time.monotonic()
    child = None
    log.info('Supervisor started; existing worker=%s', worker.pid if worker else None)
    try:
        while runtime.enabled():
            now = time.monotonic()
            if now - last_tick > 30:
                # Give a resumed machine time to refresh the loop before judging staleness.
                grace_until = now + 90
                log.info('Resumed after suspension; allowing worker to reconnect')
            last_tick = now
            alive = owned_worker(record)
            if alive is None:
                if worker is not None:
                    code = child.poll() if child else 'unavailable'
                    log.warning('Worker exited unexpectedly; pid=%s exit=%s; restarting', worker.pid, code)
                    time.sleep(restart_delay)
                    restart_delay = min(30, restart_delay * 2)
                if not runtime.enabled():
                    break
                (runtime.data_dir() / 'control.txt').write_text('run\n', encoding='utf-8')
                child = subprocess.Popen(command('--worker'), cwd=runtime.data_dir(), stdin=subprocess.DEVNULL,
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                    creationflags=subprocess.CREATE_NO_WINDOW | subprocess.CREATE_NEW_PROCESS_GROUP)
                worker = psutil.Process(child.pid)
                record.update(worker_pid=worker.pid, worker_created_at=worker.create_time(), worker_started_at=runtime.utc_now())
                grace_until = time.monotonic() + 120
                log.info('Started worker pid=%s', worker.pid)
            else:
                worker = alive
                health = runtime.read_json(runtime.data_dir() / 'health.json')
                if runtime.stalled(health, worker.pid, now, grace_until):
                    log.error('Worker loop stopped responding; restarting pid=%s', worker.pid)
                    worker.terminate()
                    try:
                        worker.wait(timeout=5)
                    except psutil.TimeoutExpired:
                        worker.kill()
                    # Keep worker reference so the next iteration records the restart.
                    continue
                if now > grace_until:
                    restart_delay = 2
            record.update(checked_at=runtime.utc_now(), enabled=True)
            runtime.atomic_json(record_path, record)
            time.sleep(2)
        # Explicit stop persists; a scheduled invocation must never resume it.
        worker = owned_worker(record)
        if worker:
            (runtime.data_dir() / 'control.txt').write_text('stop\n', encoding='utf-8')
            try:
                worker.wait(timeout=12)
            except psutil.TimeoutExpired:
                worker.terminate()
        record.update(enabled=False, stopped_at=runtime.utc_now())
        runtime.atomic_json(record_path, record)
        log.info('Stopped by user; automatic invocations will remain paused')
        return 0
    finally:
        lock.close()


def run_worker():
    lock = runtime.InstanceLock('worker')
    if not lock.acquired:
        lock.close()
        return 0
    if not runtime.enabled():
        lock.close()
        return 0
    runtime.setup_logging('worker')
    os.environ['SHIJIAN_AGENT_CONTROL_PATH'] = str(runtime.data_dir() / 'control.txt')
    runtime.set_phase('starting')
    try:
        import agent
        agent.main()
        return 0
    except Exception:
        log.exception('Worker terminated with an exception')
        return 1
    finally:
        lock.close()


def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group()
    for flag in ['start', 'supervise', 'worker', 'pause', 'status']:
        group.add_argument('--' + flag, action='store_true')
    parser.add_argument('--data-dir')
    parser.add_argument('--json', action='store_true')
    args = parser.parse_args()
    if args.data_dir:
        os.environ['OFTON_DATA_DIR'] = args.data_dir
    if args.pause:
        runtime.pause()
        return 0
    if args.status:
        result = status()
        if args.json:
            runtime.atomic_json(runtime.data_dir() / 'status.json', result)
            if sys.stdout:
                print(json.dumps(result, ensure_ascii=False))
        else:
            text = f"上报：{'运行中' if result['worker_running'] else '已停止'}\n自动恢复：{'已启用' if result['automatic_recovery'] else '未安装'}\n最近成功：{result['last_success_at'] or '暂无'}\n错误：{result['last_error'] or '无'}"
            ctypes.windll.user32.MessageBoxW(None, text, 'お布団巻き · 电脑状态', 0)
        return 0
    if args.worker:
        return run_worker()
    if args.start or not args.supervise:
        runtime.set_enabled(True)
    return supervise()


if __name__ == '__main__':
    try:
        raise SystemExit(main())
    except Exception:
        runtime.setup_logging('supervisor')
        log.exception('Supervisor failed; scheduled task will retry')
        raise SystemExit(1)
