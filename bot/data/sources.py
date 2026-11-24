"""Fuentes de barras OHLCV.

Toda fuente devuelve un DataFrame con índice DatetimeIndex en America/New_York
(hora de inicio de la barra) y columnas open, high, low, close, volume, vwap, trade_count.
"""
from __future__ import annotations

import os
from datetime import date, datetime, time, timedelta
from typing import Protocol

import numpy as np
import pandas as pd

from .session import NY, filter_regular_session, to_ny
from .timeframes import Timeframe, parse_timeframe

COLUMNS = ["open", "high", "low", "close", "volume", "vwap", "trade_count"]


def empty_bars() -> pd.DataFrame:
    idx = pd.DatetimeIndex([], tz=NY, name="timestamp")
    return pd.DataFrame({c: pd.Series(dtype="float64") for c in COLUMNS}, index=idx)


class BarSource(Protocol):
    name: str
    feed: str

    def get_bars(self, symbol: str, timeframe: Timeframe | str, start: date, end: date,
                 adjustment: str) -> pd.DataFrame:
        """Barras con inicio en [start 00:00 NY, end+1 00:00 NY)."""
        ...


# --------------------------------------------------------------------------- Alpaca

def load_alpaca_keys() -> tuple[str, str]:
    """Lee las claves desde el entorno o un archivo .env (nunca desde el código)."""
    try:
        from dotenv import load_dotenv
        load_dotenv()
    except ImportError:  # pragma: no cover
        pass
    key = os.getenv("ALPACA_API_KEY") or os.getenv("APCA_API_KEY_ID")
    secret = os.getenv("ALPACA_SECRET_KEY") or os.getenv("APCA_API_SECRET_KEY")
    if not key or not secret:
        raise RuntimeError(
            "Faltan ALPACA_API_KEY y ALPACA_SECRET_KEY. Copia .env.example a .env y "
            "completa con las claves de tu cuenta PAPER de Alpaca."
        )
    return key, secret


class AlpacaSource:
    """Datos históricos de Alpaca (solo lectura de datos de mercado; no envía órdenes)."""

    name = "alpaca"

    def __init__(self, feed: str = "iex", client=None):
        self.feed = feed
        if client is None:
            from alpaca.data.historical import StockHistoricalDataClient
            key, secret = load_alpaca_keys()
            client = StockHistoricalDataClient(key, secret)
        self._client = client

    @staticmethod
    def _alpaca_timeframe(tf: Timeframe):
        from alpaca.data.timeframe import TimeFrame, TimeFrameUnit
        unit = {"Min": TimeFrameUnit.Minute, "Hour": TimeFrameUnit.Hour, "Day": TimeFrameUnit.Day}[tf.unit]
        return TimeFrame(tf.amount, unit)

    def get_bars(self, symbol, timeframe, start, end, adjustment="all"):
        from alpaca.data.enums import Adjustment, DataFeed
        from alpaca.data.requests import StockBarsRequest

        tf = parse_timeframe(timeframe)
        start_dt = pd.Timestamp(datetime.combine(start, time(0))).tz_localize(NY)
        end_dt = pd.Timestamp(datetime.combine(end + timedelta(days=1), time(0))).tz_localize(NY)
        # El plan gratis no permite consultar SIP de los últimos 15 minutos.
        end_dt = min(end_dt, pd.Timestamp.now(tz=NY) - pd.Timedelta(minutes=16))
        if end_dt <= start_dt:
            return empty_bars()
        req = StockBarsRequest(
            symbol_or_symbols=symbol,
            timeframe=self._alpaca_timeframe(tf),
            start=start_dt.tz_convert("UTC").to_pydatetime(),
            end=end_dt.tz_convert("UTC").to_pydatetime(),
            adjustment=Adjustment(adjustment),
            feed=DataFeed(self.feed),
        )
        raw = self._client.get_stock_bars(req).df
        return normalize_alpaca_frame(raw, symbol)


def normalize_alpaca_frame(raw: pd.DataFrame, symbol: str) -> pd.DataFrame:
    """Convierte el DataFrame de alpaca-py (índice symbol, timestamp) al formato interno."""
    if raw is None or raw.empty:
        return empty_bars()
    df = raw
    if isinstance(df.index, pd.MultiIndex):
        df = df.xs(symbol, level="symbol")
    df = df.copy()
    df.index = to_ny(pd.DatetimeIndex(df.index))
    df.index.name = "timestamp"
    for c in COLUMNS:
        if c not in df.columns:
            df[c] = np.nan
    df = df[COLUMNS].astype("float64").sort_index()
    return df[~df.index.duplicated(keep="last")]


# --------------------------------------------------------------------- Sintética

class SyntheticSource:
    """Barras sintéticas deterministas (paseo aleatorio geométrico).

    La trayectoria completa se genera desde una fecha fija con una semilla fija, así
    cualquier rango pedido devuelve los mismos precios. Incluye algunas barras fuera
    de la sesión regular (como Alpaca) para ejercitar el filtro de sesión. Las barras
    diarias se agregan desde la sesión regular de 1 minuto.
    """

    name = "synthetic"
    EPOCH = date(2015, 1, 1)

    def __init__(self, seed: int = 42, start_price: float = 100.0, annual_drift: float = 0.12,
                 annual_vol: float = 0.22, feed: str = "synthetic"):
        self.seed = seed
        self.start_price = start_price
        self.mu = annual_drift
        self.sigma = annual_vol
        self.feed = feed
        self._cache: dict[date, pd.DataFrame] = {}

    def _minute_path(self, end: date) -> pd.DataFrame:
        if end in self._cache:
            return self._cache[end]
        days = pd.bdate_range(self.EPOCH, end)
        # 9:00-16:29: 30 minutos antes y después de la sesión regular.
        minutes = pd.timedelta_range(start="9h", periods=450, freq="1min")
        stamps = (pd.DatetimeIndex(np.repeat(days.values, len(minutes)))
                  + np.tile(minutes.values, len(days)))
        # Un generador independiente por serie: así el prefijo de la trayectoria no depende
        # de hasta qué fecha se genere.
        r_ret, r_gap, r_wig, r_vol = (np.random.default_rng(s)
                                      for s in np.random.SeedSequence(self.seed).spawn(4))
        n = len(stamps)
        dt = 1.0 / (252 * 390)
        rets = r_ret.normal((self.mu - 0.5 * self.sigma**2) * dt, self.sigma * np.sqrt(dt), n)
        # Salto de apertura: la variación nocturna aparece en la primera barra del día.
        gaps = r_gap.normal(0, self.sigma * np.sqrt(1 / 252) * 0.5, len(days))
        rets[:: len(minutes)] += gaps
        close = self.start_price * np.exp(np.cumsum(rets))
        open_ = np.concatenate([[self.start_price], close[:-1]])
        wiggle = np.abs(r_wig.normal(0, self.sigma * np.sqrt(dt) * 0.5, n))
        high = np.maximum(open_, close) * (1 + wiggle)
        low = np.minimum(open_, close) * (1 - wiggle)
        volume = r_vol.integers(1_000, 50_000, n).astype("float64")
        idx = pd.DatetimeIndex(stamps).tz_localize(NY)
        idx.name = "timestamp"
        df = pd.DataFrame({
            "open": open_, "high": high, "low": low, "close": close, "volume": volume,
            "vwap": (open_ + high + low + close) / 4, "trade_count": volume / 100,
        }, index=idx)
        self._cache = {end: df}
        return df

    def get_bars(self, symbol, timeframe, start, end, adjustment="all"):
        tf = parse_timeframe(timeframe)
        full = self._minute_path(end)
        lo = pd.Timestamp(datetime.combine(start, time(0))).tz_localize(NY)
        hi = pd.Timestamp(datetime.combine(end + timedelta(days=1), time(0))).tz_localize(NY)
        m = full.loc[(full.index >= lo) & (full.index < hi)]
        if tf.unit == "Min" and tf.amount == 1:
            return m.copy()
        if tf.unit == "Day":
            reg = filter_regular_session(m)
            return aggregate(reg, reg.index.normalize())
        return aggregate(m, m.index.floor(tf.pandas_freq))


def aggregate(df: pd.DataFrame, keys) -> pd.DataFrame:
    """Agrega barras OHLCV por la clave dada (p. ej. día o bloque de 5 minutos)."""
    if df.empty:
        return empty_bars()
    g = df.groupby(keys)
    pv = (df["vwap"] * df["volume"]).groupby(keys).sum()
    out = pd.DataFrame({
        "open": g["open"].first(), "high": g["high"].max(), "low": g["low"].min(),
        "close": g["close"].last(), "volume": g["volume"].sum(),
        "trade_count": g["trade_count"].sum(),
    })
    out["vwap"] = pv / out["volume"]
    out.index.name = "timestamp"
    return out[COLUMNS]
