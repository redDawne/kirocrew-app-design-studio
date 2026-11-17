"""File-backed store for projects, rounds, variants and exports.

Layout under the data dir::

    projects/<pid>/project.json          name, rounds
    projects/<pid>/design-system.json    tokens every variant obeys
    projects/<pid>/variants/<vid>.html   the variant document (body markup or full page)
    projects/<pid>/variants/<vid>.json   metadata: round, title, stage, parent, notes
    projects/<pid>/variants/<vid>.png    last rendered screenshot (optional)
    projects/<pid>/exports/<vid>.tsx     React + Tailwind export (optional)

Ids are generated here and validated on every read so a caller (agent or page)
can never name a path outside the data dir.
"""
from __future__ import annotations

import json
import os
import re
import secrets
import time
from pathlib import Path
from typing import Any

from . import design_system as ds

ID_RE = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
STAGES = ("draft", "reviewed")
MAX_HTML_BYTES = 400_000
MAX_EXPORT_BYTES = 400_000


class StoreError(ValueError):
    """A caller error: bad id, missing object, oversized input."""


def default_data_dir() -> Path:
    env = os.environ.get("DESIGN_STUDIO_DATA")
    if env:
        return Path(env)
    home = Path(os.environ.get("KIROCREW_HOME", str(Path.home() / ".kiro" / "crew")))
    return home / "apps" / os.environ.get("KIROCREW_APP_NAME", "design-studio") / "data"


def _now() -> float:
    return round(time.time(), 3)


def _new_id(prefix: str) -> str:
    return f"{prefix}-{secrets.token_hex(4)}"


def _check_id(value: Any, what: str) -> str:
    if not isinstance(value, str) or not ID_RE.match(value):
        raise StoreError(f"invalid {what}: {value!r}")
    return value


def _write_json(path: Path, data: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    os.replace(tmp, path)


def _read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _slug(text: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s[:40] or "project"


class Store:
    def __init__(self, data_dir: Path | None = None) -> None:
        self.root = Path(data_dir or default_data_dir())
        self.projects_dir = self.root / "projects"

    # ------------------------------------------------------------ projects
    def _pdir(self, pid: str) -> Path:
        d = self.projects_dir / _check_id(pid, "project id")
        if not (d / "project.json").is_file():
            raise StoreError(f"no such project: {pid}")
        return d

    def create_project(self, name: str, app_type: str = "dashboard") -> dict[str, Any]:
        name = (name or "").strip()[:80] or "Untitled project"
        pid = f"{_slug(name)}-{secrets.token_hex(3)}"
        d = self.projects_dir / pid
        project = {"id": pid, "name": name, "createdAt": _now(), "rounds": []}
        _write_json(d / "project.json", project)
        _write_json(d / "design-system.json", ds.default_system(app_type))
        return project

    def list_projects(self) -> list[dict[str, Any]]:
        out = []
        if not self.projects_dir.is_dir():
            return out
        for d in self.projects_dir.iterdir():
            f = d / "project.json"
            if f.is_file():
                p = _read_json(f)
                out.append({
                    "id": p["id"],
                    "name": p["name"],
                    "createdAt": p["createdAt"],
                    "rounds": len(p.get("rounds", [])),
                    "variants": len(list((d / "variants").glob("*.json"))) if (d / "variants").is_dir() else 0,
                })
        return sorted(out, key=lambda p: p["createdAt"], reverse=True)

    def get_project(self, pid: str) -> dict[str, Any]:
        d = self._pdir(pid)
        project = _read_json(d / "project.json")
        variants = self.list_variants(pid)
        for r in project.get("rounds", []):
            r["status"] = _round_status(r, [v for v in variants if v.get("round") == r["id"]])
        project["designSystem"] = self.get_design_system(pid)
        project["variants"] = variants
        return project

    # ------------------------------------------------------- design system
    def get_design_system(self, pid: str) -> dict[str, Any]:
        # validate() also fills tokens added since the file was written.
        return ds.validate(_read_json(self._pdir(pid) / "design-system.json"))

    def set_design_system(self, pid: str, system: Any) -> dict[str, Any]:
        clean = ds.validate(system)
        _write_json(self._pdir(pid) / "design-system.json", clean)
        return clean

    # --------------------------------------------------------------- rounds
    def create_round(self, pid: str, prompt: str, count: int = 3, parent: str | None = None,
                     comment: str = "") -> dict[str, Any]:
        d = self._pdir(pid)
        prompt = (prompt or "").strip()
        if not prompt and not parent:
            raise StoreError("prompt is required")
        if parent:
            self._vmeta_path(pid, parent)  # must exist
        count = max(1, min(int(count or 3), 4))
        project = _read_json(d / "project.json")
        rnd = {
            "id": _new_id("r"),
            "prompt": prompt[:4000],
            "count": count,
            "parent": parent,
            "comment": comment[:4000],
            "createdAt": _now(),
            "criticRequested": False,
        }
        project.setdefault("rounds", []).append(rnd)
        _write_json(d / "project.json", project)
        return rnd

    def mark_round(self, pid: str, rid: str, **fields: Any) -> dict[str, Any]:
        d = self._pdir(pid)
        _check_id(rid, "round id")
        project = _read_json(d / "project.json")
        for r in project.get("rounds", []):
            if r["id"] == rid:
                for k in ("criticRequested", "chosen"):
                    if k in fields:
                        r[k] = fields[k]
                _write_json(d / "project.json", project)
                return r
        raise StoreError(f"no such round: {rid}")

    def _round_ids(self, pid: str) -> set[str]:
        return {r["id"] for r in _read_json(self._pdir(pid) / "project.json").get("rounds", [])}

    # ------------------------------------------------------------- variants
    def _vmeta_path(self, pid: str, vid: str) -> Path:
        p = self._pdir(pid) / "variants" / f"{_check_id(vid, 'variant id')}.json"
        if not p.is_file():
            raise StoreError(f"no such variant: {vid}")
        return p

    def save_variant(self, pid: str, round_id: str, title: str, html: str, *, stage: str = "draft",
                     variant_id: str | None = None, rationale: str = "", notes: str = "") -> dict[str, Any]:
        d = self._pdir(pid)
        if round_id not in self._round_ids(pid):
            raise StoreError(f"no such round: {round_id}")
        if stage not in STAGES:
            raise StoreError(f"stage must be one of {STAGES}")
        if not isinstance(html, str) or not html.strip():
            raise StoreError("html is required")
        if len(html.encode("utf-8")) > MAX_HTML_BYTES:
            raise StoreError(f"html is over {MAX_HTML_BYTES} bytes")
        vdir = d / "variants"
        if variant_id:
            meta = _read_json(self._vmeta_path(pid, variant_id))
            if meta["round"] != round_id:
                raise StoreError("variant belongs to another round")
        else:
            meta = {"id": _new_id("v"), "round": round_id, "createdAt": _now()}
        meta.update({
            "title": (title or "").strip()[:120] or meta.get("title") or "Untitled variant",
            "stage": stage,
            "updatedAt": _now(),
        })
        if rationale:
            meta["rationale"] = rationale[:2000]
        if notes:
            meta["notes"] = notes[:4000]
        vdir.mkdir(parents=True, exist_ok=True)
        (vdir / f"{meta['id']}.html").write_text(html, encoding="utf-8")
        png = vdir / f"{meta['id']}.png"
        if png.exists():
            png.unlink()  # stale once the markup changes
        _write_json(vdir / f"{meta['id']}.json", meta)
        return meta

    def list_variants(self, pid: str) -> list[dict[str, Any]]:
        vdir = self._pdir(pid) / "variants"
        if not vdir.is_dir():
            return []
        out = []
        for f in vdir.glob("*.json"):
            m = _read_json(f)
            m["hasPng"] = (vdir / f"{m['id']}.png").is_file()
            m["hasExport"] = (self.projects_dir / pid / "exports" / f"{m['id']}.tsx").is_file()
            out.append(m)
        return sorted(out, key=lambda m: m["createdAt"])

    def get_variant(self, pid: str, vid: str) -> dict[str, Any]:
        meta = _read_json(self._vmeta_path(pid, vid))
        meta["html"] = (self._pdir(pid) / "variants" / f"{vid}.html").read_text(encoding="utf-8")
        return meta

    def png_path(self, pid: str, vid: str) -> Path:
        self._vmeta_path(pid, vid)
        return self._pdir(pid) / "variants" / f"{vid}.png"

    # -------------------------------------------------------------- exports
    def save_export(self, pid: str, vid: str, code: str) -> dict[str, Any]:
        self._vmeta_path(pid, vid)
        if not isinstance(code, str) or not code.strip():
            raise StoreError("code is required")
        if len(code.encode("utf-8")) > MAX_EXPORT_BYTES:
            raise StoreError(f"code is over {MAX_EXPORT_BYTES} bytes")
        path = self._pdir(pid) / "exports" / f"{vid}.tsx"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(code, encoding="utf-8")
        return {"variant": vid, "bytes": len(code.encode("utf-8"))}

    def get_export(self, pid: str, vid: str) -> str | None:
        self._vmeta_path(pid, vid)
        path = self._pdir(pid) / "exports" / f"{vid}.tsx"
        return path.read_text(encoding="utf-8") if path.is_file() else None


def _round_status(rnd: dict[str, Any], variants: list[dict[str, Any]]) -> str:
    if len(variants) < rnd["count"]:
        return "designing"
    if any(v["stage"] != "reviewed" for v in variants):
        return "reviewing"
    return "ready"
