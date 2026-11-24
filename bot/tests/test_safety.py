"""Salvaguardas: el proyecto nunca debe poder operar dinero real."""
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FORBIDDEN = [
    (re.compile(r"paper\s*=\s*False"), "TradingClient con paper=False"),
    (re.compile(r"(?<![\w-])api\.alpaca\.markets"), "endpoint de trading real de Alpaca"),
    (re.compile(r"ALPACA_PAPER\s*=\s*['\"]?false", re.I), "desactivar modo paper"),
]


def _sources():
    return [p for p in ROOT.rglob("*.py") if p.resolve() != Path(__file__).resolve()]


def test_no_live_trading_in_source():
    hits = []
    for p in _sources():
        text = p.read_text(encoding="utf-8")
        for rx, why in FORBIDDEN:
            if rx.search(text):
                hits.append(f"{p.relative_to(ROOT)}: {why}")
    assert not hits, hits


def test_env_is_gitignored():
    gi = (ROOT.parent / ".gitignore").read_text()
    assert re.search(r"^\.env$", gi, re.M)
