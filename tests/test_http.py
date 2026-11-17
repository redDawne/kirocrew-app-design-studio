"""End-to-end HTTP test: the real backend on a loopback port, signed like the gateway signs.

Run: python3 -m unittest tests.test_http   (DS_RENDER_TEST=1 also renders a PNG)
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import importlib.util
import json
import os
import tempfile
import threading
import time
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SECRET = "test-secret"


class HttpTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.tmp = tempfile.TemporaryDirectory()
        os.environ["DESIGN_STUDIO_DATA"] = cls.tmp.name
        os.environ["KIROCREW_PROXY_SECRET"] = SECRET
        spec = importlib.util.spec_from_file_location("ds_backend_http", ROOT / "backend" / "server.py")
        cls.srv = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.srv)
        cls.httpd = ThreadingHTTPServer(("127.0.0.1", 0), cls.srv.Handler)
        cls.base = f"http://127.0.0.1:{cls.httpd.server_address[1]}"
        threading.Thread(target=cls.httpd.serve_forever, daemon=True).start()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.httpd.shutdown()
        cls.httpd.server_close()
        os.environ.pop("DESIGN_STUDIO_DATA", None)
        os.environ.pop("KIROCREW_PROXY_SECRET", None)
        cls.tmp.cleanup()

    def call(self, method: str, path: str, body: dict | None = None, *, sign: bool = True) -> tuple[int, dict]:
        raw = json.dumps(body).encode() if body is not None else b""
        headers = {"Content-Type": "application/json"}
        if sign:
            ts = str(int(time.time()))
            msg = f"{ts}:{method}:{path}:{hashlib.sha256(raw).hexdigest()}"
            headers["X-KiroCrew-Proxy"] = f"{ts}:{hmac.new(SECRET.encode(), msg.encode(), hashlib.sha256).hexdigest()}"
        req = urllib.request.Request(self.base + path, data=raw if method != "GET" else None, method=method,
                                     headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                return r.status, json.loads(r.read())
        except urllib.error.HTTPError as e:
            raw_err = e.read()
            return e.code, json.loads(raw_err) if e.headers.get_content_type() == "application/json" else {}

    def test_flow(self) -> None:
        self.assertEqual(self.call("GET", "/health", sign=False)[0], 200)
        self.assertEqual(self.call("GET", "/api/projects", sign=False)[0], 401)

        code, p = self.call("POST", "/api/projects", {"name": "Habit tracker", "appType": "mobile"})
        self.assertEqual(code, 201)
        pid = p["id"]
        code, r = self.call("POST", f"/api/projects/{pid}/rounds", {"prompt": "Home screen", "count": 1})
        self.assertEqual(code, 201)

        v = self.srv.STORE.save_variant(pid, r["id"], "Calm list",
                                        '<div class="p-6"><h1 class="text-3xl">Today</h1>'
                                        '<p class="text-sm text-muted">3 habits left</p></div>')
        code, proj = self.call("GET", f"/api/projects/{pid}")
        self.assertEqual((code, proj["rounds"][0]["status"]), (200, "reviewing"))
        self.assertTrue(all(c["pass"] for c in proj["contrast"]))

        code, var = self.call("GET", f"/api/projects/{pid}/variants/{v['id']}")
        self.assertEqual(code, 200)
        self.assertTrue(var["checks"]["pass"], var["checks"])
        self.assertIn("tailwind.config", var["document"])

        code, mark = self.call("POST", f"/api/projects/{pid}/rounds/{r['id']}", {"criticRequested": True})
        self.assertEqual((code, mark["criticRequested"]), (200, True))

        code, ds_ = self.call("PUT", f"/api/projects/{pid}/design-system",
                              {"designSystem": {**proj["designSystem"], "colors": {**proj["designSystem"]["colors"],
                                                                                   "accent": "#FFFF00"}}})
        self.assertEqual(code, 200)
        self.assertFalse(all(c["pass"] for c in ds_["contrast"]))  # saved, and the page shows the failure
        self.assertEqual(self.call("PUT", f"/api/projects/{pid}/design-system",
                                   {"designSystem": {"colors": {"accent": "nope"}}})[0], 400)
        self.assertEqual(self.call("GET", "/api/projects/..%2Fetc")[0], 400)
        self.assertEqual(self.call("DELETE", "/api/projects")[0], 501)  # http.server: no do_DELETE

        if os.environ.get("DS_RENDER_TEST"):
            code, png = self.call("POST", f"/api/projects/{pid}/variants/{v['id']}/png", {"viewport": "mobile"})
            self.assertEqual(code, 200, png)
            self.assertTrue(base64.b64decode(png["png"]).startswith(b"\x89PNG"))


if __name__ == "__main__":
    unittest.main()
