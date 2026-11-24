"""Motor de backtest barra a barra.

Ciclo por barra i:
  1. Se ejecuta la orden pendiente (de la señal de la barra i-1) a la apertura de i.
  2. Se valoriza la cuenta al cierre de i.
  3. La estrategia ve la barra i cerrada y puede emitir una señal para la barra i+1.

La Fase 2 agrega stops intrabarra, cierre obligatorio a las 15:55, reglas de riesgo y
simulación de apalancamiento con liquidación.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from ..strategies.base import BarContext, Signal, Strategy
from .costs import CostModel

_EPS = 1e-12


@dataclass
class BacktestResult:
    strategy: str
    equity: pd.Series            # valor de la cuenta al cierre de cada barra
    position: pd.Series          # acciones al cierre de cada barra
    fills: pd.DataFrame
    trades: pd.DataFrame
    initial_capital: float
    meta: dict = field(default_factory=dict)

    @property
    def total_return(self) -> float:
        return float(self.equity.iloc[-1] / self.initial_capital - 1.0)

    @property
    def total_costs(self) -> float:
        if self.fills.empty:
            return 0.0
        return float(self.fills["commission"].sum() + self.fills["slippage_cost"].sum())


class BacktestEngine:
    def __init__(self, initial_capital: float = 100_000.0, costs: CostModel | None = None,
                 fractional_shares: bool = True):
        self.initial_capital = float(initial_capital)
        self.costs = costs or CostModel.zero()
        self.fractional = fractional_shares

    @classmethod
    def from_config(cls, cfg: dict) -> "BacktestEngine":
        bt = cfg.get("backtest", {})
        return cls(bt.get("initial_capital", 100_000.0), CostModel.from_config(cfg),
                   bt.get("fractional_shares", True))

    # ------------------------------------------------------------------ ejecución
    def _target_qty(self, signal: Signal, strategy: Strategy, equity: float, ref_price: float) -> float:
        if signal.target == 0:
            return 0.0
        if strategy.sizing != "full_equity":
            raise NotImplementedError(f"sizing={strategy.sizing!r} llega en la Fase 2")
        fill = self.costs.fill_price(ref_price, signal.target)
        qty = equity / (fill + self.costs.commission_per_share)
        if self.costs.commission_min > qty * self.costs.commission_per_share:
            qty = max(equity - self.costs.commission_min, 0.0) / fill
        if not self.fractional:
            qty = math.floor(qty + _EPS)
        return signal.target * qty

    def run(self, bars: pd.DataFrame, strategy: Strategy) -> BacktestResult:
        if bars.empty:
            raise ValueError("No hay barras para el backtest")
        if not bars.index.is_monotonic_increasing:
            raise ValueError("Las barras deben venir ordenadas en el tiempo")
        strategy.prepare(bars)
        o = bars["open"].to_numpy(dtype=float)
        c = bars["close"].to_numpy(dtype=float)
        idx = bars.index
        n = len(bars)

        cash, qty = self.initial_capital, 0.0
        equity = np.empty(n)
        pos = np.empty(n)
        fills: list[dict] = []
        pending = strategy.on_start()

        for i in range(n):
            if pending is not None:
                eq_open = cash + qty * o[i]
                target = self._target_qty(pending, strategy, eq_open, o[i])
                delta = target - qty
                if abs(delta) > 1e-9:
                    price = self.costs.fill_price(o[i], delta)
                    comm = self.costs.commission(delta)
                    cash -= delta * price + comm
                    qty = target
                    fills.append({
                        "timestamp": idx[i], "side": "buy" if delta > 0 else "sell",
                        "qty": abs(delta), "price": price, "ref_price": o[i],
                        "commission": comm, "slippage_cost": abs(delta) * abs(price - o[i]),
                        "position_after": qty, "tag": pending.tag,
                    })
                pending = None

            equity[i] = cash + qty * c[i]
            pos[i] = qty
            ctx = BarContext(timestamp=idx[i], position=qty, equity=equity[i], cash=cash)
            signal = strategy.on_bar(i, ctx)
            if signal is not None and i < n - 1:
                pending = signal

        fills_df = pd.DataFrame(fills, columns=[
            "timestamp", "side", "qty", "price", "ref_price", "commission",
            "slippage_cost", "position_after", "tag"])
        return BacktestResult(
            strategy=strategy.name,
            equity=pd.Series(equity, index=idx, name="equity"),
            position=pd.Series(pos, index=idx, name="position"),
            fills=fills_df,
            trades=build_trades(fills_df, last_price=c[-1], last_ts=idx[-1]),
            initial_capital=self.initial_capital,
        )


def build_trades(fills: pd.DataFrame, last_price: float, last_ts) -> pd.DataFrame:
    """Agrupa ejecuciones en operaciones completas (de plano a plano).

    Una operación que sigue abierta al final se valoriza al último cierre con open=True.
    """
    cols = ["entry_time", "exit_time", "side", "qty", "entry_price", "exit_price",
            "pnl", "costs", "return_pct", "open"]
    trades: list[dict] = []
    cur = None
    for f in fills.itertuples(index=False):
        signed = f.qty if f.side == "buy" else -f.qty
        before = f.position_after - signed
        cost = f.commission + f.slippage_cost
        if abs(before) < 1e-9:
            cur = {"entry_time": f.timestamp, "side": "long" if signed > 0 else "short",
                   "qty": abs(signed), "cash": -signed * f.price - f.commission, "costs": cost,
                   "entry_value": abs(signed) * f.price}
        else:
            # Flujo de caja de esta ejecución
            cur["cash"] += -signed * f.price - f.commission
            cur["costs"] += cost
            if np.sign(f.position_after) == np.sign(before) and abs(f.position_after) > abs(before):
                cur["qty"] += abs(signed)
                cur["entry_value"] += abs(signed) * f.price
        if cur is not None and (abs(f.position_after) < 1e-9 or np.sign(f.position_after) != np.sign(before)) \
                and abs(before) > 1e-9:
            # Cierre (o volteo): si hay volteo, la parte nueva abre otra operación.
            flip = abs(f.position_after) > 1e-9
            if flip:
                cur["cash"] -= -f.position_after * f.price  # quitar la parte que abre lo nuevo
            trades.append(_close_trade(cur, f.timestamp, f.price, False))
            cur = None
            if flip:
                cur = {"entry_time": f.timestamp, "side": "long" if f.position_after > 0 else "short",
                       "qty": abs(f.position_after), "cash": -f.position_after * f.price,
                       "costs": 0.0, "entry_value": abs(f.position_after) * f.price}
    if cur is not None:
        signed_open = cur["qty"] if cur["side"] == "long" else -cur["qty"]
        cur["cash"] += signed_open * last_price
        trades.append(_close_trade(cur, last_ts, last_price, True))
    return pd.DataFrame(trades, columns=cols)


def _close_trade(cur: dict, ts, price: float, is_open: bool) -> dict:
    pnl = cur["cash"]
    return {
        "entry_time": cur["entry_time"], "exit_time": ts, "side": cur["side"], "qty": cur["qty"],
        "entry_price": cur["entry_value"] / cur["qty"], "exit_price": price, "pnl": pnl,
        "costs": cur["costs"], "return_pct": pnl / cur["entry_value"] * 100, "open": is_open,
    }
