# Settings reference — Flouba Lite Elite EA

## Backend
| Input | Default | Notes |
|---|---|---|
| Backend_URL | empty | Flouba Lite backend origin |
| MT5_Robot_Api_Key | empty | Server `MT5_ROBOT_API_KEY` |
| Robot_Id | empty | Unique robot identity |
| Timer_Seconds | 5 | Poll/heartbeat interval |
| Simulate_Backend_In_Tester | false | Allow HTTP in tester |

## Safety / mode
| Input | Default |
|---|---|
| Operating_Mode | MANUAL_SIGNAL_ONLY |
| Dry_Run | true |
| Allow_Backend_Trades | false |
| Allow_Local_Auto_Trades | false |
| Emergency_Stop | false |
| Bridge_Magic | 20240101 |
| Local_Strategy_Magic | 202612 |
| Allow_Remote_Dangerous_Settings | false |

## Strategy (REFERENCE_CLASSIC defaults)
| Input | Default |
|---|---|
| Strategy_Profile | REFERENCE_CLASSIC |
| Entry_Mode | ENTRY_ON_BURST_WITH_COOLDOWN |
| Trend_Filter_Mode | EMA50_ONLY |
| Velocity_Burst_Points | 15 |
| Entry_Cooldown_Seconds | 30 |
| Max_Local_Positions | 5 |
| Max_Spread_Points | 30 |
| FixedLot | 0.01 |
| Stop_Loss_Mode | SL_FIXED_POINTS |
| Stop_Loss_Points | 300 |
| Take_Profit_Mode | TP_NONE |
| Basket_Target_Unit | BASKET_POINTS |
| Basket_TP_Points | 150 |
| BreakEven_Trigger_Points | 50 |
| BreakEven_Lock_Points | 5 |
| Trailing_Distance_Points | 50 |
| Use_ADX_Filter / Use_RSI_Filter / Use_ATR_Filter / Use_Signal_Score | false |

## Account protection
| Input | Default |
|---|---|
| Equity_Floor_Percent | 80 |
| Daily_Loss_Mode | DAILY_FIXED_CURRENCY |
| Max_Daily_Loss_Currency | 10 |
| Recovery_Lot_Multiplication | false |
| Acknowledge_Recovery_Risk | false |
| Recovery_Lot_Multiplier | 1.5 |
| Recovery_Max_Steps | 4 |

Recovery multiplication remains disabled unless **both** recovery flags are true. It is high-risk and does not guarantee recovery of losses.

## Bridge management
| Input | Default |
|---|---|
| Bridge_BE_Trigger_Currency | 0.50 |
| Bridge_Trail_SL_Trigger_Currency | 1.00 |
| Bridge_Trail_SL_Distance_Mode | BRIDGE_PRICE_DISTANCE |
| Bridge_Trail_SL_Distance_Price | 0.30 |
| Bridge_Trail_TP_Trigger_Currency | 2.00 |
| Bridge_Trail_TP_Distance_Price | 1.50 |

Currency thresholds use account currency profit, not a hardcoded “USD” label.
