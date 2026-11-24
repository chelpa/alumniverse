"""Criterio de aceptación de la Fase 1.

Chequeo principal: el retorno de E0 calculado por el motor (barras diarias ajustadas,
sin costos, acciones fraccionarias) coincide con el retorno de la fuente,
cierre_ajustado_final / apertura_ajustada_inicial - 1, dentro de `daily_tolerance`.

Chequeo cruzado: E0 corrido sobre barras de 1 minuto de sesión regular contra la misma
referencia diaria, dentro de `intraday_tolerance`. La diferencia aquí mide cuánto se
alejan el feed intradía y las barras diarias (p. ej. IEX vs. precios oficiales).
"""
from __future__ import annotations

import pandas as pd

from ..strategies.buy_hold import BuyAndHold
from .costs import CostModel
from .engine import BacktestEngine, BacktestResult


def reference_buy_hold_return(daily: pd.DataFrame) -> float:
    return float(daily["close"].iloc[-1] / daily["open"].iloc[0] - 1.0)


def growth_gap(r_a: float, r_b: float) -> float:
    """Diferencia relativa entre factores de crecimiento (1+r)."""
    return abs((1 + r_a) / (1 + r_b) - 1.0)


def run_e0(bars: pd.DataFrame, initial_capital: float, costs: CostModel | None = None,
           fractional: bool = True) -> BacktestResult:
    engine = BacktestEngine(initial_capital, costs or CostModel.zero(), fractional)
    return engine.run(bars, BuyAndHold())


def check_benchmark(cfg: dict, daily: pd.DataFrame, minute: pd.DataFrame | None = None) -> dict:
    acc = cfg.get("acceptance", {})
    capital = float(cfg["backtest"]["initial_capital"])
    tol_d = float(acc.get("daily_tolerance", 1e-4))
    tol_i = float(acc.get("intraday_tolerance", 5e-3))

    ref = reference_buy_hold_return(daily)
    e0 = run_e0(daily, capital)
    gap = growth_gap(e0.total_return, ref)
    out = {
        "period": {"start": str(daily.index[0].date()), "end": str(daily.index[-1].date()),
                   "days": int(len(daily))},
        "reference_return": ref,
        "daily": {"engine_return": e0.total_return, "gap": gap, "tolerance": tol_d,
                  "passed": gap <= tol_d},
    }
    # Informativo: E0 con los costos y el tipo de acciones de la configuración.
    e0_cfg = run_e0(daily, capital, CostModel.from_config(cfg),
                    bool(cfg["backtest"].get("fractional_shares", True)))
    out["daily_with_config_costs"] = {"engine_return": e0_cfg.total_return,
                                      "costs_paid": e0_cfg.total_costs}
    if minute is not None and not minute.empty:
        m = minute.loc[(minute.index.date >= daily.index[0].date())
                       & (minute.index.date <= daily.index[-1].date())]
        e0m = run_e0(m, capital)
        gap_m = growth_gap(e0m.total_return, ref)
        out["intraday"] = {
            "engine_return": e0m.total_return, "gap": gap_m, "tolerance": tol_i,
            "passed": gap_m <= tol_i,
            "first_open_minute": float(m["open"].iloc[0]), "first_open_daily": float(daily["open"].iloc[0]),
            "last_close_minute": float(m["close"].iloc[-1]), "last_close_daily": float(daily["close"].iloc[-1]),
        }
    out["passed"] = out["daily"]["passed"] and out.get("intraday", {}).get("passed", True)
    return out
