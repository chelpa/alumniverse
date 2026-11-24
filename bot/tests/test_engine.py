import math

import numpy as np
import pytest

from bot.backtest.costs import CostModel
from bot.backtest.engine import BacktestEngine
from bot.strategies.base import Signal, Strategy

from .conftest import make_bars


class Scripted(Strategy):
    """Emite señales predefinidas por índice de barra y registra lo que vio."""
    name = "scripted"

    def __init__(self, plan, start=None):
        super().__init__()
        self.plan, self.start, self.seen = plan, start, []

    def on_start(self):
        return self.start

    def on_bar(self, i, ctx):
        self.seen.append((i, ctx.timestamp, ctx.position))
        return self.plan.get(i)


def test_signal_executes_at_next_bar_open():
    bars = make_bars(opens=[10, 11, 12, 13], closes=[10.5, 11.5, 12.5, 13.5])
    strat = Scripted({1: Signal(1)})
    res = BacktestEngine(1000).run(bars, strat)
    f = res.fills.iloc[0]
    assert f.timestamp == bars.index[2]       # señal al cierre de la barra 1 → apertura de la 2
    assert f.price == 12
    assert res.position.iloc[1] == 0 and res.position.iloc[2] == pytest.approx(1000 / 12)
    # La estrategia ve cada barra una vez, en orden, con la posición vigente
    assert [s[0] for s in strat.seen] == [0, 1, 2, 3]
    assert strat.seen[1][1] == bars.index[1]


def test_signal_on_last_bar_is_ignored():
    bars = make_bars([10, 11, 12])
    res = BacktestEngine(1000).run(bars, Scripted({2: Signal(1)}))
    assert res.fills.empty
    assert res.equity.iloc[-1] == 1000


def test_equity_marked_at_close_and_round_trip_pnl():
    bars = make_bars(opens=[10, 10, 12, 15], closes=[10, 11, 14, 15])
    res = BacktestEngine(1000).run(bars, Scripted({0: Signal(1), 2: Signal(0)}))
    q = 1000 / 10
    assert res.equity.iloc[1] == pytest.approx(q * 11)
    assert res.equity.iloc[2] == pytest.approx(q * 14)
    assert res.equity.iloc[3] == pytest.approx(q * 15)   # vendió en la apertura de la barra 3
    t = res.trades.iloc[0]
    assert t.side == "long" and not t.open
    assert t.pnl == pytest.approx(q * 5)
    assert t.return_pct == pytest.approx(50)


def test_short_and_flip():
    bars = make_bars(opens=[100, 100, 90, 95, 95], closes=[100, 100, 90, 95, 95])
    res = BacktestEngine(1000).run(bars, Scripted({0: Signal(-1), 2: Signal(1)}))
    trades = res.trades
    assert list(trades.side) == ["short", "long"]
    assert trades.iloc[0].pnl == pytest.approx(10 * 5)           # 10 acciones cortas de 100 a 95
    assert res.equity.iloc[-1] == pytest.approx(1050)
    assert trades.iloc[1].open


def test_costs_slippage_and_commission():
    bars = make_bars(opens=[100, 100, 100, 100], closes=[100, 100, 100, 100])
    costs = CostModel(slippage_bps=10, commission_per_share=0.01, commission_min=1.0)
    res = BacktestEngine(10_000, costs).run(bars, Scripted({0: Signal(1), 1: Signal(0)}))
    buy, sell = res.fills.iloc[0], res.fills.iloc[1]
    assert buy.price == pytest.approx(100.1) and sell.price == pytest.approx(99.9)
    assert buy.commission == pytest.approx(max(buy.qty * 0.01, 1.0))
    expected = 10_000 - buy.qty * 0.2 - buy.commission - sell.commission
    assert res.equity.iloc[-1] == pytest.approx(expected)
    assert res.total_costs == pytest.approx(10_000 - expected)
    assert res.trades.iloc[0].costs == pytest.approx(res.total_costs)
    # Nunca se compra más de lo que alcanza el capital
    assert buy.qty * buy.price + buy.commission <= 10_000 + 1e-6


def test_integer_shares():
    bars = make_bars([33.0, 33.0])
    res = BacktestEngine(1000, fractional_shares=False).run(bars, Scripted({}, start=Signal(1)))
    assert res.fills.iloc[0].qty == math.floor(1000 / 33)


def test_engine_rejects_unsorted_or_empty():
    bars = make_bars([1.0, 2.0])
    with pytest.raises(ValueError):
        BacktestEngine().run(bars.iloc[::-1], Scripted({}))
    with pytest.raises(ValueError):
        BacktestEngine().run(bars.iloc[:0], Scripted({}))


def test_strategy_cannot_change_past_results():
    """Cambiar barras futuras no altera la equity hasta la barra anterior al cambio."""
    rng = np.random.default_rng(0)
    p = 100 * np.exp(np.cumsum(rng.normal(0, 0.01, 200)))
    a = make_bars(p, p * 1.001)
    b = a.copy()
    b.iloc[150:, :4] *= 1.5
    plan = {i: Signal(1 if i % 20 < 10 else 0) for i in range(200)}
    ra = BacktestEngine(1000).run(a, Scripted(plan))
    rb = BacktestEngine(1000).run(b, Scripted(plan))
    np.testing.assert_allclose(ra.equity.iloc[:150], rb.equity.iloc[:150])
