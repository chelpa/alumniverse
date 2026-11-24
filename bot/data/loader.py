"""Punto de entrada de datos: fuente + caché + filtro de sesión."""
from __future__ import annotations

from datetime import date

import pandas as pd

from .cache import BarCache
from .session import filter_regular_session
from .sources import AlpacaSource, BarSource, SyntheticSource
from .timeframes import parse_timeframe


def make_source(cfg: dict, feed: str | None = None) -> BarSource:
    data = cfg["data"]
    kind = data.get("source", "alpaca")
    if kind == "alpaca":
        return AlpacaSource(feed=feed or data.get("feed", "iex"))
    if kind == "synthetic":
        return SyntheticSource(seed=int(data.get("synthetic_seed", 42)))
    raise ValueError(f"Fuente desconocida: {kind}")


def _as_date(v) -> date | None:
    if v is None or isinstance(v, date):
        return v
    return date.fromisoformat(str(v))


def load_bars(cfg: dict, timeframe: str, start=None, end=None, adjustment: str | None = None,
              source: BarSource | None = None, cache: BarCache | None = None,
              refresh: bool = False, regular_session: bool = True) -> pd.DataFrame:
    """Barras listas para backtest. Las intradía se filtran a la sesión regular."""
    data = cfg["data"]
    source = source or make_source(cfg)
    cache = cache or BarCache(data.get("cache_dir", ".cache/bars"))
    bars = cache.get(
        source, data["symbol"], timeframe,
        start=_as_date(start or data["start"]), end=_as_date(end or data.get("end")),
        adjustment=adjustment or data.get("adjustment", "all"), refresh=refresh,
    )
    if parse_timeframe(timeframe).is_intraday and regular_session:
        s = cfg.get("session", {})
        bars = filter_regular_session(bars, s.get("open", "09:30"), s.get("close", "16:00"))
    return bars
