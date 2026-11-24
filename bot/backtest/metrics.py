"""Métricas de desempeño. La Fase 3 las usa en el reporte comparativo."""
from __future__ import annotations

import numpy as np
import pandas as pd

TRADING_DAYS = 252


def daily_equity(equity: pd.Series, initial_capital: float) -> pd.Series:
    """Capital al cierre de cada día, con el capital inicial como punto de partida."""
    daily = equity.groupby(equity.index.date).last()
    daily.index = pd.to_datetime(daily.index)
    start = pd.Series([initial_capital], index=[daily.index[0] - pd.Timedelta(days=1)])
    return pd.concat([start, daily])


def max_drawdown(curve: pd.Series) -> float:
    """Máxima caída desde un máximo previo, como fracción negativa (p. ej. -0.35)."""
    peak = curve.cummax()
    return float((curve / peak - 1.0).min())


def drawdown_series(curve: pd.Series) -> pd.Series:
    return curve / curve.cummax() - 1.0


def compute_metrics(result, risk_free: float = 0.0) -> dict:
    eq_d = daily_equity(result.equity, result.initial_capital)
    rets = eq_d.pct_change().dropna()
    total = float(eq_d.iloc[-1] / eq_d.iloc[0] - 1.0)
    years = len(rets) / TRADING_DAYS
    cagr = float((1 + total) ** (1 / years) - 1) if years > 0 and total > -1 else float("nan")
    vol = float(rets.std(ddof=1) * np.sqrt(TRADING_DAYS)) if len(rets) > 1 else float("nan")
    excess = rets - risk_free / TRADING_DAYS
    sharpe = float(excess.mean() / rets.std(ddof=1) * np.sqrt(TRADING_DAYS)) \
        if len(rets) > 1 and rets.std(ddof=1) > 0 else float("nan")
    trades = result.trades
    closed = trades[~trades["open"]] if not trades.empty else trades
    gains = closed.loc[closed["pnl"] > 0, "pnl"].sum() if not closed.empty else 0.0
    losses = -closed.loc[closed["pnl"] < 0, "pnl"].sum() if not closed.empty else 0.0
    return {
        "strategy": result.strategy,
        "start": str(eq_d.index[1].date()),
        "end": str(eq_d.index[-1].date()),
        "days": int(len(rets)),
        "total_return": total,
        "cagr": cagr,
        "volatility": vol,
        "sharpe": sharpe,
        "max_drawdown": max_drawdown(eq_d),
        "worst_day": float(rets.min()) if len(rets) else float("nan"),
        "best_day": float(rets.max()) if len(rets) else float("nan"),
        "pct_winning_days": float((rets > 0).mean()) if len(rets) else float("nan"),
        "profit_factor": float(gains / losses) if losses > 0 else float("nan"),
        "n_trades": int(len(trades)),
        "total_costs": result.total_costs,
        "time_in_market": float((result.position.abs() > 1e-9).mean()),
        "final_equity": float(eq_d.iloc[-1]),
    }
