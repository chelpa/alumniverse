"""Control de calidad de datos intradía: barras por día, días incompletos, huecos."""
from __future__ import annotations

import pandas as pd

from .timeframes import parse_timeframe


def bars_per_day(df: pd.DataFrame) -> pd.Series:
    return df.groupby(df.index.date).size().rename("bars")


def quality_report(df: pd.DataFrame, timeframe: str, session_minutes: int = 390) -> dict:
    """Resumen para barras de sesión regular. Días cortos (medias jornadas) aparecen como incompletos."""
    tf = parse_timeframe(timeframe)
    if df.empty:
        return {"timeframe": str(tf), "days": 0}
    expected = session_minutes // tf.minutes
    per_day = bars_per_day(df)
    incomplete = per_day[per_day < expected]
    return {
        "timeframe": str(tf),
        "first_bar": df.index[0].isoformat(),
        "last_bar": df.index[-1].isoformat(),
        "days": int(len(per_day)),
        "bars": int(len(df)),
        "expected_bars_per_day": int(expected),
        "mean_bars_per_day": round(float(per_day.mean()), 2),
        "pct_bars_missing": round(float(1 - len(df) / (expected * len(per_day))) * 100, 3),
        "incomplete_days": int(len(incomplete)),
        "worst_days": {str(k): int(v) for k, v in incomplete.nsmallest(5).items()},
        "mean_daily_volume": float(df["volume"].groupby(df.index.date).sum().mean()),
    }
