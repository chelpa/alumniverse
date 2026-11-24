"""Caché local de barras en Parquet.

Un dataset = (fuente, feed, ajuste, símbolo, timeframe). Cada dataset guarda
`bars.parquet` y `manifest.json` con el rango de fechas cubierto.

Regla importante: los precios ajustados (`adjustment != raw`) cambian hacia atrás cada
vez que hay un nuevo dividendo o split. Por eso, si hay que ampliar un dataset ajustado,
se vuelve a descargar el rango completo en una sola consulta; mezclar descargas de
fechas distintas dejaría la serie inconsistente. Los datos sin ajustar sí se amplían
por partes. Solo se guardan días con la sesión ya cerrada.
"""
from __future__ import annotations

import json
from datetime import date, datetime, timezone
from pathlib import Path

import pandas as pd

from .session import NY, last_completed_session_date, ny_midnight
from .sources import BarSource, empty_bars
from .timeframes import parse_timeframe


class BarCache:
    def __init__(self, root: str | Path):
        self.root = Path(root)
        self.fetch_log: list[tuple] = []  # (timeframe, start, end) de cada descarga, útil en tests

    def dataset_dir(self, source: BarSource, symbol: str, timeframe: str, adjustment: str) -> Path:
        return self.root / source.name / source.feed / adjustment / symbol.upper() / str(timeframe)

    def _read(self, d: Path):
        mf = d / "manifest.json"
        if not mf.exists():
            return None, None
        manifest = json.loads(mf.read_text())
        bars = pd.read_parquet(d / "bars.parquet")
        bars.index = pd.DatetimeIndex(bars.index).tz_convert(NY)
        bars.index.name = "timestamp"
        return manifest, bars

    def _write(self, d: Path, bars: pd.DataFrame, start: date, end: date, source: BarSource) -> None:
        d.mkdir(parents=True, exist_ok=True)
        bars.to_parquet(d / "bars.parquet")
        manifest = {
            "start": start.isoformat(), "end": end.isoformat(), "rows": int(len(bars)),
            "source": source.name, "feed": source.feed,
            "fetched_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        }
        (d / "manifest.json").write_text(json.dumps(manifest, indent=2))

    def _fetch(self, source, symbol, tf, start, end, adjustment) -> pd.DataFrame:
        self.fetch_log.append((str(tf), start, end))
        return source.get_bars(symbol, tf, start, end, adjustment)

    def get(self, source: BarSource, symbol: str, timeframe: str, start: date, end: date | None = None,
            adjustment: str = "all", refresh: bool = False) -> pd.DataFrame:
        tf = parse_timeframe(timeframe)
        last_ok = last_completed_session_date()
        end = min(end or last_ok, last_ok)
        if start > end:
            raise ValueError(f"Rango vacío: start={start} > end={end}")
        d = self.dataset_dir(source, symbol, str(tf), adjustment)
        manifest, cached = (None, None) if refresh else self._read(d)

        if manifest is not None:
            c_start, c_end = date.fromisoformat(manifest["start"]), date.fromisoformat(manifest["end"])
            if c_start <= start and end <= c_end:
                return _slice(cached, start, end)
            new_start, new_end = min(start, c_start), max(end, c_end)
            if adjustment == "raw":
                parts = [cached]
                if start < c_start:
                    parts.append(self._fetch(source, symbol, tf, start, _prev(c_start), adjustment))
                if end > c_end:
                    parts.append(self._fetch(source, symbol, tf, _next(c_end), end, adjustment))
                bars = _merge(parts)
            else:
                bars = self._fetch(source, symbol, tf, new_start, new_end, adjustment)
            self._write(d, bars, new_start, new_end, source)
            return _slice(bars, start, end)

        bars = self._fetch(source, symbol, tf, start, end, adjustment)
        self._write(d, bars, start, end, source)
        return _slice(bars, start, end)


def _prev(d: date) -> date:
    return date.fromordinal(d.toordinal() - 1)


def _next(d: date) -> date:
    return date.fromordinal(d.toordinal() + 1)


def _merge(parts: list[pd.DataFrame]) -> pd.DataFrame:
    parts = [p for p in parts if p is not None and not p.empty]
    if not parts:
        return empty_bars()
    df = pd.concat(parts).sort_index()
    return df[~df.index.duplicated(keep="last")]


def _slice(df: pd.DataFrame, start: date, end: date) -> pd.DataFrame:
    lo, hi = ny_midnight(start), ny_midnight(_next(end))
    return df.loc[(df.index >= lo) & (df.index < hi)].copy()
