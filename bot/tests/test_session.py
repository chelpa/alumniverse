import pandas as pd

from bot.data.session import NY, filter_regular_session, last_completed_session_date, to_ny
from bot.data.timeframes import parse_timeframe


def test_to_ny_handles_dst():
    # 14:30 UTC es 9:30 NY en invierno (EST) y 10:30 NY en verano (EDT)
    utc = pd.DatetimeIndex(["2024-01-10 14:30", "2024-07-10 14:30"]).tz_localize("UTC")
    ny = to_ny(utc)
    assert [t.strftime("%H:%M") for t in ny] == ["09:30", "10:30"]


def test_filter_regular_session_keeps_0930_to_1559():
    idx = pd.date_range("2024-03-01 09:00", "2024-03-01 16:30", freq="1min", tz=NY)
    df = pd.DataFrame({"close": range(len(idx))}, index=idx)
    reg = filter_regular_session(df)
    assert reg.index[0].strftime("%H:%M") == "09:30"
    assert reg.index[-1].strftime("%H:%M") == "15:59"
    assert len(reg) == 390


def test_last_completed_session_skips_weekend_and_open_session():
    sat = pd.Timestamp("2024-03-09 12:00", tz=NY)
    assert str(last_completed_session_date(sat)) == "2024-03-08"
    mon_morning = pd.Timestamp("2024-03-11 10:00", tz=NY)
    assert str(last_completed_session_date(mon_morning)) == "2024-03-08"
    mon_evening = pd.Timestamp("2024-03-11 17:00", tz=NY)
    assert str(last_completed_session_date(mon_evening)) == "2024-03-11"


def test_parse_timeframe():
    assert parse_timeframe("5Min").minutes == 5
    assert parse_timeframe("1Day").is_intraday is False
    import pytest
    with pytest.raises(ValueError):
        parse_timeframe("7Weeks")
