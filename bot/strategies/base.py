"""Interfaz común de estrategias.

Regla anti mirar-al-futuro: el motor llama `on_bar(i, ctx)` cuando la barra `i` ya
cerró, y la señal se ejecuta en la apertura de la barra `i + 1`. Una estrategia solo
puede leer datos con índice <= i. `prepare` puede precalcular indicadores sobre toda
la serie, pero solo con operaciones causales (rolling, cumsum, shift positivos).
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field

import numpy as np
import pandas as pd


@dataclass(frozen=True)
class Signal:
    target: int                     # +1 largo, -1 corto, 0 sin posición
    stop: float | None = None       # se usa desde la Fase 2
    take_profit: float | None = None
    tag: str = ""

    def __post_init__(self):
        if self.target not in (-1, 0, 1):
            raise ValueError("target debe ser -1, 0 o 1")


@dataclass
class BarContext:
    """Estado visible para la estrategia al cierre de la barra i."""
    timestamp: pd.Timestamp
    position: float                 # acciones (negativo = corto)
    equity: float
    cash: float
    extra: dict = field(default_factory=dict)


class Strategy(ABC):
    name: str = "base"
    sizing: str = "full_equity"     # full_equity | risk (Fase 2)

    def __init__(self, **params):
        self.params = params
        self.bars: pd.DataFrame | None = None
        self.o = self.h = self.l = self.c = np.empty(0)

    def prepare(self, bars: pd.DataFrame) -> None:
        """Guarda arreglos numpy de la serie. Las subclases agregan indicadores causales."""
        self.bars = bars
        self.o, self.h, self.l, self.c = (bars[k].to_numpy() for k in ("open", "high", "low", "close"))

    def on_start(self) -> Signal | None:
        """Decisión antes de ver cualquier barra (se ejecuta en la apertura de la primera)."""
        return None

    @abstractmethod
    def on_bar(self, i: int, ctx: BarContext) -> Signal | None:
        ...
