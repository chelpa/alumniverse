"""Datos de reproducibilidad que acompañan cada resultado."""
from __future__ import annotations

import json
import shlex
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml


def git_commit() -> str:
    try:
        sha = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True, stderr=subprocess.DEVNULL).strip()
        dirty = subprocess.call(["git", "diff", "--quiet"], stderr=subprocess.DEVNULL) != 0
        return sha + ("-dirty" if dirty else "")
    except Exception:
        return "desconocido"


def write_run_info(out_dir: Path, cfg: dict, extra: dict | None = None, argv: list[str] | None = None) -> None:
    out_dir.mkdir(parents=True, exist_ok=True)
    (out_dir / "config_used.yaml").write_text(yaml.safe_dump(cfg, sort_keys=False, allow_unicode=True))
    info = {
        "command": "python -m bot " + " ".join(shlex.quote(a) for a in (sys.argv[1:] if argv is None else argv)),
        "git_commit": git_commit(),
        "python": sys.version.split()[0],
        "run_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        **(extra or {}),
    }
    (out_dir / "run.json").write_text(json.dumps(info, indent=2, ensure_ascii=False))
