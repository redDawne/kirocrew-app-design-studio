"""Core tests: store, design system, rules, MCP protocol, backend routing.

Run: python3 -m unittest discover -s tests
"""
from __future__ import annotations

import hashlib
import hmac
import importlib.util
import json
import os
import sys
import tempfile
import time
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from studio import design_system as ds  # noqa: E402
from studio import render, rules  # noqa: E402
from studio.store import Store, StoreError  # noqa: E402


def _load(name: str, rel: str):
    spec = importlib.util.spec_from_file_location(name, ROOT / rel)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


class StoreTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.store = Store(Path(self.tmp.name))

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_round_lifecycle(self) -> None:
        p = self.store.create_project("Billing dashboard", "dashboard")
        r = self.store.create_round(p["id"], "A billing overview", 2)
        v1 = self.store.save_variant(p["id"], r["id"], "Dense ledger", "<main>a</main>")
        self.assertEqual(self.store.get_project(p["id"])["rounds"][0]["status"], "designing")
        self.store.save_variant(p["id"], r["id"], "Editorial", "<main>b</main>")
        self.assertEqual(self.store.get_project(p["id"])["rounds"][0]["status"], "reviewing")
        for v in self.store.list_variants(p["id"]):
            self.store.save_variant(p["id"], r["id"], v["title"], "<main>c</main>", stage="reviewed",
                                    variant_id=v["id"])
        self.assertEqual(self.store.get_project(p["id"])["rounds"][0]["status"], "ready")
        self.assertEqual(self.store.get_variant(p["id"], v1["id"])["html"], "<main>c</main>")
        self.store.save_export(p["id"], v1["id"], "export default function X() {}")
        self.assertIn("function X", self.store.get_export(p["id"], v1["id"]))

    def test_rejects_bad_ids_and_paths(self) -> None:
        for bad in ("../etc", "a/b", "", "UPPER", "x" * 70):
            with self.assertRaises(StoreError):
                self.store.get_project(bad)
        p = self.store.create_project("x")
        with self.assertRaises(StoreError):
            self.store.save_variant(p["id"], "r-missing", "t", "<p>x</p>")
        with self.assertRaises(StoreError):
            self.store.create_round(p["id"], "   ")


class DesignSystemTests(unittest.TestCase):
    def test_default_passes_contrast(self) -> None:
        for t in ds.APP_TYPES:
            self.assertTrue(all(r["pass"] for r in ds.contrast_report(ds.default_system(t))), t)

    def test_validate_rejects_bad_values(self) -> None:
        good = ds.default_system()
        for patch in ({"colors": {"accent": "red"}}, {"fonts": {"sans": "x;}</style>"}},
                      {"radii": {"md": 99}}, {"spacingBase": 5}, {"typeScale": [16, 12, 20, 24]}):
            with self.assertRaises(ValueError, msg=str(patch)):
                ds.validate({**good, **patch})
        self.assertEqual(ds.validate(good)["colors"]["accent"], good["colors"]["accent"].upper())

    def test_contrast_math(self) -> None:
        self.assertEqual(ds.contrast("#000000", "#FFFFFF"), 21.0)


class RulesTests(unittest.TestCase):
    system = ds.default_system()

    def ids(self, html: str) -> set[str]:
        return {f["rule"] for f in rules.check(html, self.system)["findings"]}

    def test_catches_ai_tells(self) -> None:
        html = ('<div class="bg-gradient-to-r from-purple-500 to-blue-500 backdrop-blur-md p-[13px] text-[15px]">'
                '<p>Lorem ipsum</p><span>\U0001F680</span><p class="text-indigo-600">John Doe</p></div>')
        found = self.ids(html)
        for rule in ("R5-real-content", "R7-no-emoji-icons", "R6-no-default-gradients", "R8-no-default-glass",
                     "R2-one-accent", "R3-spacing-grid", "R1-type-scale"):
            self.assertIn(rule, found)
        self.assertFalse(rules.check(html, self.system)["pass"])

    def test_clean_markup_passes(self) -> None:
        html = ('<main class="p-6 grid gap-4"><h1 class="text-2xl font-semibold">Invoices</h1>'
                '<p class="text-sm text-muted">Due this week: 14</p><a class="text-base text-accent">View</a>'
                '<img src="data:," alt="Chart of revenue"></main>')
        report = rules.check(html, self.system)
        self.assertTrue(report["pass"], report)


class RenderTests(unittest.TestCase):
    def test_wrap_injects_tokens_and_strips_cdn(self) -> None:
        doc = render.wrap('<html><body><script src="https://cdn.tailwindcss.com"></script><p>Hi</p></body></html>',
                          ds.default_system(), title="T<x>")
        self.assertIn("tailwind.config =", doc)
        self.assertIn('"accent-ink"', doc)
        self.assertNotIn("cdn.tailwindcss.com\"", doc)
        self.assertIn("<title>Tx</title>", doc)
        self.assertIn("<p>Hi</p>", doc)

    @unittest.skipUnless(render.find_chrome() and os.environ.get("DS_RENDER_TEST"), "set DS_RENDER_TEST=1")
    def test_screenshot(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            out = render.screenshot(render.wrap('<h1 class="text-4xl p-8">Hi</h1>', ds.default_system()),
                                    Path(tmp) / "x.png", viewport="mobile")
            self.assertGreater(out.stat().st_size, 1000)


class McpTests(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        os.environ["DESIGN_STUDIO_DATA"] = self.tmp.name
        self.mcp = _load("ds_mcp", "mcp/server.py")

    def tearDown(self) -> None:
        os.environ.pop("DESIGN_STUDIO_DATA", None)
        self.tmp.cleanup()

    def call(self, name: str, args: dict) -> dict:
        return self.mcp.handle({"jsonrpc": "2.0", "id": 1, "method": "tools/call",
                                "params": {"name": name, "arguments": args}})["result"]

    def test_protocol_and_tools(self) -> None:
        init = self.mcp.handle({"jsonrpc": "2.0", "id": 0, "method": "initialize", "params": {}})
        self.assertEqual(init["result"]["serverInfo"]["name"], "design-studio")
        self.assertIsNone(self.mcp.handle({"jsonrpc": "2.0", "method": "notifications/initialized"}))
        names = {t["name"] for t in self.mcp.handle({"jsonrpc": "2.0", "id": 2, "method": "tools/list"})
                 ["result"]["tools"]}
        self.assertEqual(names, set(self.mcp.HANDLERS))
        p = self.mcp.STORE.create_project("Habits", "mobile")
        r = self.mcp.STORE.create_round(p["id"], "Habit tracker home", 1)
        saved = json.loads(self.call("save_variant", {"project_id": p["id"], "round_id": r["id"], "title": "Calm",
                                                      "html": "<body><p>Lorem ipsum</p></body>"})["content"][0]["text"])
        self.assertEqual(saved["saved"]["stage"], "draft")
        self.assertFalse(saved["checks"]["pass"])
        loaded = json.loads(self.call("load_variant", {"project_id": p["id"],
                                                       "variant_id": saved["saved"]["id"]})["content"][0]["text"])
        self.assertEqual(loaded["html"], "<p>Lorem ipsum</p>")
        bad = self.call("load_variant", {"project_id": "../x", "variant_id": "v-1"})
        self.assertTrue(bad["isError"])


class BackendTests(unittest.TestCase):
    def setUp(self) -> None:
        self.srv = _load("ds_backend", "backend/server.py")

    def test_routing(self) -> None:
        self.assertEqual(self.srv.normalize_path("/api/projects?x=1"), "/projects")
        self.assertEqual(self.srv.normalize_path("/apis"), "/apis")
        fn, params = self.srv.resolve("GET", "/projects/abc-1/variants/v-2")
        self.assertEqual(params, {"pid": "abc-1", "vid": "v-2"})
        self.assertIsNone(self.srv.resolve("DELETE", "/projects"))

    def test_signature(self) -> None:
        os.environ["KIROCREW_PROXY_SECRET"] = "s3cret"
        try:
            ts = str(int(time.time()))
            body = b'{"a":1}'
            msg = f"{ts}:POST:/api/projects:{hashlib.sha256(body).hexdigest()}"
            sig = hmac.new(b"s3cret", msg.encode(), hashlib.sha256).hexdigest()
            ok = self.srv.verify_proxy_signature(f"{ts}:{sig}", method="POST", target="/api/projects", body=body)
            self.assertTrue(ok)
            self.assertFalse(self.srv.verify_proxy_signature(f"{ts}:{sig}", method="POST",
                                                             target="/api/projects", body=b"{}"))
            self.assertFalse(self.srv.verify_proxy_signature("", method="GET", target="/", body=b""))
        finally:
            os.environ.pop("KIROCREW_PROXY_SECRET")


if __name__ == "__main__":
    unittest.main()
