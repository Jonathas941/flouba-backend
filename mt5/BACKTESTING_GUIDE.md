# Backtesting guide — Flouba Lite Elite EA

## Goal
Validate local strategy mechanics (entries, stops, basket TP, protections) in the MT5 Strategy Tester. Do **not** treat a single optimized period as proof of future profit.

## Tester behavior
When `MQL_TESTER` is true:
- HTTP/backend calls are disabled automatically unless `Simulate_Backend_In_Tester = true`.
- Local strategy, risk management, and journal reasons still run.
- Prefer `LOCAL_STRATEGY_ONLY` or `HYBRID` with `Allow_Local_Auto_Trades = true` and `Dry_Run = false` for execution tests.
- For signal-only inspection, keep `MANUAL_SIGNAL_ONLY` and read Experts journal / chart comments.

## Recommended first pass (REFERENCE_CLASSIC)
1. Symbol: the instrument you intend to trade (commonly metals/FX majors).
2. Model: **Every tick based on real ticks** when available.
3. Period: at least several months; then validate on a different out-of-sample window.
4. Inputs:
   - `Strategy_Profile = REFERENCE_CLASSIC`
   - `Operating_Mode = LOCAL_STRATEGY_ONLY`
   - `Dry_Run = false`
   - `Allow_Local_Auto_Trades = true`
   - `Recovery_Lot_Multiplication = false`
5. Confirm journal shows entry reasons, rejections (`SPREAD_TOO_HIGH`, `EMA_FILTER_FAILED`, etc.), and basket closes.

## Optimization guidance
Safe to optimize (with caution):
- `Velocity_Burst_Points`
- `Entry_Cooldown_Seconds`
- `Basket_TP_Points`
- `BreakEven_Trigger_Points` / `Trailing_Distance_Points`
- filter toggles for research (`Use_ADX_Filter`, etc.)

Do **not** optimize away safety:
- Do not disable hard SL requirements.
- Do not disable daily loss / equity floor for “better curve fit”.
- Do not enable recovery multiplication for optimization contests.

## Walk-forward checklist
1. Optimize on period A.
2. Forward-test unchanged settings on period B.
3. Reject settings that only work on A.
4. Re-test on demo before any live enablement.

## Reporting
Record:
- net profit, max drawdown, trade count
- rejection frequencies
- whether basket exits or SL exits dominate
- spread regime of the test data vs your live broker
