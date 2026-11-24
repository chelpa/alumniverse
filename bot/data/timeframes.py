"""Timeframes soportados: 1Min, 5Min, 15Min, 1Hour, 1Day."""
from __future__ import annotations

import re
from dataclasses import dataclass

_RE = re.compile(r"^(\d+)(Min|Hour|Day)$")


@dataclass(frozen=True)
class Timeframe:
    amount: int
    unit: str  # Min | Hour | Day

    @property
    def is_intraday(self) -> bool:
        return self.unit != "Day"

    @property
    def minutes(self) -> int:
        return self.amount * {"Min": 1, "Hour": 60, "Day": 390}[self.unit]

    @property
    def pandas_freq(self) -> str:
        return {"Min": f"{self.amount}min", "Hour": f"{self.amount}h", "Day": f"{self.amount}D"}[self.unit]

    def __str__(self) -> str:
        return f"{self.amount}{self.unit}"


def parse_timeframe(value: str | Timeframe) -> Timeframe:
    if isinstance(value, Timeframe):
        return value
    m = _RE.match(value)
    if not m:
        raise ValueError(f"Timeframe no soportado: {value!r}. Usar 1Min, 5Min, 15Min, 1Hour o 1Day.")
    return Timeframe(int(m.group(1)), m.group(2))
