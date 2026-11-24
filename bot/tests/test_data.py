from datetime import date

import pandas as pd
import pytest

from bot.data.cache import BarCache
from bot.data.loader import load_bars
from bot.data.quality import quality_report
from bot.data.session import NY, filter_regular_session
from bot.data.sources import normalize_alpaca_frame

from .conftest import CountingSource


def test_synthetic_is_deterministic_and_range_independent(synthetic):
    a = synthetic.get_bars("QQQ", "1Min", date(2022, 1, 3), date(2022, 1, 7))
    b = type(synthetic)(seed=7).get_bars("QQQ", "1Min", date(2022, 1, 5), date(2022, 2, 28))
    common = a.index.intersection(b.index)
    assert len(common) > 0
    pd.testing.assert_frame_equal(a.loc[common], b.loc[common])


def test_synthetic_daily_matches_regular_session_minutes(synthetic):
    m = filter_regular_session(synthetic.get_bars("QQQ", "1Min", date(2022, 1, 3), date(2022, 1, 7)))
    d = synthetic.get_bars("QQQ", "1Day", date(2022, 1, 3), date(2022, 1, 7))
    assert len(d) == 5
    first_day = m.loc[m.index.date == date(2022, 1, 3)]
    assert d["open"].iloc[0] == first_day["open"].iloc[0]
    assert d["close"].iloc[0] == first_day["close"].iloc[-1]
    assert d["high"].iloc[0] == first_day["high"].max()


def test_cache_hits_without_refetch(tmp_path, synthetic):
    src = CountingSource(synthetic)
    cache = BarCache(tmp_path)
    a = cache.get(src, "QQQ", "5Min", date(2022, 1, 3), date(2022, 1, 31))
    b = cache.get(src, "QQQ", "5Min", date(2022, 1, 10), date(2022, 1, 20))  # subrango
    assert len(src.calls) == 1
    assert (tmp_path / "synthetic" / "synthetic" / "all" / "QQQ" / "5Min" / "bars.parquet").exists()
    pd.testing.assert_frame_equal(b, a.loc[(a.index >= pd.Timestamp("2022-01-10", tz=NY))
                                           & (a.index < pd.Timestamp("2022-01-21", tz=NY))], check_freq=False)
    # Una nueva instancia de caché lee del disco
    c = BarCache(tmp_path).get(src, "QQQ", "5Min", date(2022, 1, 3), date(2022, 1, 31))
    assert len(src.calls) == 1
    pd.testing.assert_frame_equal(a, c, check_freq=False)


def test_raw_cache_extends_incrementally(tmp_path, synthetic):
    src = CountingSource(synthetic)
    cache = BarCache(tmp_path)
    cache.get(src, "QQQ", "1Day", date(2022, 2, 1), date(2022, 2, 28), adjustment="raw")
    full = cache.get(src, "QQQ", "1Day", date(2022, 1, 3), date(2022, 3, 31), adjustment="raw")
    assert [(c[1], c[2]) for c in src.calls] == [
        (date(2022, 2, 1), date(2022, 2, 28)),
        (date(2022, 1, 3), date(2022, 1, 31)),
        (date(2022, 3, 1), date(2022, 3, 31)),
    ]
    direct = synthetic.get_bars("QQQ", "1Day", date(2022, 1, 3), date(2022, 3, 31))
    pd.testing.assert_frame_equal(full, direct, check_freq=False)


def test_adjusted_cache_refetches_whole_range_when_extended(tmp_path, synthetic):
    """Los precios ajustados cambian hacia atrás: ampliar implica una descarga completa."""
    src = CountingSource(synthetic)
    cache = BarCache(tmp_path)
    cache.get(src, "QQQ", "1Day", date(2022, 2, 1), date(2022, 2, 28), adjustment="all")
    cache.get(src, "QQQ", "1Day", date(2022, 1, 3), date(2022, 3, 31), adjustment="all")
    assert [(c[1], c[2]) for c in src.calls][-1] == (date(2022, 1, 3), date(2022, 3, 31))
    assert len(src.calls) == 2


def test_refresh_forces_download(tmp_path, synthetic):
    src = CountingSource(synthetic)
    cache = BarCache(tmp_path)
    cache.get(src, "QQQ", "1Day", date(2022, 1, 3), date(2022, 1, 31))
    cache.get(src, "QQQ", "1Day", date(2022, 1, 3), date(2022, 1, 31), refresh=True)
    assert len(src.calls) == 2


def test_cache_rejects_empty_range(tmp_path, synthetic):
    with pytest.raises(ValueError):
        BarCache(tmp_path).get(synthetic, "QQQ", "1Day", date(2022, 2, 1), date(2022, 1, 1))


def test_load_bars_filters_session(cfg):
    bars = load_bars(cfg, "1Min")
    assert bars.index.time.min().strftime("%H:%M") == "09:30"
    assert bars.index.time.max().strftime("%H:%M") == "15:59"
    rep = quality_report(bars, "1Min")
    assert rep["expected_bars_per_day"] == 390
    assert rep["incomplete_days"] == 0
    bars5 = load_bars(cfg, "5Min")
    assert quality_report(bars5, "5Min")["mean_bars_per_day"] == 78


def test_quality_flags_missing_bars(cfg):
    bars = load_bars(cfg, "1Min")
    holes = bars.drop(bars.index[100:130])
    rep = quality_report(holes, "1Min")
    assert rep["incomplete_days"] == 1
    assert rep["pct_bars_missing"] > 0


def test_normalize_alpaca_frame_multiindex_utc():
    ts = pd.DatetimeIndex(["2024-07-01 13:30", "2024-07-01 13:31"]).tz_localize("UTC")
    raw = pd.DataFrame(
        {"open": [1.0, 2.0], "high": [1.5, 2.5], "low": [0.5, 1.5], "close": [1.2, 2.2],
         "volume": [10, 20], "trade_count": [1, 2], "vwap": [1.1, 2.1]},
        index=pd.MultiIndex.from_arrays([["QQQ", "QQQ"], ts], names=["symbol", "timestamp"]))
    df = normalize_alpaca_frame(raw, "QQQ")
    assert str(df.index.tz) == "America/New_York"
    assert df.index[0].strftime("%H:%M") == "09:30"
    assert list(df.columns) == ["open", "high", "low", "close", "volume", "vwap", "trade_count"]


def test_alpaca_source_builds_request_without_network():
    from bot.data.sources import AlpacaSource

    class FakeResp:
        df = pd.DataFrame()

    class FakeClient:
        def get_stock_bars(self, req):
            self.req = req
            return FakeResp()

    client = FakeClient()
    out = AlpacaSource(feed="iex", client=client).get_bars("QQQ", "5Min", date(2023, 1, 3), date(2023, 1, 4), "all")
    assert out.empty
    assert client.req.feed.value == "iex"
    assert client.req.adjustment.value == "all"
    assert client.req.timeframe.amount_value == 5
    # 2023-01-03 00:00 NY = 05:00 UTC
    assert client.req.start.hour == 5
