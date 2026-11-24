"""Criterio de aceptación de la Fase 1 con datos reales de Alpaca.

Se salta si no hay claves (ALPACA_API_KEY/ALPACA_SECRET_KEY en el entorno o .env).
Correr con:  pytest -m alpaca
"""
import os

import pytest

from bot.backtest.validation import check_benchmark
from bot.config import load_config
from bot.data.loader import load_bars

pytestmark = pytest.mark.alpaca


def _has_keys():
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:
        pass
    return bool(os.getenv("ALPACA_API_KEY") or os.getenv("APCA_API_KEY_ID"))


@pytest.mark.skipif(not _has_keys(), reason="sin claves de Alpaca")
def test_phase1_acceptance_real_data():
    cfg = load_config(overrides={"data": {"source": "alpaca"}})
    daily = load_bars(cfg, "1Day")
    minute = load_bars(cfg, "1Min")
    out = check_benchmark(cfg, daily, minute)
    assert out["daily"]["passed"], out
    assert out["intraday"]["passed"], out
