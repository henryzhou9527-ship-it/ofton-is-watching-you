import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

_temp = tempfile.TemporaryDirectory()
os.environ['OFTON_DATA_DIR'] = _temp.name
import runtime
import agent
import launcher


class Response:
    def __init__(self, status=200, body=None):
        self.status_code = status
        self.body = body

    def json(self):
        if isinstance(self.body, Exception):
            raise self.body
        return self.body


class Session:
    def __init__(self, results):
        self.results = iter(results)
        self.headers = {}
        self.trust_env = False
        self.payload = None

    def post(self, url, **kwargs):
        self.payload = kwargs['json']
        result = next(self.results)
        if isinstance(result, Exception):
            raise result
        return result

    def close(self):
        pass


class RecoveryTests(unittest.TestCase):
    def setUp(self):
        runtime._health.clear()
        runtime.set_enabled(True)

    def test_server_acknowledgement_required(self):
        reporter = agent.Reporter('https://example.test', 'x' * 40)
        reporter.session = Session([Response(200, ValueError('html')), Response(409, {}), Response(200, {'ok': True})])
        self.assertFalse(reporter.send('editor.exe', 'private document'))
        self.assertFalse(reporter.send('editor.exe', 'private document'))
        self.assertTrue(reporter.send('editor.exe', 'private document'))
        self.assertEqual(reporter.session.payload['window_title'], '')
        self.assertTrue(runtime.read_json(runtime.data_dir()/'health.json')['last_success_at'])

    def test_timeout_reconnects_and_does_not_enter_five_minute_pause(self):
        reporter = agent.Reporter('https://example.test', 'x' * 40)
        reporter.session = Session([agent.requests.exceptions.ReadTimeout()])
        replacement = Session([Response(503, {}) for _ in range(8)] + [Response(200, {'ok': True})])
        with patch('agent.requests.Session', return_value=replacement):
            self.assertFalse(reporter.send('editor.exe', 'private'))
        for _ in range(8):
            self.assertFalse(reporter.send('editor.exe', 'private'))
            self.assertLessEqual(reporter.retry_delay, 30)
            self.assertEqual(reporter.pause_remaining, 0)
        self.assertTrue(reporter.send('editor.exe', 'private'))
        self.assertEqual(reporter.retry_delay, 0)

    def test_loop_liveness_is_distinct_from_network_success(self):
        health = {'pid': 9, 'phase': 'running', 'loop_monotonic': 500, 'last_error': 'ReadTimeout'}
        self.assertFalse(runtime.stalled(health, 9, 520, 0))
        self.assertTrue(runtime.stalled(health, 9, 700, 0))
        self.assertFalse(runtime.stalled(health, 9, 700, 750), 'wake grace')
        self.assertFalse(runtime.stalled({**health, 'phase': 'settings'}, 9, 700, 0))
        self.assertTrue(runtime.stalled(health, 10, 700, 0), 'old process health cannot hide a stall')

    def test_manual_pause_survives_automatic_invocation(self):
        runtime.pause()
        self.assertEqual(launcher.supervise(), 0)
        self.assertFalse(runtime.enabled())
        self.assertEqual((runtime.data_dir()/'control.txt').read_text().strip(), 'stop')

    def test_missing_process_is_not_reported_running(self):
        runtime.atomic_json(runtime.data_dir()/'supervisor.json', {'worker_pid': 999999999, 'worker_created_at': 1})
        self.assertFalse(launcher.status()['worker_running'])

    def test_metadata_privacy_remains_in_outgoing_reports(self):
        reporter = agent.Reporter('https://example.test', 'x' * 40)
        reporter.session = Session([Response(200, {'ok': True}), Response(200, {'ok': True})])
        reporter.send('chrome.exe', 'Demo_哔哩哔哩_bilibili - Google Chrome')
        self.assertEqual(reporter.session.payload['extra']['video']['title'], 'Demo')
        self.assertEqual(reporter.session.payload['window_title'], '')
        reporter.send('chrome.exe', 'private.pdf - Google Chrome')
        self.assertNotIn('extra', reporter.session.payload)


if __name__ == '__main__':
    unittest.main()
