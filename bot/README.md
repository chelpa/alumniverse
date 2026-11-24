# Bot de trading intradía Nasdaq 100 (QQQ)

Proyecto educativo del Club de Finanzas FAE USACH. **Solo backtest y paper trading: no opera dinero real.**
Spec: v1 (23 nov 2026).

## Estado por fase

| Fase | Entrega | Estado |
|---|---|---|
| 1 | Datos, caché, motor de backtest y benchmark E0 | ✅ Código y tests. Falta correr la validación con datos reales (ver abajo) |
| 2 | E1–E3, costos, riesgo y apalancamiento | Pendiente |
| 3 | Walk-forward y reporte | Pendiente |
| 4 | Paper trading en Alpaca | Pendiente |

## Instalación

```bash
python -m venv .venv && source .venv/bin/activate     # Python 3.11+
pip install -e ".[dev]"
cp .env.example .env    # completar con las claves de una cuenta PAPER de Alpaca
```

`.env` está en `.gitignore`. Las claves solo se leen desde el entorno o ese archivo.

## Fase 1: cómo correrla

```bash
# 1. Tests offline (datos sintéticos, no necesitan red ni claves)
pytest

# 2. Validar historia y feed de Alpaca (IEX vs. SIP) antes del primer backtest
python -m bot probe

# 3. Descargar y dejar en caché 1Min, 5Min y 1Day ajustados (Parquet en .cache/bars)
python -m bot download

# 4. Criterio de aceptación de la Fase 1 con datos reales
python -m bot benchmark
pytest -m alpaca            # el mismo criterio, como test
```

Para probar sin claves: agregar `--source synthetic` a cualquier comando.
Opciones comunes: `--config mi.yaml`, `--feed iex|sip`, `--start AAAA-MM-DD`, `--end AAAA-MM-DD`, `--refresh`.

### Criterio de aceptación y tolerancia

"El retorno de comprar y mantener coincide con el de la fuente de datos":

1. **Principal.** E0 corrido en el motor sobre barras diarias ajustadas (sin costos, acciones fraccionarias)
   vs. `cierre_ajustado_final / apertura_ajustada_inicial − 1` calculado directo de la fuente.
   Tolerancia: **1 pb** en el factor de crecimiento (`acceptance.daily_tolerance`).
2. **Cruzado.** E0 sobre barras de 1 minuto de sesión regular vs. la misma referencia diaria.
   Tolerancia: **0,5%** (`acceptance.intraday_tolerance`). Mide cuánto se aleja el feed intradía
   (IEX) de las barras diarias; si falla, el `probe` ayuda a decidir si usar `--feed sip`.

E0 decide comprar antes de ver la primera barra, así que compra en la apertura del primer día y nunca vende.

### Salidas

`bot/reports/output/phase1_benchmark/`: `acceptance.json`, `e0_metrics.json`, `e0_trades.csv`,
`e0_fills.csv`, `e0_equity.csv`, `config_used.yaml` y `run.json` (comando exacto y commit de git
para repetir el resultado).

## Decisiones de diseño

- **Sin mirar al futuro.** `Strategy.on_bar(i, ctx)` se llama con la barra `i` cerrada; la señal se ejecuta
  en la apertura de `i+1`. Hay un test que cambia barras futuras y verifica que el pasado no cambia.
- **Horas.** Todo en America/New_York. Alpaca etiqueta cada barra con su hora de inicio: la sesión regular
  es [09:30, 16:00).
- **Caché.** Un Parquet por (fuente, feed, ajuste, símbolo, timeframe) con un `manifest.json`. Los precios
  ajustados cambian hacia atrás con cada dividendo, así que ampliar un dataset ajustado lo vuelve a
  descargar completo. Solo se guardan sesiones ya cerradas.
- **Seguridad.** No hay código de órdenes en la Fase 1. `test_safety.py` falla si aparece `paper=False` o el
  endpoint de trading real de Alpaca.

## Estructura

```
bot/
  config/        default.yaml y cargador
  data/          sources.py (Alpaca, sintética), cache.py, loader.py, session.py, quality.py
  strategies/    base.py (interfaz), buy_hold.py (E0)
  backtest/      engine.py, costs.py, metrics.py, validation.py
  risk/ live/    (Fases 2 y 4)
  reports/       repro.py y output/
  tests/
```
