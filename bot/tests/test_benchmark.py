import json

import pandas as pd
import pytest

from bot.backtest.costs import CostModel
from bot.backtest.metrics import compute_metrics, daily_equity, max_drawdown
from bot.backtest.validation import check_benchmark, reference_buy_hold_return, run_e0
from bot.cli import main
from bot.data.loader import load_bars

from .conftest import make_bars


def test_e0_buys_first_open_and_never_sells(cfg):
    daily = load_bars(cfg, "1Day")
    res = run_e0(daily, 100_000)
    assert len(res.fills) == 1
    assert res.fills.iloc[0].timestamp == daily.index[0]
    assert res.fills.iloc[0].price == daily["open"].iloc[0]
    assert (res.position > 0).all()
    assert res.trades.iloc[0].open


def test_e0_matches_source_return_exactly(cfg):
    daily = load_bars(cfg, "1Day")
    res = run_e0(daily, 100_000)
    assert res.total_return == pytest.approx(reference_buy_hold_return(daily), abs=1e-12)


def test_e0_costs_reduce_return_by_one_side(cfg):
    daily = load_bars(cfg, "1Day")
    ref = reference_buy_hold_return(daily)
    res = run_e0(daily, 100_000, CostModel(slippage_bps=5))
    assert res.total_return == pytest.approx((1 + ref) / 1.0005 - 1, rel=1e-9)


def test_acceptance_passes_on_consistent_data(cfg):
    daily = load_bars(cfg, "1Day")
    minute = load_bars(cfg, "1Min")
    out = check_benchmark(cfg, daily, minute)
    assert out["passed"]
    assert out["daily"]["gap"] < 1e-10
    assert out["intraday"]["gap"] < 1e-10


def test_acceptance_detects_inconsistent_intraday_feed(cfg):
    daily = load_bars(cfg, "1Day")
    minute = load_bars(cfg, "1Min").copy()
    minute.iloc[-1, minute.columns.get_loc("close")] *= 1.02   # cierre intradía 2% distinto
    out = check_benchmark(cfg, daily, minute)
    assert not out["intraday"]["passed"] and not out["passed"]


def test_metrics_on_known_curve():
    bars = make_bars([100, 100, 120, 90, 110], start="2024-01-02 09:30", freq="1D")
    bars["close"] = bars["open"]
    res = run_e0(bars, 1000)
    m = compute_metrics(res)
    assert m["total_return"] == pytest.approx(0.10)
    assert m["max_drawdown"] == pytest.approx(90 / 120 - 1)
    assert m["worst_day"] == pytest.approx(-0.25)
    assert m["time_in_market"] == 1.0
    assert m["n_trades"] == 1
    assert max_drawdown(pd.Series([1, 2, 1, 3])) == pytest.approx(-0.5)
    assert daily_equity(res.equity, 1000).iloc[0] == 1000


def test_cli_benchmark_end_to_end(cfg, tmp_path, monkeypatch):
    import bot.cli as cli
    monkeypatch.chdir(tmp_path)                      # la caché por defecto queda en tmp_path
    monkeypatch.setattr(cli, "OUTPUT_ROOT", tmp_path / "out")
    rc = main(["benchmark", "--source", "synthetic", "--start", "2022-01-03", "--end", "2022-02-28"])
    assert rc == 0
    out = tmp_path / "out" / "phase1_benchmark"
    acc = json.loads((out / "acceptance.json").read_text())
    assert acc["passed"]
    for f in ["run.json", "config_used.yaml", "e0_metrics.json", "e0_trades.csv", "e0_equity.csv"]:
        assert (out / f).exists()
    assert "python -m bot benchmark" in json.loads((out / "run.json").read_text())["command"]
