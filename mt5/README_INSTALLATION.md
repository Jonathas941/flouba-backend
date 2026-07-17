# Flouba Lite Elite EA — Installation

## Files
- `FloubaLiteEliteEA.mq5` — Expert Advisor
- `reference/FloubaBridge.mq5` — original strategy reference (do not attach to chart)

## Install in MetaTrader 5
1. Copy `FloubaLiteEliteEA.mq5` into `MQL5/Experts/FloubaLite/` (create the folder if needed).
2. Open MetaEditor (F4) → open the file → Compile (F7). Fix any broker-specific warnings before continuing.
3. In MT5: **Tools → Options → Expert Advisors**
   - Enable **Allow algorithmic trading**
   - Enable **Allow WebRequest for listed URL**
   - Add your Flouba Lite backend origin only, e.g. `https://your-backend.example.com` (no path, no trailing slash required in the allowlist entry beyond the origin).
4. Attach the EA to the intended symbol chart (reference classic behavior was commonly used on XAUUSD M1, but strategy logic reads M5/M15/M30/H1 independently of the chart period).
5. In EA inputs:
   - `Backend_URL` = your backend base URL
   - `MT5_Robot_Api_Key` = server `MT5_ROBOT_API_KEY`
   - `Robot_Id` = unique robot id (e.g. `flouba-lite-001`)
6. Leave safety defaults until you intentionally go live:
   - `Operating_Mode = MANUAL_SIGNAL_ONLY`
   - `Dry_Run = true`
   - `Allow_Backend_Trades = false`
   - `Allow_Local_Auto_Trades = false`
   - `Recovery_Lot_Multiplication = false`
7. Enable **Allow live trading** in the EA dialog only when ready.
8. Confirm the chart panel shows registration/heartbeat status after the first timer cycle.

## First live enable checklist
1. Demo account only for initial testing.
2. Set `Dry_Run = false`.
3. Choose mode:
   - `BRIDGE_ONLY` — backend commands only
   - `LOCAL_STRATEGY_ONLY` — local velocity strategy only
   - `HYBRID` — both (different magic numbers)
   - `MANUAL_SIGNAL_ONLY` — signals only, no auto trades
4. Explicitly enable `Allow_Backend_Trades` and/or `Allow_Local_Auto_Trades`.
5. Confirm `Bridge_Magic` ≠ `Local_Strategy_Magic`.

## Security
- Never hardcode API keys into distributed source.
- Store the one-time `robotToken` returned on registration (EA persists it automatically).
- Do not expose backend secrets in Base44 frontend code.
