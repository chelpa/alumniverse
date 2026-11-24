from datetime import date

import pandas as pd
import pytest

from bot.config import load_config
from bot.data.session import NY
from bot.data.sources import SyntheticSource


class CountingSource:
    """Envuelve una fuente y cuenta las descargas."""

    def __init__(self, inner):
        self.inner = inner
        self.name = inner.name
        self.feed = inner.feed
        self.calls: list[tuple] = []

    def get_bars(self, symbol, timeframe, start, end, adjustment="all"):
        self.calls.append((str(timeframe), start, end, adjustment))
        return self.inner.get_bars(symbol, timeframe, start, end, adjustment)


@pytest.fixture
def synthetic():
    return SyntheticSource(seed=7)


@pytest.fixture
def cfg(tmp_path):
    return load_config(overrides={"data": {"source": "synthetic", "cache_dir": str(tmp_path / "cache"),
                                           "start": "2022-01-03", "end": "2022-03-31"}})


def make_bars(opens, closes=None, start="2024-01-02 09:30", freq="1min") -> pd.DataFrame:
    """Barras a mano: high/low envuelven open/close."""
    closes = closes if closes is not None else opens
    idx = pd.date_range(start, periods=len(opens), freq=freq, tz=NY, name="timestamp")
    df = pd.DataFrame({"open": opens, "close": closes}, index=idx, dtype=float)
    df["high"] = df[["open", "close"]].max(axis=1)
    df["low"] = df[["open", "close"]].min(axis=1)
    df["volume"] = 1000.0
    df["vwap"] = (df["open"] + df["close"]) / 2
    df["trade_count"] = 10.0
    return df[["open", "high", "low", "close", "volume", "vwap", "trade_count"]]


D = date
