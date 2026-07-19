//+------------------------------------------------------------------+
//|          GOLD_MULTI_HFT_SCALPER_AUTO_SL_SAFE.mq5                 |
//|   Original Burst + EMA logic with essential safety protections   |
//+------------------------------------------------------------------+
#property strict

#include <Trade\Trade.mqh>

input group "=== HFT SETTINGS ==="
input double MicroLot           = 0.01;
input int    MaxTrades          = 10;
input int    BurstPoints        = 15;
input int    BasketTP_Pts       = 150;
input bool   UseBasketSL        = true;
input int    BasketSL_Pts       = 900;

input group "=== ENTRY CONTROL ==="
input int    EntryCooldownMs    = 750;
input int    MinEntryGapPts     = 30;
input bool   OneDirectionBasket = true;

input group "=== PROTECTION & AUTO SL ==="
input int    StopLossPts        = 300;
input bool   UseBreakEven       = true;
input int    BE_Trigger         = 50;
input int    BE_Lock            = 5;
input int    TrailingDist       = 50;
input int    TrailingStep       = 10;
input int    MaxSpread          = 30;
input int    MaxDeviationPoints = 20;

input group "=== TREND FILTER ==="
input int    MA_Period          = 50;
input int    Magic              = 202612;

CTrade trade;

double last_tick_price      = 0.0;
double last_entry_price     = 0.0;
double trade_lot            = 0.0;
long   last_entry_time_msc  = 0;

int    handle_ma = INVALID_HANDLE;
double ma_buf[];

//+------------------------------------------------------------------+
//| Initialization                                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   if(MicroLot <= 0.0 || MaxTrades <= 0 || BurstPoints <= 0 ||
      StopLossPts <= 0 || MA_Period <= 0)
   {
      Print("INIT ERROR: Invalid input parameters.");
      return INIT_PARAMETERS_INCORRECT;
   }

   trade_lot = NormalizeVolume(MicroLot);
   if(trade_lot <= 0.0)
   {
      Print("INIT ERROR: Invalid lot size for this broker.");
      return INIT_PARAMETERS_INCORRECT;
   }

   trade.SetExpertMagicNumber(Magic);
   trade.SetDeviationInPoints(MaxDeviationPoints);
   trade.SetTypeFillingBySymbol(_Symbol);
   trade.SetAsyncMode(false);
   trade.SetMarginMode();

   handle_ma = iMA(_Symbol, _Period, MA_Period, 0, MODE_EMA, PRICE_CLOSE);
   if(handle_ma == INVALID_HANDLE)
   {
      Print("INIT ERROR: Unable to create EMA handle. Error=", GetLastError());
      return INIT_FAILED;
   }

   ArraySetAsSeries(ma_buf, true);

   MqlTick tick;
   if(!SymbolInfoTick(_Symbol, tick))
   {
      Print("INIT ERROR: Unable to read current tick.");
      return INIT_FAILED;
   }

   last_tick_price = tick.bid;

   Print("GOLD HFT SAFE initialized on ", _Symbol,
         " | Lot=", DoubleToString(trade_lot, 2),
         " | MaxTrades=", MaxTrades);

   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Deinitialization                                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   if(handle_ma != INVALID_HANDLE)
   {
      IndicatorRelease(handle_ma);
      handle_ma = INVALID_HANDLE;
   }
}

//+------------------------------------------------------------------+
//| Main tick                                                        |
//+------------------------------------------------------------------+
void OnTick()
{
   MqlTick tick;
   if(!SymbolInfoTick(_Symbol, tick))
      return;

   double bid = tick.bid;
   double ask = tick.ask;

   if(bid <= 0.0 || ask <= 0.0)
      return;

   // Calculate burst, then update immediately.
   // This prevents a false large burst after spread/indicator returns.
   double velocity = bid - last_tick_price;
   last_tick_price = bid;

   // Existing trades must always be managed, even when spread is high.
   ManageRisk(bid, ask);

   // Stop here after a basket close so the EA cannot reopen on same tick.
   if(CheckBasketExit(bid, ask))
      return;

   int current_entries = CountMyEntries();

   if(current_entries <= 0)
      last_entry_price = 0.0;

   // Spread blocks new entries only.
   double spread_points = (ask - bid) / _Point;
   if(spread_points > MaxSpread)
      return;

   if(BarsCalculated(handle_ma) < MA_Period)
      return;

   ResetLastError();
   if(CopyBuffer(handle_ma, 0, 0, 1, ma_buf) != 1)
   {
      Print("EMA CopyBuffer failed. Error=", GetLastError());
      return;
   }

   double ma_value = ma_buf[0];
   if(ma_value <= 0.0)
      return;

   if(current_entries >= MaxTrades)
      return;

   // Cooldown between successful entries.
   if(last_entry_time_msc > 0)
   {
      long elapsed = tick.time_msc - last_entry_time_msc;
      if(elapsed >= 0 && elapsed < EntryCooldownMs)
         return;
   }

   // Do not stack trades almost at exactly the same price.
   if(last_entry_price > 0.0)
   {
      double gap_points = MathAbs(bid - last_entry_price) / _Point;
      if(gap_points < MinEntryGapPts)
         return;
   }

   int basket_direction = GetBasketDirection();

   // Original BUY logic: burst upward while above EMA.
   if(velocity > BurstPoints * _Point && bid > ma_value)
   {
      if(!OneDirectionBasket ||
         basket_direction == 0 ||
         basket_direction == 1)
      {
         OpenBuy(tick);
      }
      return;
   }

   // Original SELL logic: burst downward while below EMA.
   if(velocity < -BurstPoints * _Point && bid < ma_value)
   {
      if(!OneDirectionBasket ||
         basket_direction == 0 ||
         basket_direction == -1)
      {
         OpenSell(tick);
      }
      return;
   }
}

//+------------------------------------------------------------------+
//| Open BUY                                                         |
//+------------------------------------------------------------------+
bool OpenBuy(const MqlTick &tick)
{
   double requested_sl = tick.bid - StopLossPts * _Point;
   double valid_sl = PrepareInitialSL(POSITION_TYPE_BUY,
                                      requested_sl,
                                      tick.bid,
                                      tick.ask);

   ResetLastError();

   bool sent = trade.Buy(trade_lot,
                         _Symbol,
                         0.0,
                         valid_sl,
                         0.0,
                         "HFT-Buy");

   if(!sent || !TradeResultSuccessful())
   {
      Print("BUY FAILED | Retcode=", trade.ResultRetcode(),
            " | ", trade.ResultRetcodeDescription(),
            " | Error=", GetLastError());
      return false;
   }

   double execution_price = trade.ResultPrice();
   if(execution_price <= 0.0)
      execution_price = tick.ask;

   last_entry_price = execution_price;
   last_entry_time_msc = tick.time_msc;

   Print("BUY OPENED | Price=", DoubleToString(execution_price, _Digits),
         " | SL=", DoubleToString(valid_sl, _Digits),
         " | Entries=", CountMyEntries());

   return true;
}

//+------------------------------------------------------------------+
//| Open SELL                                                        |
//+------------------------------------------------------------------+
bool OpenSell(const MqlTick &tick)
{
   double requested_sl = tick.ask + StopLossPts * _Point;
   double valid_sl = PrepareInitialSL(POSITION_TYPE_SELL,
                                      requested_sl,
                                      tick.bid,
                                      tick.ask);

   ResetLastError();

   bool sent = trade.Sell(trade_lot,
                          _Symbol,
                          0.0,
                          valid_sl,
                          0.0,
                          "HFT-Sell");

   if(!sent || !TradeResultSuccessful())
   {
      Print("SELL FAILED | Retcode=", trade.ResultRetcode(),
            " | ", trade.ResultRetcodeDescription(),
            " | Error=", GetLastError());
      return false;
   }

   double execution_price = trade.ResultPrice();
   if(execution_price <= 0.0)
      execution_price = tick.bid;

   last_entry_price = execution_price;
   last_entry_time_msc = tick.time_msc;

   Print("SELL OPENED | Price=", DoubleToString(execution_price, _Digits),
         " | SL=", DoubleToString(valid_sl, _Digits),
         " | Entries=", CountMyEntries());

   return true;
}

//+------------------------------------------------------------------+
//| Safety SL + Break-even + Trailing                                |
//+------------------------------------------------------------------+
void ManageRisk(double bid, double ask)
{
   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0)
         continue;

      if(PositionGetString(POSITION_SYMBOL) != _Symbol ||
         PositionGetInteger(POSITION_MAGIC) != Magic)
      {
         continue;
      }

      long type = PositionGetInteger(POSITION_TYPE);
      double open_price = PositionGetDouble(POSITION_PRICE_OPEN);
      double current_sl = PositionGetDouble(POSITION_SL);
      double current_tp = PositionGetDouble(POSITION_TP);

      // Add safety SL immediately if missing.
      if(current_sl <= 0.0)
      {
         double requested_sl =
            (type == POSITION_TYPE_BUY)
            ? bid - StopLossPts * _Point
            : ask + StopLossPts * _Point;

         double safety_sl = PrepareInitialSL(type,
                                             requested_sl,
                                             bid,
                                             ask);

         if(ModifyPositionSL(ticket, safety_sl, current_tp))
         {
            current_sl = safety_sl;
            Print("SAFETY SL ADDED | Ticket=", ticket,
                  " | SL=", DoubleToString(safety_sl, _Digits));
         }
         else
         {
            continue;
         }
      }

      // Break-even.
      if(UseBreakEven)
      {
         if(type == POSITION_TYPE_BUY)
         {
            double be_sl = NormalizeDouble(open_price + BE_Lock * _Point,
                                           _Digits);

            if(bid >= open_price + BE_Trigger * _Point &&
               current_sl < be_sl &&
               IsSLValid(type, be_sl, bid, ask))
            {
               if(ModifyPositionSL(ticket, be_sl, current_tp))
               {
                  current_sl = be_sl;
                  Print("BUY BREAK-EVEN | Ticket=", ticket,
                        " | SL=", DoubleToString(be_sl, _Digits));
               }
            }
         }
         else if(type == POSITION_TYPE_SELL)
         {
            double be_sl = NormalizeDouble(open_price - BE_Lock * _Point,
                                           _Digits);

            if(ask <= open_price - BE_Trigger * _Point &&
               (current_sl <= 0.0 || current_sl > be_sl) &&
               IsSLValid(type, be_sl, bid, ask))
            {
               if(ModifyPositionSL(ticket, be_sl, current_tp))
               {
                  current_sl = be_sl;
                  Print("SELL BREAK-EVEN | Ticket=", ticket,
                        " | SL=", DoubleToString(be_sl, _Digits));
               }
            }
         }
      }

      // Trailing stop.
      if(TrailingDist <= 0)
         continue;

      if(type == POSITION_TYPE_BUY)
      {
         if(bid >= open_price + TrailingDist * _Point)
         {
            double new_sl = NormalizeDouble(bid - TrailingDist * _Point,
                                            _Digits);

            if((current_sl <= 0.0 ||
                new_sl > current_sl + TrailingStep * _Point) &&
               IsSLValid(type, new_sl, bid, ask))
            {
               if(ModifyPositionSL(ticket, new_sl, current_tp))
                  current_sl = new_sl;
            }
         }
      }
      else if(type == POSITION_TYPE_SELL)
      {
         if(ask <= open_price - TrailingDist * _Point)
         {
            double new_sl = NormalizeDouble(ask + TrailingDist * _Point,
                                            _Digits);

            if((current_sl <= 0.0 ||
                new_sl < current_sl - TrailingStep * _Point) &&
               IsSLValid(type, new_sl, bid, ask))
            {
               if(ModifyPositionSL(ticket, new_sl, current_tp))
                  current_sl = new_sl;
            }
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Basket TP and Basket SL                                          |
//+------------------------------------------------------------------+
bool CheckBasketExit(double bid, double ask)
{
   double total_points = 0.0;
   int position_count = 0;

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0)
         continue;

      if(PositionGetString(POSITION_SYMBOL) != _Symbol ||
         PositionGetInteger(POSITION_MAGIC) != Magic)
      {
         continue;
      }

      long type = PositionGetInteger(POSITION_TYPE);
      double open_price = PositionGetDouble(POSITION_PRICE_OPEN);
      double volume = PositionGetDouble(POSITION_VOLUME);

      double position_points = 0.0;

      if(type == POSITION_TYPE_BUY)
         position_points = (bid - open_price) / _Point;
      else if(type == POSITION_TYPE_SELL)
         position_points = (open_price - ask) / _Point;

      // Weight points by the number of MicroLot-sized entries.
      double multiplier = 1.0;
      if(trade_lot > 0.0)
         multiplier = volume / trade_lot;

      total_points += position_points * multiplier;
      position_count++;
   }

   if(position_count <= 0)
      return false;

   if(BasketTP_Pts > 0 && total_points >= BasketTP_Pts)
   {
      Print("BASKET TP REACHED | Points=", DoubleToString(total_points, 1));
      CloseAllPositions("BASKET TP");
      return true;
   }

   if(UseBasketSL &&
      BasketSL_Pts > 0 &&
      total_points <= -BasketSL_Pts)
   {
      Print("BASKET SL REACHED | Points=", DoubleToString(total_points, 1));
      CloseAllPositions("BASKET SL");
      return true;
   }

   return false;
}

//+------------------------------------------------------------------+
//| Close all positions belonging to this EA                         |
//+------------------------------------------------------------------+
void CloseAllPositions(string reason)
{
   bool found = false;

   for(int i = PositionsTotal() - 1; i >= 0; i--)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0)
         continue;

      if(PositionGetString(POSITION_SYMBOL) != _Symbol ||
         PositionGetInteger(POSITION_MAGIC) != Magic)
      {
         continue;
      }

      found = true;

      ResetLastError();
      bool closed = trade.PositionClose(ticket);

      if(!closed || !TradeResultSuccessful())
      {
         Print("CLOSE FAILED | Ticket=", ticket,
               " | Retcode=", trade.ResultRetcode(),
               " | ", trade.ResultRetcodeDescription(),
               " | Error=", GetLastError());
      }
      else
      {
         Print("POSITION CLOSED | Ticket=", ticket,
               " | Reason=", reason);
      }
   }

   if(found)
   {
      last_entry_price = 0.0;

      MqlTick tick;
      if(SymbolInfoTick(_Symbol, tick))
         last_entry_time_msc = tick.time_msc;
   }
}

//+------------------------------------------------------------------+
//| Count equivalent MicroLot entries                                |
//| Supports hedging and limits volume growth on netting accounts    |
//+------------------------------------------------------------------+
int CountMyEntries()
{
   if(trade_lot <= 0.0)
      return 0;

   double equivalent_entries = 0.0;

   for(int i = 0; i < PositionsTotal(); i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0)
         continue;

      if(PositionGetString(POSITION_SYMBOL) != _Symbol ||
         PositionGetInteger(POSITION_MAGIC) != Magic)
      {
         continue;
      }

      double volume = PositionGetDouble(POSITION_VOLUME);
      equivalent_entries += volume / trade_lot;
   }

   if(equivalent_entries <= 0.0)
      return 0;

   return (int)MathCeil(equivalent_entries - 0.0000001);
}

//+------------------------------------------------------------------+
//| Current basket direction                                         |
//| 0 none, 1 buy, -1 sell, 2 mixed                                  |
//+------------------------------------------------------------------+
int GetBasketDirection()
{
   bool has_buy = false;
   bool has_sell = false;

   for(int i = 0; i < PositionsTotal(); i++)
   {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0)
         continue;

      if(PositionGetString(POSITION_SYMBOL) != _Symbol ||
         PositionGetInteger(POSITION_MAGIC) != Magic)
      {
         continue;
      }

      long type = PositionGetInteger(POSITION_TYPE);

      if(type == POSITION_TYPE_BUY)
         has_buy = true;
      else if(type == POSITION_TYPE_SELL)
         has_sell = true;
   }

   if(has_buy && has_sell)
      return 2;
   if(has_buy)
      return 1;
   if(has_sell)
      return -1;

   return 0;
}

//+------------------------------------------------------------------+
//| Modify SL with broker result verification                        |
//+------------------------------------------------------------------+
bool ModifyPositionSL(ulong ticket, double new_sl, double current_tp)
{
   new_sl = NormalizeDouble(new_sl, _Digits);

   ResetLastError();

   bool modified = trade.PositionModify(ticket, new_sl, current_tp);

   if(!modified || !TradeResultSuccessful())
   {
      Print("SL MODIFY FAILED | Ticket=", ticket,
            " | SL=", DoubleToString(new_sl, _Digits),
            " | Retcode=", trade.ResultRetcode(),
            " | ", trade.ResultRetcodeDescription(),
            " | Error=", GetLastError());
      return false;
   }

   return true;
}

//+------------------------------------------------------------------+
//| Accepted CTrade results                                          |
//+------------------------------------------------------------------+
bool TradeResultSuccessful()
{
   uint retcode = trade.ResultRetcode();

   return (retcode == TRADE_RETCODE_DONE ||
           retcode == TRADE_RETCODE_DONE_PARTIAL ||
           retcode == TRADE_RETCODE_PLACED ||
           retcode == TRADE_RETCODE_NO_CHANGES);
}

//+------------------------------------------------------------------+
//| Prepare initial SL so it respects broker stop distance           |
//+------------------------------------------------------------------+
double PrepareInitialSL(long type,
                        double requested_sl,
                        double bid,
                        double ask)
{
   int minimum_points = GetMinimumStopDistancePoints();
   double minimum_distance = minimum_points * _Point;
   double adjusted_sl = requested_sl;

   if(type == POSITION_TYPE_BUY)
   {
      double maximum_allowed_sl = bid - minimum_distance;
      if(adjusted_sl > maximum_allowed_sl)
         adjusted_sl = maximum_allowed_sl;
   }
   else if(type == POSITION_TYPE_SELL)
   {
      double minimum_allowed_sl = ask + minimum_distance;
      if(adjusted_sl < minimum_allowed_sl)
         adjusted_sl = minimum_allowed_sl;
   }

   return NormalizeDouble(adjusted_sl, _Digits);
}

//+------------------------------------------------------------------+
//| Validate proposed SL                                             |
//+------------------------------------------------------------------+
bool IsSLValid(long type,
               double proposed_sl,
               double bid,
               double ask)
{
   double minimum_distance = GetMinimumStopDistancePoints() * _Point;

   if(type == POSITION_TYPE_BUY)
      return proposed_sl <= bid - minimum_distance;

   if(type == POSITION_TYPE_SELL)
      return proposed_sl >= ask + minimum_distance;

   return false;
}

//+------------------------------------------------------------------+
//| Broker stop/freeze distance                                      |
//+------------------------------------------------------------------+
int GetMinimumStopDistancePoints()
{
   int stops_level =
      (int)SymbolInfoInteger(_Symbol, SYMBOL_TRADE_STOPS_LEVEL);

   int freeze_level =
      (int)SymbolInfoInteger(_Symbol, SYMBOL_TRADE_FREEZE_LEVEL);

   int minimum_points = MathMax(stops_level, freeze_level) + 2;

   if(minimum_points < 2)
      minimum_points = 2;

   return minimum_points;
}

//+------------------------------------------------------------------+
//| Normalize lot size                                               |
//+------------------------------------------------------------------+
double NormalizeVolume(double requested_volume)
{
   double minimum_volume =
      SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MIN);

   double maximum_volume =
      SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_MAX);

   double volume_step =
      SymbolInfoDouble(_Symbol, SYMBOL_VOLUME_STEP);

   if(minimum_volume <= 0.0 ||
      maximum_volume <= 0.0 ||
      volume_step <= 0.0)
   {
      return 0.0;
   }

   double volume = requested_volume;

   if(volume < minimum_volume)
      volume = minimum_volume;

   if(volume > maximum_volume)
      volume = maximum_volume;

   volume = MathFloor(volume / volume_step + 0.0000001) * volume_step;

   if(volume < minimum_volume)
      volume = minimum_volume;

   return NormalizeDouble(volume, GetVolumeDigits(volume_step));
}

//+------------------------------------------------------------------+
//| Lot precision                                                    |
//+------------------------------------------------------------------+
int GetVolumeDigits(double volume_step)
{
   if(volume_step >= 1.0)
      return 0;
   if(volume_step >= 0.1)
      return 1;
   if(volume_step >= 0.01)
      return 2;
   if(volume_step >= 0.001)
      return 3;

   return 4;
}
//+------------------------------------------------------------------+
