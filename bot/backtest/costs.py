"""Modelo de costos: spread + deslizamiento en pb por lado y comisión por acción."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CostModel:
    slippage_bps: float = 0.0          # por lado
    commission_per_share: float = 0.0
    commission_min: float = 0.0

    @classmethod
    def from_config(cls, cfg: dict) -> "CostModel":
        c = cfg.get("costs", {}) or {}
        return cls(float(c.get("slippage_bps", 0.0)), float(c.get("commission_per_share", 0.0)),
                   float(c.get("commission_min", 0.0)))

    @classmethod
    def zero(cls) -> "CostModel":
        return cls()

    def fill_price(self, reference_price: float, qty_delta: float) -> float:
        """Compra más cara y vende más barato que la referencia."""
        sign = 1.0 if qty_delta > 0 else -1.0
        return reference_price * (1.0 + sign * self.slippage_bps / 1e4)

    def commission(self, qty_delta: float) -> float:
        if qty_delta == 0:
            return 0.0
        return max(abs(qty_delta) * self.commission_per_share, self.commission_min)
