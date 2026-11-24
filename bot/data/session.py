"""Utilidades de sesión y zona horaria (America/New_York)."""
from __future__ import annotations

from datetime import date, datetime, time, timedelta

import pandas as pd

NY = "America/New_York"


def parse_hhmm(value: str | time) -> time:
    if isinstance(value, time):
        return value
    hh, mm = value.split(":")
    return time(int(hh), int(mm))


def to_ny(index: pd.DatetimeIndex) -> pd.DatetimeIndex:
    """Convierte un índice a America/New_York. Un índice sin zona se asume UTC."""
    if index.tz is None:
        index = index.tz_localize("UTC")
    return index.tz_convert(NY)


def filter_regular_session(df: pd.DataFrame, open_: str | time = "09:30",
                           close: str | time = "16:00") -> pd.DataFrame:
    """Deja solo barras cuya hora de inicio está en [apertura, cierre).

    Alpaca etiqueta cada barra con su hora de inicio: la barra 15:59 de 1 minuto
    cubre 15:59-16:00 y es la última de la sesión.
    """
    if df.empty:
        return df
    t = df.index.time
    o, c = parse_hhmm(open_), parse_hhmm(close)
    mask = (t >= o) & (t < c)
    return df.loc[mask]


def trading_dates(index: pd.DatetimeIndex) -> pd.Index:
    """Fecha de sesión (NY) de cada barra."""
    return pd.Index(to_ny(index).date, name="date")


def ny_midnight(d: date) -> pd.Timestamp:
    return pd.Timestamp(datetime.combine(d, time(0, 0))).tz_localize(NY)


def last_completed_session_date(now: pd.Timestamp | None = None) -> date:
    """Último día cuya sesión regular ya cerró (no considera feriados)."""
    now = (now or pd.Timestamp.now(tz=NY)).tz_convert(NY)
    d = now.date()
    if now.time() < time(16, 20):
        d -= timedelta(days=1)
    while d.weekday() >= 5:
        d -= timedelta(days=1)
    return d
