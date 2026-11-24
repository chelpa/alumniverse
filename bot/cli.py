"""Línea de comandos: python -m bot <comando>.

Comandos de la Fase 1:
  probe      Valida cuánta historia y qué feed entrega Alpaca (IEX vs. SIP).
  download   Descarga y deja en caché las barras configuradas.
  quality    Control de calidad de las barras en caché.
  benchmark  Corre E0 y el criterio de aceptación de la Fase 1.
"""
from __future__ import annotations

import argparse
import json
import sys
from datetime import date, timedelta
from pathlib import Path

from .config import load_config
from .data.cache import BarCache
from .data.loader import load_bars, make_source
from .data.quality import quality_report
from .data.session import filter_regular_session, last_completed_session_date

OUTPUT_ROOT = Path("bot/reports/output")


def _cfg(args) -> dict:
    over: dict = {"data": {}}
    if args.source:
        over["data"]["source"] = args.source
    if args.feed:
        over["data"]["feed"] = args.feed
    if args.start:
        over["data"]["start"] = args.start
    if args.end:
        over["data"]["end"] = args.end
    return load_config(args.config, over)


def _pct(x: float) -> str:
    return f"{x * 100:,.4f}%"


# ---------------------------------------------------------------------------- probe
def cmd_probe(args) -> int:
    from .data.sources import AlpacaSource
    cfg = _cfg(args)
    sym = cfg["data"]["symbol"]
    last = last_completed_session_date()
    report: dict = {"symbol": sym, "last_completed_session": str(last), "feeds": {}}
    for feed in ("iex", "sip"):
        r: dict = {}
        try:
            src = AlpacaSource(feed=feed) if cfg["data"]["source"] == "alpaca" else make_source(cfg, feed)
            daily = src.get_bars(sym, "1Day", date(2010, 1, 1), last, "raw")
            if daily.empty:
                r["error"] = "sin barras diarias"
            else:
                first = daily.index[0].date()
                r["daily_first"] = str(first)
                r["daily_last"] = str(daily.index[-1].date())
                r["daily_bars"] = int(len(daily))
                r["years_of_history"] = round((daily.index[-1] - daily.index[0]).days / 365.25, 2)
                old = filter_regular_session(src.get_bars(sym, "1Min", first, first + timedelta(days=10), "raw"))
                r["minute_first"] = old.index[0].isoformat() if not old.empty else None
                recent = filter_regular_session(src.get_bars(sym, "1Min", last - timedelta(days=9), last, "raw"))
                r["recent_minute_quality"] = quality_report(recent, "1Min")
        except Exception as e:  # noqa: BLE001 - se informa al usuario
            r["error"] = f"{type(e).__name__}: {e}"
        report["feeds"][feed] = r
    vi = report["feeds"]["iex"].get("recent_minute_quality", {}).get("mean_daily_volume")
    vs = report["feeds"]["sip"].get("recent_minute_quality", {}).get("mean_daily_volume")
    if vi and vs:
        report["iex_volume_share_of_sip"] = round(vi / vs, 4)
    print(json.dumps(report, indent=2, ensure_ascii=False))
    out = OUTPUT_ROOT / "probe"
    out.mkdir(parents=True, exist_ok=True)
    (out / "probe.json").write_text(json.dumps(report, indent=2, ensure_ascii=False))
    print(f"\nGuardado en {out / 'probe.json'}")
    return 0


# ------------------------------------------------------------------------- download
def _timeframes(cfg, args) -> list[tuple[str, str]]:
    d = cfg["data"]
    if args.timeframe:
        return [(tf, d["adjustment"]) for tf in args.timeframe]
    return [(tf, d["adjustment"]) for tf in d["intraday_timeframes"]] + [(d["benchmark_timeframe"], d["adjustment"])]


def cmd_download(args) -> int:
    cfg = _cfg(args)
    source = make_source(cfg)
    cache = BarCache(cfg["data"]["cache_dir"])
    for tf, adj in _timeframes(cfg, args):
        bars = load_bars(cfg, tf, adjustment=adj, source=source, cache=cache, refresh=args.refresh)
        print(f"{tf:>5} {adj:<4} {len(bars):>9,} barras  {bars.index[0] if len(bars) else '-'} → "
              f"{bars.index[-1] if len(bars) else '-'}")
    print(f"Caché en {Path(cfg['data']['cache_dir']).resolve()}  (descargas: {len(cache.fetch_log)})")
    return 0


def cmd_quality(args) -> int:
    cfg = _cfg(args)
    source = make_source(cfg)
    cache = BarCache(cfg["data"]["cache_dir"])
    reports = []
    for tf in args.timeframe or cfg["data"]["intraday_timeframes"]:
        bars = load_bars(cfg, tf, source=source, cache=cache)
        reports.append(quality_report(bars, tf))
    print(json.dumps(reports, indent=2, ensure_ascii=False))
    return 0


# ------------------------------------------------------------------------ benchmark
def cmd_benchmark(args) -> int:
    from .backtest.metrics import compute_metrics
    from .backtest.validation import check_benchmark, run_e0
    from .backtest.costs import CostModel
    from .reports.repro import write_run_info

    cfg = _cfg(args)
    source = make_source(cfg)
    cache = BarCache(cfg["data"]["cache_dir"])
    daily = load_bars(cfg, cfg["data"]["benchmark_timeframe"], source=source, cache=cache, refresh=args.refresh)
    minute = None
    if not args.skip_intraday:
        minute = load_bars(cfg, "1Min", source=source, cache=cache, refresh=args.refresh)
    res = check_benchmark(cfg, daily, minute)

    out = OUTPUT_ROOT / "phase1_benchmark"
    e0 = run_e0(daily, float(cfg["backtest"]["initial_capital"]), CostModel.from_config(cfg),
                bool(cfg["backtest"].get("fractional_shares", True)))
    metrics = compute_metrics(e0)
    write_run_info(out, cfg, {"source": source.name, "feed": source.feed}, args.argv)
    (out / "acceptance.json").write_text(json.dumps(res, indent=2, ensure_ascii=False))
    (out / "e0_metrics.json").write_text(json.dumps(metrics, indent=2, ensure_ascii=False))
    e0.trades.to_csv(out / "e0_trades.csv", index=False)
    e0.fills.to_csv(out / "e0_fills.csv", index=False)
    e0.equity.to_csv(out / "e0_equity.csv")

    p = res["period"]
    print(f"E0 comprar y mantener {cfg['data']['symbol']} · fuente {source.name}/{source.feed} · "
          f"{p['start']} → {p['end']} ({p['days']} días)")
    print(f"  Retorno de la fuente (cierre final / apertura inicial − 1): {_pct(res['reference_return'])}")
    d = res["daily"]
    print(f"  Motor, barras diarias:   {_pct(d['engine_return'])}  diferencia {d['gap']:.2e} "
          f"(tolerancia {d['tolerance']:.0e}) → {'OK' if d['passed'] else 'FALLA'}")
    if "intraday" in res:
        i = res["intraday"]
        print(f"  Motor, barras de 1 min:  {_pct(i['engine_return'])}  diferencia {i['gap']:.2e} "
              f"(tolerancia {i['tolerance']:.0e}) → {'OK' if i['passed'] else 'FALLA'}")
    print(f"  CAGR {_pct(metrics['cagr'])} · vol {_pct(metrics['volatility'])} · Sharpe {metrics['sharpe']:.2f} · "
          f"máx. drawdown {_pct(metrics['max_drawdown'])} · peor día {_pct(metrics['worst_day'])}")
    print(f"\nCriterio de aceptación Fase 1: {'APROBADO' if res['passed'] else 'NO APROBADO'}")
    print(f"Resultados en {out}")
    return 0 if res["passed"] else 1


# ----------------------------------------------------------------------------- main
def build_parser() -> argparse.ArgumentParser:
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--config", help="YAML que se superpone a bot/config/default.yaml")
    common.add_argument("--source", choices=["alpaca", "synthetic"])
    common.add_argument("--feed", choices=["iex", "sip"])
    common.add_argument("--start", help="AAAA-MM-DD")
    common.add_argument("--end", help="AAAA-MM-DD")

    p = argparse.ArgumentParser(prog="python -m bot", description=__doc__,
                                formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="command", required=True)
    sub.add_parser("probe", parents=[common], help="valida historia y feed de Alpaca").set_defaults(func=cmd_probe)
    d = sub.add_parser("download", parents=[common], help="descarga y deja en caché")
    d.add_argument("--timeframe", action="append", help="repetible; por defecto los del YAML")
    d.add_argument("--refresh", action="store_true", help="ignora la caché y vuelve a descargar")
    d.set_defaults(func=cmd_download)
    q = sub.add_parser("quality", parents=[common], help="calidad de barras intradía")
    q.add_argument("--timeframe", action="append")
    q.set_defaults(func=cmd_quality)
    b = sub.add_parser("benchmark", parents=[common], help="E0 + criterio de aceptación Fase 1")
    b.add_argument("--skip-intraday", action="store_true", help="omite el chequeo cruzado con barras de 1 min")
    b.add_argument("--refresh", action="store_true")
    b.set_defaults(func=cmd_benchmark)
    return p


def main(argv=None) -> int:
    argv = sys.argv[1:] if argv is None else list(argv)
    args = build_parser().parse_args(argv)
    args.argv = argv
    try:
        return args.func(args)
    except RuntimeError as e:
        print(f"Error: {e}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    sys.exit(main())
