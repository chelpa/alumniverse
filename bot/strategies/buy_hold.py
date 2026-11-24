"""E0 · Benchmark: comprar y mantener.

Decide comprar antes de la primera barra (no usa ningún precio), por lo que la compra
se ejecuta en la apertura del primer día. Nunca vende.
"""
from __future__ import annotations

from .base import BarContext, Signal, Strategy


class BuyAndHold(Strategy):
    name = "E0_buy_hold"
    sizing = "full_equity"

    def on_start(self) -> Signal:
        return Signal(target=1, tag="buy_and_hold")

    def on_bar(self, i: int, ctx: BarContext) -> Signal | None:
        return None
