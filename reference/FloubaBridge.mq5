//+------------------------------------------------------------------+
//|                                              FloubaBridge.mq5    |
//|                                         Flouba Elite Trade       |
//|                         https://elite-server.replit.app          |
//+------------------------------------------------------------------+
//
//  FLOUBA ELITE MT5 BRIDGE EA — Version 3.4.0
//
//  WHAT'S NEW IN v3.4:
//    • Bridge Position Management — local on-tick SL/TP management for all
//      BRIDGE_MAGIC positions, running at tick speed (no server round-trip).
//      Three layers applied in priority order each tick:
//        1. Breakeven: when profit ≥ Bridge_Breakeven_Trigger_USD, move SL to entry.
//        2. Trailing SL: when profit ≥ Bridge_Trail_SL_Trigger_USD, trail SL
//           Bridge_Trail_SL_Distance_USD behind current price.
//        3. Trailing TP: when profit ≥ Bridge_Trail_TP_Trigger_USD, keep TP
//           Bridge_Trail_TP_Distance_USD ahead of current price (only advances,
//           never retreats). Mirrors the Flouba Gold Server Python script logic.
//    • New input group "=== BRIDGE POSITION MANAGEMENT ===" with enable flags
//      and USD thresholds for each layer. All three default to values matching
//      the server-side config (trigger $2.00, distance $1.50 for TP).
//    • g_bridge_trade CTrade object handles all bridge position modifications
//      (separate from g_hft_trade).
//
//  WHAT'S NEW IN v3.3:
//    • Real trade history sync — detects newly closed deals via MT5 history API
//      and POSTs each one to /api/bridge/trade-history (idempotent; dealId key).
//    • OnTradeTransaction extended to set a pending-sync flag the moment any
//      position closes, so deals are uploaded within seconds regardless of
//      the History_Sync_Interval timer cycle.
//    • DealReasonToString() maps DEAL_REASON enum → human-readable close reason.
//    • Retry-safe: failed uploads are retried on the next timer cycle.
//      Duplicate deals are silently ignored (server returns 409).
//    • History_Sync_Interval input: controls how often the full scan runs (ticks).
//
//  WHAT'S NEW IN v3.2:
//    • Default Server_URL updated to https://elite-server.replit.app
//      (production endpoint — no manual URL entry required on first run).
//    • Version fields unified (#property version, EA_VERSION define, header).
//    • Heartbeat now includes live AccountInfoDouble() snapshot (balance, equity,
//      margin, free_margin, margin_level, currency, leverage) — server receives
//      account data on every 3-second poll without waiting for the account interval.
//    • LOGIN command — server can queue a LOGIN action that calls MT5's
//      LoginAccount() to switch or reconnect the account while the EA is running.
//
//  WHAT'S NEW IN v3.1:
//    • Multi-timeframe indicator push — PushIndicators() now locks M5 as the
//      primary signal timeframe and also sends M15 (trend/swing), M30
//      (confirmation), and H1 (structure) OHLC + indicators every cycle.
//    • chart_timeframe field — shows the user's chart period in the dashboard
//      without affecting strategy logic.  The bot always reads the correct
//      candles regardless of which chart the EA is attached to.
//    • BarTimeToISO() helper — shared by all TF timestamp fields.
//    • PeriodToString() helper — maps ENUM_TIMEFRAMES to a readable label.
//
//  WHAT'S NEW IN v3:
//    • HFT Local Mode — autonomous on-tick scalper that runs side-by-side
//      with the server bridge.  Enable with HFT_Enable = true.
//    • Velocity-burst entry — fires when price moves > HFT_BurstPoints in
//      one tick, filtered by EMA-50 trend direction.
//    • Basket TP — closes ALL HFT positions when their combined profit ≥
//      HFT_BasketTP_Pts (points).
//    • Auto Safety SL — any HFT position missing a stop loss gets one added
//      on the very next tick.
//    • Auto BreakEven — moves SL to entry + lock once profit ≥ trigger.
//    • Trailing Stop — trails after BreakEven activates.
//    • Lot Multiplication — optional martingale: multiply lot by
//      HFT_Lot_Multiplier after each consecutive loss, capped at
//      HFT_Max_Mult_Steps.  Resets on any win or basket close.
//    • Account Protection — equity floor (% of balance) and daily loss
//      limit.  HFT stops automatically when either is breached.
//
//  HOW THE TWO MODES COEXIST:
//    • Bridge trades (server commands) use magic 20240101.
//    • HFT local trades use HFT_Magic (default 202612).
//    • Risk management and basket TP only touch HFT_Magic positions.
//    • Bridge polling runs in OnTimer() — fully independent of OnTick().
//
//  SETUP (same as v2 + tick data):
//    1. Compile in MetaEditor (F7) — 0 errors expected.
//    2. Tools → Options → Expert Advisors → Allow WebRequest → add server URL.
//    3. Drag onto XAUUSD M1 chart.  Set Server_URL + Api_Key.
//    4. To enable HFT: set HFT_Enable = true and review HFT settings.
//    5. Enable "Allow live trading" in the EA dialog.
//
//+------------------------------------------------------------------+
#property copyright "Flouba Elite Trade"
#property version   "3.40"
#property strict

#include <Trade\Trade.mqh>

//+------------------------------------------------------------------+
//| ── BRIDGE SETTINGS ─────────────────────────────────────────────|
//+------------------------------------------------------------------+
input group "=== BRIDGE SETTINGS ==="
input string Server_URL          = "https://elite-server.replit.app"; // Server base URL (no trailing slash)
input string Api_Key             = "";                            // MT5_API_KEY from server .env
input string Symbol_Override     = "";                           // Leave blank to use chart symbol
input int    Timer_Seconds       = 3;                             // Poll interval in seconds (min: 2)
input int    Account_Interval    = 5;                             // Account push interval (ticks)
input int    Position_Interval   = 3;                             // Position push interval (ticks)
input int    Indicators_Interval = 5;                             // Indicator push interval (ticks)
input int    Http_Timeout        = 8000;                          // WebRequest timeout (ms)
input bool   Verbose_Logging     = false;                         // Print all HTTP responses
input int    History_Sync_Interval = 10;                          // Sync closed deals every N timer ticks (0 = disable)

//+------------------------------------------------------------------+
//| ── HFT LOCAL MODE ──────────────────────────────────────────────|
//+------------------------------------------------------------------+
input group "=== HFT LOCAL MODE ==="
input bool   HFT_Enable          = false;   // Enable autonomous on-tick HFT scalper
input double HFT_MicroLot        = 0.01;    // Base lot size per position
input int    HFT_MaxTrades       = 5;       // Max simultaneous HFT positions
input int    HFT_BurstPoints     = 15;      // Price velocity threshold to trigger entry (points)
input int    HFT_BasketTP_Pts    = 150;     // Close all HFT positions when combined profit ≥ this (points)
input int    HFT_Magic           = 202612;  // Magic number for HFT positions (must differ from bridge)

//+------------------------------------------------------------------+
//| ── HFT PROTECTION & POSITION MANAGEMENT ────────────────────────|
//+------------------------------------------------------------------+
input group "=== HFT PROTECTION & SL ==="
input int    HFT_StopLoss_Pts    = 300;    // Hard stop loss added to every HFT position (points)
input bool   HFT_UseBreakEven    = true;   // Activate auto BreakEven
input int    HFT_BE_Trigger      = 50;     // Profit in points to trigger BreakEven move
input int    HFT_BE_Lock         = 5;      // Lock SL this many points above entry (BUY) / below (SELL)
input int    HFT_TrailingDist    = 50;     // Trailing stop distance (points)
input int    HFT_MaxSpread       = 30;     // Skip entry if spread > this (points)

//+------------------------------------------------------------------+
//| ── HFT LOT MULTIPLICATION (MARTINGALE) ─────────────────────────|
//+------------------------------------------------------------------+
input group "=== HFT LOT MULTIPLICATION ==="
input bool   HFT_Multiply_Enable = false;  // Multiply lot after consecutive losses
input double HFT_Lot_Multiplier  = 1.5;    // Multiply factor per consecutive loss
input int    HFT_Max_Mult_Steps  = 4;      // Max multiplication steps before capping

//+------------------------------------------------------------------+
//| ── HFT ACCOUNT PROTECTION ──────────────────────────────────────|
//+------------------------------------------------------------------+
input group "=== HFT ACCOUNT PROTECTION ==="
input double HFT_Min_Equity_Pct  = 80.0;   // Stop HFT if equity falls below X% of balance (0 = off)
input double HFT_Max_Daily_Loss  = 10.0;   // Stop HFT if today's drawdown reaches X USD (0 = off)

//+------------------------------------------------------------------+
//| ── HFT TREND FILTER ────────────────────────────────────────────|
//+------------------------------------------------------------------+
input group "=== HFT TREND FILTER ==="
input int    HFT_MA_Period       = 50;     // EMA period; BUY only above EMA, SELL only below

//+------------------------------------------------------------------+
//| ── BRIDGE POSITION MANAGEMENT ──────────────────────────────────|
//+------------------------------------------------------------------+
input group "=== BRIDGE POSITION MANAGEMENT ==="
input bool   Bridge_Breakeven_Enable       = true;  // Move SL to entry when profit ≥ trigger
input double Bridge_Breakeven_Trigger_USD  = 0.50;  // USD profit to activate breakeven
input bool   Bridge_Trail_SL_Enable        = true;  // Trail SL behind price once profit ≥ trigger
input double Bridge_Trail_SL_Trigger_USD   = 1.00;  // USD profit to start trailing SL
input double Bridge_Trail_SL_Distance_USD  = 0.30;  // USD distance to keep SL behind price
input bool   Bridge_Trail_TP_Enable        = true;  // Chase TP ahead of price once profit ≥ trigger
input double Bridge_Trail_TP_Trigger_USD   = 2.00;  // USD profit to start trailing TP (0 = disable)
input double Bridge_Trail_TP_Distance_USD  = 1.50;  // USD distance to keep TP ahead of price

//+------------------------------------------------------------------+
//| CONSTANTS                                                        |
//+------------------------------------------------------------------+
#define EA_VERSION       "3.4.0"
#define BRIDGE_MAGIC     20240101

#define ROUTE_HEARTBEAT      "/api/bridge/heartbeat"
#define ROUTE_COMMANDS       "/api/bridge/commands"
#define ROUTE_RESULT         "/api/bridge/result"
#define ROUTE_ACCOUNT        "/api/bridge/account"
#define ROUTE_POSITIONS      "/api/bridge/positions"
#define ROUTE_INDICATORS     "/api/bridge/indicators"
#define ROUTE_TRADE_HISTORY  "/api/bridge/trade-history"

#define HISTORY_MAX_SENT     500   // max dealIds to remember in-memory (circular)

//+------------------------------------------------------------------+
//| GLOBAL STATE — Bridge                                            |
//+------------------------------------------------------------------+
int    g_timerCount       = 0;
bool   g_initialized      = false;
string g_headers          = "";
string g_symbol           = "";

//+------------------------------------------------------------------+
//| GLOBAL STATE — Trade History Sync                                |
//+------------------------------------------------------------------+
bool   g_historyPending   = false;   // true when a closing deal is detected
string g_sentDealIds[];              // circular buffer of dealIds already uploaded
int    g_sentDealCount    = 0;       // number of entries used in g_sentDealIds

//+------------------------------------------------------------------+
//| GLOBAL STATE — Bridge position management                        |
//+------------------------------------------------------------------+
CTrade g_bridge_trade;

//+------------------------------------------------------------------+
//| GLOBAL STATE — HFT                                               |
//+------------------------------------------------------------------+
CTrade g_hft_trade;
int    g_hft_ma_handle        = INVALID_HANDLE;
double g_hft_last_price       = 0;
int    g_hft_losses           = 0;    // consecutive HFT losses (for martingale)
double g_hft_day_start_bal    = 0;    // balance at start of day (for daily loss guard)
int    g_hft_last_day         = -1;   // used to detect day rollover

//+------------------------------------------------------------------+
//| OnInit                                                           |
//+------------------------------------------------------------------+
int OnInit()
  {
//--- Bridge validation
   if(StringLen(Server_URL) < 10)
     { Alert("FloubaBridge: Server_URL is not set."); return INIT_PARAMETERS_INCORRECT; }
   if(StringLen(Api_Key) < 16)
     { Alert("FloubaBridge: Api_Key is too short or not set."); return INIT_PARAMETERS_INCORRECT; }
   if(Timer_Seconds < 2)
     { Alert("FloubaBridge: Timer_Seconds must be at least 2."); return INIT_PARAMETERS_INCORRECT; }

   g_symbol  = (StringLen(Symbol_Override) > 0) ? Symbol_Override : Symbol();
   g_headers = "Content-Type: application/json\r\nX-Api-Key: " + Api_Key + "\r\n";

//--- HFT initialisation
   if(HFT_Enable)
     {
      if(HFT_Magic == BRIDGE_MAGIC)
        {
         Alert("FloubaBridge: HFT_Magic must differ from BRIDGE_MAGIC (" + IntegerToString(BRIDGE_MAGIC)
               + "). Change HFT_Magic and restart.");
         return INIT_PARAMETERS_INCORRECT;
        }
      g_hft_trade.SetExpertMagicNumber(HFT_Magic);
      g_hft_ma_handle = iMA(g_symbol, Period(), HFT_MA_Period, 0, MODE_EMA, PRICE_CLOSE);
      if(g_hft_ma_handle == INVALID_HANDLE)
        { Alert("FloubaBridge: Failed to create EMA handle for HFT."); return INIT_FAILED; }
      g_hft_last_price    = SymbolInfoDouble(g_symbol, SYMBOL_BID);
      g_hft_day_start_bal = AccountInfoDouble(ACCOUNT_BALANCE);
      MqlDateTime dt; TimeToStruct(TimeCurrent(), dt);
      g_hft_last_day      = dt.day;
      Print("FloubaBridge HFT mode ENABLED."
            + " BaseLot=" + DoubleToString(HFT_MicroLot, 2)
            + " MaxTrades=" + IntegerToString(HFT_MaxTrades)
            + " Martingale=" + (HFT_Multiply_Enable ? "ON" : "OFF"));
     }

   EventSetTimer(Timer_Seconds);
   g_initialized = true;

   Print("FloubaBridge v" + EA_VERSION + " initialized."
         + " Server=" + Server_URL
         + " Symbol=" + g_symbol
         + " HFT=" + (HFT_Enable ? "ON" : "OFF"));

   SendHeartbeat();
   return INIT_SUCCEEDED;
  }

//+------------------------------------------------------------------+
//| OnDeinit                                                         |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
   if(g_hft_ma_handle != INVALID_HANDLE)
     { IndicatorRelease(g_hft_ma_handle); g_hft_ma_handle = INVALID_HANDLE; }
   Print("FloubaBridge deinitialized. Reason: " + IntegerToString(reason));
  }

//+------------------------------------------------------------------+
//| OnTimer — bridge polling loop (unchanged from v2)               |
//+------------------------------------------------------------------+
void OnTimer()
  {
   if(!g_initialized) return;

   g_timerCount++;

   SendHeartbeat();
   PollCommands();

   if(Account_Interval > 0 && g_timerCount % Account_Interval == 0)
      PushAccount();

   if(Position_Interval > 0 && g_timerCount % Position_Interval == 0)
      PushPositions();

   if(Indicators_Interval > 0 && g_timerCount % Indicators_Interval == 0)
      PushIndicators();

   // Day-rollover check for HFT daily loss guard (every 20 timer ticks)
   if(HFT_Enable && g_timerCount % 20 == 0)
      HFT_CheckDayRollover();

   // Trade history sync — runs every History_Sync_Interval ticks, or immediately
   // when g_historyPending is true (set by OnTradeTransaction on any close event).
   if(History_Sync_Interval > 0)
     {
      bool due = (g_timerCount % History_Sync_Interval == 0);
      if(due || g_historyPending)
         SyncTradeHistory();
     }

   if(g_timerCount >= 28800) g_timerCount = 0;
  }

//+------------------------------------------------------------------+
//| OnTick — position management + HFT scalper entry point         |
//+------------------------------------------------------------------+
void OnTick()
  {
   if(!g_initialized) return;

   // Bridge position management runs on every tick for all BRIDGE_MAGIC positions
   if(Bridge_Breakeven_Enable || Bridge_Trail_SL_Enable || Bridge_Trail_TP_Enable)
      Bridge_ManagePositions();

   if(HFT_Enable)
      HFT_OnTick();
  }

//+------------------------------------------------------------------+
//| OnTradeTransaction — detect HFT position closes for martingale  |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest     &,
                        const MqlTradeResult      &)
  {
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD) return;
   if(!HistoryDealSelect(trans.deal)) return;

   long entry = HistoryDealGetInteger(trans.deal, DEAL_ENTRY);

   // ── Trade history: flag any closing deal for upload ────────────────────────
   if(entry == DEAL_ENTRY_OUT)
      g_historyPending = true;

   // ── HFT martingale: only cares about HFT-magic closing deals ──────────────
   if(!HFT_Enable || !HFT_Multiply_Enable) return;

   long magic = HistoryDealGetInteger(trans.deal, DEAL_MAGIC);
   if(magic != HFT_Magic) return;
   if(entry != DEAL_ENTRY_OUT) return;  // only closing deals count

   double profit = HistoryDealGetDouble(trans.deal, DEAL_PROFIT)
                 + HistoryDealGetDouble(trans.deal, DEAL_SWAP)
                 + HistoryDealGetDouble(trans.deal, DEAL_COMMISSION);

   if(profit >= 0)
     {
      if(Verbose_Logging || g_hft_losses > 0)
         Print("HFT: WIN — streak reset (was " + IntegerToString(g_hft_losses) + " losses)");
      g_hft_losses = 0;
     }
   else
     {
      g_hft_losses++;
      Print("HFT: LOSS — consecutive losses=" + IntegerToString(g_hft_losses)
            + "  next lot=" + DoubleToString(HFT_CalcLot(), 2));
     }
  }

//+------------------------------------------------------------------+
//|                                                                  |
//|  BRIDGE POSITION MANAGEMENT                                      |
//|                                                                  |
//+------------------------------------------------------------------+

//+------------------------------------------------------------------+
//| Bridge_ManagePositions — on-tick SL/TP manager for bridge trades|
//|                                                                  |
//| Priority order (one modification max per position per tick):    |
//|   1. Breakeven  — profit ≥ trigger → move SL to open price     |
//|   2. Trailing SL — profit ≥ trigger → trail SL behind price    |
//|   3. Trailing TP — profit ≥ trigger → chase TP ahead of price  |
//|                                                                  |
//| Only BRIDGE_MAGIC positions are touched.                        |
//+------------------------------------------------------------------+
void Bridge_ManagePositions()
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      if(PositionGetSymbol(i) == "") continue;
      if(PositionGetInteger(POSITION_MAGIC) != (long)BRIDGE_MAGIC) continue;

      ulong  ticket    = PositionGetTicket(i);
      string sym       = PositionGetString(POSITION_SYMBOL);
      long   ptype     = PositionGetInteger(POSITION_TYPE);
      double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
      double curPrice  = PositionGetDouble(POSITION_PRICE_CURRENT);
      double curSL     = PositionGetDouble(POSITION_SL);
      double curTP     = PositionGetDouble(POSITION_TP);
      double profit    = PositionGetDouble(POSITION_PROFIT);
      double point     = SymbolInfoDouble(sym, SYMBOL_POINT);

      bool   isBuy     = (ptype == POSITION_TYPE_BUY);
      double newSL     = curSL;
      double newTP     = curTP;
      bool   modify    = false;

      // ── 1. Breakeven ────────────────────────────────────────────────────────
      if(Bridge_Breakeven_Enable && profit >= Bridge_Breakeven_Trigger_USD)
        {
         double beSL = NormalizeDouble(openPrice, _Digits);
         if(isBuy && (curSL == 0 || beSL > curSL + point))
           { newSL = beSL; modify = true; }
         else if(!isBuy && (curSL == 0 || beSL < curSL - point))
           { newSL = beSL; modify = true; }

         if(modify)
           {
            if(g_bridge_trade.PositionModify(ticket, newSL, newTP))
               Print("Bridge BE: ticket=" + IntegerToString((long)ticket)
                     + " SL→" + DoubleToString(newSL, _Digits)
                     + " profit=$" + DoubleToString(profit, 2));
            else
               Print("Bridge BE FAILED: ticket=" + IntegerToString((long)ticket)
                     + " err=" + IntegerToString(GetLastError()));
            continue; // one modification per tick
           }
        }

      // ── 2. Trailing SL ──────────────────────────────────────────────────────
      if(Bridge_Trail_SL_Enable && profit >= Bridge_Trail_SL_Trigger_USD)
        {
         double trailSL = isBuy
                          ? NormalizeDouble(curPrice - Bridge_Trail_SL_Distance_USD, _Digits)
                          : NormalizeDouble(curPrice + Bridge_Trail_SL_Distance_USD, _Digits);

         bool slNeeded = isBuy
                         ? (trailSL > curSL + point)
                         : (curSL == 0 || trailSL < curSL - point);

         if(slNeeded)
           {
            if(g_bridge_trade.PositionModify(ticket, trailSL, newTP))
               Print("Bridge TrailSL: ticket=" + IntegerToString((long)ticket)
                     + " SL→" + DoubleToString(trailSL, _Digits)
                     + " profit=$" + DoubleToString(profit, 2));
            else
               Print("Bridge TrailSL FAILED: ticket=" + IntegerToString((long)ticket)
                     + " err=" + IntegerToString(GetLastError()));
            continue; // one modification per tick
           }
        }

      // ── 3. Trailing TP ──────────────────────────────────────────────────────
      // Mirrors the Flouba Gold Server Python script:
      //   BUY:  TP = currentPrice + distance  (only if new TP > current TP)
      //   SELL: TP = currentPrice - distance  (only if new TP < current TP)
      if(Bridge_Trail_TP_Enable && Bridge_Trail_TP_Trigger_USD > 0
         && profit >= Bridge_Trail_TP_Trigger_USD)
        {
         double trailTP = isBuy
                          ? NormalizeDouble(curPrice + Bridge_Trail_TP_Distance_USD, _Digits)
                          : NormalizeDouble(curPrice - Bridge_Trail_TP_Distance_USD, _Digits);

         bool tpNeeded = isBuy
                         ? (curTP == 0 || trailTP > curTP + point)
                         : (curTP == 0 || trailTP < curTP - point);

         if(tpNeeded)
           {
            if(g_bridge_trade.PositionModify(ticket, newSL, trailTP))
               Print("Bridge TrailTP: ticket=" + IntegerToString((long)ticket)
                     + " TP→" + DoubleToString(trailTP, _Digits)
                     + " profit=$" + DoubleToString(profit, 2));
            else
               Print("Bridge TrailTP FAILED: ticket=" + IntegerToString((long)ticket)
                     + " err=" + IntegerToString(GetLastError()));
           }
        }
     }
  }

//+------------------------------------------------------------------+
//|                                                                  |
//|  HFT FUNCTIONS                                                   |
//|                                                                  |
//+------------------------------------------------------------------+

//+------------------------------------------------------------------+
//| HFT_OnTick — main scalper logic called on every price tick      |
//+------------------------------------------------------------------+
void HFT_OnTick()
  {
   double bid = SymbolInfoDouble(g_symbol, SYMBOL_BID);
   double ask = SymbolInfoDouble(g_symbol, SYMBOL_ASK);

   // 1. Spread guard — skip if spread is too wide
   double spread_pts = (ask - bid) / _Point;
   if(spread_pts > HFT_MaxSpread)
     {
      g_hft_last_price = bid;  // update so we don't fire on next tick
      return;
     }

   // 2. Account protection gate
   if(!HFT_AccountOK()) return;

   // 3. Manage existing HFT positions (safety SL, BreakEven, Trailing)
   HFT_ManageRisk(bid, ask);

   // 4. Basket TP check
   HFT_CheckBasketTP(bid, ask);

   // 5. Trend filter — need EMA value
   if(g_hft_ma_handle == INVALID_HANDLE) { g_hft_last_price = bid; return; }
   double ma_buf[];
   ArraySetAsSeries(ma_buf, true);
   if(CopyBuffer(g_hft_ma_handle, 0, 0, 1, ma_buf) < 1) { g_hft_last_price = bid; return; }
   double ma_val = ma_buf[0];

   // 6. Velocity-based entry
   double velocity = bid - g_hft_last_price;
   int    count    = HFT_CountPositions();
   double lot      = HFT_CalcLot();

   // BUY: burst UP and price is above EMA (uptrend)
   if(velocity > HFT_BurstPoints * _Point && bid > ma_val && count < HFT_MaxTrades)
     {
      double sl = NormalizeDouble(bid - HFT_StopLoss_Pts * _Point, _Digits);
      if(g_hft_trade.Buy(lot, g_symbol, ask, sl, 0, "Flouba-HFT-Buy"))
         Print("HFT BUY  lot=" + DoubleToString(lot, 2)
               + " ask=" + DoubleToString(ask, 5)
               + " sl="  + DoubleToString(sl, 5)
               + " streak=" + IntegerToString(g_hft_losses));
      else
         Print("HFT BUY failed. err=" + IntegerToString(GetLastError()));
     }
   // SELL: burst DOWN and price is below EMA (downtrend)
   else if(velocity < -HFT_BurstPoints * _Point && bid < ma_val && count < HFT_MaxTrades)
     {
      double sl = NormalizeDouble(ask + HFT_StopLoss_Pts * _Point, _Digits);
      if(g_hft_trade.Sell(lot, g_symbol, bid, sl, 0, "Flouba-HFT-Sell"))
         Print("HFT SELL lot=" + DoubleToString(lot, 2)
               + " bid=" + DoubleToString(bid, 5)
               + " sl="  + DoubleToString(sl, 5)
               + " streak=" + IntegerToString(g_hft_losses));
      else
         Print("HFT SELL failed. err=" + IntegerToString(GetLastError()));
     }

   g_hft_last_price = bid;
  }

//+------------------------------------------------------------------+
//| HFT_ManageRisk — safety SL + BreakEven + Trailing Stop         |
//+------------------------------------------------------------------+
void HFT_ManageRisk(double bid, double ask)
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      if(PositionGetSymbol(i) != g_symbol)                        continue;
      if(PositionGetInteger(POSITION_MAGIC) != (long)HFT_Magic)   continue;

      ulong  ticket = PositionGetTicket(i);
      double sl     = PositionGetDouble(POSITION_SL);
      double open   = PositionGetDouble(POSITION_PRICE_OPEN);
      long   ptype  = PositionGetInteger(POSITION_TYPE);

      //--- A. Safety SL: add immediately if missing
      if(sl == 0)
        {
         double newSL = (ptype == POSITION_TYPE_BUY)
                        ? bid - HFT_StopLoss_Pts * _Point
                        : ask + HFT_StopLoss_Pts * _Point;
         g_hft_trade.PositionModify(ticket, NormalizeDouble(newSL, _Digits), 0);
         Print("HFT: Safety SL added. ticket=" + IntegerToString((int)ticket));
         continue;
        }

      //--- B. BreakEven
      if(HFT_UseBreakEven)
        {
         if(ptype == POSITION_TYPE_BUY)
           {
            // Price has moved up enough and SL is still below entry+lock
            if(bid > open + HFT_BE_Trigger * _Point && sl < open + HFT_BE_Lock * _Point)
              {
               double newSL = NormalizeDouble(open + HFT_BE_Lock * _Point, _Digits);
               g_hft_trade.PositionModify(ticket, newSL, 0);
               Print("HFT: BreakEven BUY. ticket=" + IntegerToString((int)ticket)
                     + " newSL=" + DoubleToString(newSL, 5));
              }
           }
         else // SELL
           {
            // Price has moved down enough and SL is still above entry-lock
            if(ask < open - HFT_BE_Trigger * _Point && sl > open - HFT_BE_Lock * _Point)
              {
               double newSL = NormalizeDouble(open - HFT_BE_Lock * _Point, _Digits);
               g_hft_trade.PositionModify(ticket, newSL, 0);
               Print("HFT: BreakEven SELL. ticket=" + IntegerToString((int)ticket)
                     + " newSL=" + DoubleToString(newSL, 5));
              }
           }
        }

      //--- C. Trailing Stop (only trails once price is beyond TrailingDist from open)
      if(ptype == POSITION_TYPE_BUY)
        {
         if(bid > open + HFT_TrailingDist * _Point)
           {
            double newSL = NormalizeDouble(bid - HFT_TrailingDist * _Point, _Digits);
            if(newSL > sl + 10 * _Point)
               g_hft_trade.PositionModify(ticket, newSL, 0);
           }
        }
      else
        {
         if(ask < open - HFT_TrailingDist * _Point)
           {
            double newSL = NormalizeDouble(ask + HFT_TrailingDist * _Point, _Digits);
            if(sl == 0 || newSL < sl - 10 * _Point)
               g_hft_trade.PositionModify(ticket, newSL, 0);
           }
        }
     }
  }

//+------------------------------------------------------------------+
//| HFT_CheckBasketTP — close all HFT positions on combined profit  |
//+------------------------------------------------------------------+
void HFT_CheckBasketTP(double bid, double ask)
  {
   double total_pts = 0;
   int    count     = 0;

   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      if(PositionGetSymbol(i) != g_symbol)                       continue;
      if(PositionGetInteger(POSITION_MAGIC) != (long)HFT_Magic)  continue;

      double open_price = PositionGetDouble(POSITION_PRICE_OPEN);
      if(PositionGetInteger(POSITION_TYPE) == POSITION_TYPE_BUY)
         total_pts += (bid - open_price) / _Point;
      else
         total_pts += (open_price - ask) / _Point;
      count++;
     }

   if(count > 0 && total_pts >= HFT_BasketTP_Pts)
     {
      Print("HFT: Basket TP reached " + DoubleToString(total_pts, 0) + " pts across "
            + IntegerToString(count) + " position(s). Closing all.");
      HFT_CloseAllPositions();
      g_hft_losses = 0;  // basket win resets the martingale streak
     }
  }

//+------------------------------------------------------------------+
//| HFT_CloseAllPositions — close all HFT-magic positions           |
//+------------------------------------------------------------------+
void HFT_CloseAllPositions()
  {
   for(int i = PositionsTotal() - 1; i >= 0; i--)
     {
      if(PositionGetSymbol(i) == g_symbol && PositionGetInteger(POSITION_MAGIC) == (long)HFT_Magic)
         g_hft_trade.PositionClose(PositionGetTicket(i));
     }
  }

//+------------------------------------------------------------------+
//| HFT_CountPositions — count open HFT positions on g_symbol       |
//+------------------------------------------------------------------+
int HFT_CountPositions()
  {
   int count = 0;
   for(int i = 0; i < PositionsTotal(); i++)
     {
      if(PositionGetSymbol(i) == g_symbol && PositionGetInteger(POSITION_MAGIC) == (long)HFT_Magic)
         count++;
     }
   return count;
  }

//+------------------------------------------------------------------+
//| HFT_CalcLot — martingale lot sizing based on loss streak        |
//+------------------------------------------------------------------+
double HFT_CalcLot()
  {
   double lot = HFT_MicroLot;

   if(HFT_Multiply_Enable && g_hft_losses > 0)
     {
      int steps = MathMin(g_hft_losses, HFT_Max_Mult_Steps);
      lot = HFT_MicroLot * MathPow(HFT_Lot_Multiplier, steps);
     }

   // Always normalize to broker's lot step/min/max (all paths)
   double step    = SymbolInfoDouble(g_symbol, SYMBOL_VOLUME_STEP);
   double min_lot = SymbolInfoDouble(g_symbol, SYMBOL_VOLUME_MIN);
   double max_lot = SymbolInfoDouble(g_symbol, SYMBOL_VOLUME_MAX);
   if(step > 0) lot = MathFloor(lot / step) * step;
   lot = MathMax(lot, min_lot);
   lot = MathMin(lot, max_lot);

   // Derive decimal precision from lot step (e.g. 0.01 → 2, 0.001 → 3)
   int precision = 2;
   if(step > 0 && step < 1)
     {
      string stepStr = DoubleToString(step, 8);
      int dotPos = StringFind(stepStr, ".");
      if(dotPos >= 0)
        {
         // Trim trailing zeros
         int last = StringLen(stepStr) - 1;
         while(last > dotPos && StringSubstr(stepStr, last, 1) == "0") last--;
         precision = last - dotPos;
        }
     }

   return NormalizeDouble(lot, precision);
  }

//+------------------------------------------------------------------+
//| HFT_AccountOK — equity floor and daily loss guard               |
//+------------------------------------------------------------------+
bool HFT_AccountOK()
  {
   double balance = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity  = AccountInfoDouble(ACCOUNT_EQUITY);

   // Equity floor: block HFT if equity < balance × Min_Equity_Pct%
   if(HFT_Min_Equity_Pct > 0 && balance > 0)
     {
      double floor = balance * HFT_Min_Equity_Pct / 100.0;
      if(equity < floor)
        {
         Print("HFT BLOCKED: equity " + DoubleToString(equity, 2)
               + " < floor " + DoubleToString(floor, 2)
               + " (" + DoubleToString(HFT_Min_Equity_Pct, 0) + "% of balance)");
         return false;
        }
     }

   // Daily loss limit: block HFT if day's drawdown ≥ limit
   if(HFT_Max_Daily_Loss > 0 && g_hft_day_start_bal > 0)
     {
      double daily_pnl = equity - g_hft_day_start_bal;
      if(daily_pnl <= -HFT_Max_Daily_Loss)
        {
         Print("HFT BLOCKED: daily loss " + DoubleToString(MathAbs(daily_pnl), 2)
               + " USD ≥ limit " + DoubleToString(HFT_Max_Daily_Loss, 2) + " USD");
         return false;
        }
     }

   return true;
  }

//+------------------------------------------------------------------+
//| HFT_CheckDayRollover — reset day-start balance at midnight UTC  |
//+------------------------------------------------------------------+
void HFT_CheckDayRollover()
  {
   MqlDateTime dt;
   TimeToStruct(TimeCurrent(), dt);
   if(dt.day != g_hft_last_day)
     {
      g_hft_day_start_bal = AccountInfoDouble(ACCOUNT_BALANCE);
      g_hft_last_day      = dt.day;
      Print("HFT: New trading day. Start balance=" + DoubleToString(g_hft_day_start_bal, 2));
     }
  }


//+------------------------------------------------------------------+
//|                                                                  |
//|  BRIDGE FUNCTIONS (unchanged from v2)                            |
//|                                                                  |
//+------------------------------------------------------------------+

//+------------------------------------------------------------------+
//| HEARTBEAT — POST /api/bridge/heartbeat                           |
//+------------------------------------------------------------------+
void SendHeartbeat()
  {
   // Live account snapshot — sent with every heartbeat so the server stays
   // current between the slower account-push interval cycles.
   double bal   = AccountInfoDouble(ACCOUNT_BALANCE);
   double eq    = AccountInfoDouble(ACCOUNT_EQUITY);
   double mar   = AccountInfoDouble(ACCOUNT_MARGIN);
   double fmar  = AccountInfoDouble(ACCOUNT_FREEMARGIN);
   double mlvl  = AccountInfoDouble(ACCOUNT_MARGIN_LEVEL);
   string cur   = AccountInfoString(ACCOUNT_CURRENCY);
   int    lev   = (int)AccountInfoInteger(ACCOUNT_LEVERAGE);

   string json = "{"
                 "\"ea_version\":\"" + EA_VERSION + "\","
                 "\"mt5_build\":\"" + IntegerToString((int)TerminalInfoInteger(TERMINAL_BUILD)) + "\","
                 "\"broker\":\"" + EscapeJson(AccountInfoString(ACCOUNT_COMPANY)) + "\","
                 "\"account_number\":" + IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN)) + ","
                 "\"balance\":"      + DoubleToString(bal,  2) + ","
                 "\"equity\":"       + DoubleToString(eq,   2) + ","
                 "\"margin\":"       + DoubleToString(mar,  2) + ","
                 "\"free_margin\":"  + DoubleToString(fmar, 2) + ","
                 "\"margin_level\":" + DoubleToString(mlvl, 2) + ","
                 "\"currency\":\""   + EscapeJson(cur) + "\","
                 "\"leverage\":"     + IntegerToString(lev)
                 + "}";

   string response;
   int status = WebPost(ROUTE_HEARTBEAT, json, response);

   if(Verbose_Logging && status == 200)
      Print("Heartbeat OK");
   else if(status != 200)
      Print("Heartbeat failed. HTTP " + IntegerToString(status));
  }

//+------------------------------------------------------------------+
//| POLL COMMANDS — GET /api/bridge/commands                         |
//+------------------------------------------------------------------+
void PollCommands()
  {
   string response;
   int status = WebGet(ROUTE_COMMANDS, response);

   if(status != 200)
     {
      if(Verbose_Logging)
         Print("PollCommands failed. HTTP " + IntegerToString(status));
      return;
     }

   int count = (int)JsonGetDouble(response, "count");
   if(count <= 0) return;

   Print("Received " + IntegerToString(count) + " command(s) from server");

   string arrayContent = JsonGetArray(response, "commands");
   if(StringLen(arrayContent) == 0) return;

   int searchPos = 0;
   for(int i = 0; i < count; i++)
     {
      string cmdObj = ExtractNextObject(arrayContent, searchPos);
      if(StringLen(cmdObj) == 0) break;

      string cmdId   = JsonGetString(cmdObj, "id");
      string action  = JsonGetString(cmdObj, "action");
      string symbol  = JsonGetString(cmdObj, "symbol");
      double lot     = JsonGetDouble(cmdObj, "lot");
      double sl      = JsonGetDouble(cmdObj, "sl");
      double tp      = JsonGetDouble(cmdObj, "tp");
      int    ticket  = (int)JsonGetDouble(cmdObj, "ticket");
      string comment = JsonGetString(cmdObj, "comment");
      // LOGIN command fields
      long   login_account  = (long)JsonGetDouble(cmdObj, "account_number");
      string login_password = JsonGetString(cmdObj, "password");
      string login_server   = JsonGetString(cmdObj, "server_name");

      if(StringLen(cmdId) == 0 || StringLen(action) == 0)
        {
         Print("Skipping malformed command: " + cmdObj);
         continue;
        }

      Print("Executing [" + cmdId + "] action=" + action + " symbol=" + symbol);
      ExecuteCommand(cmdId, action, symbol, lot, sl, tp, ticket, comment,
                     login_account, login_password, login_server);
     }
  }

//+------------------------------------------------------------------+
//| EXECUTE COMMAND — dispatch to correct trade function             |
//+------------------------------------------------------------------+
void ExecuteCommand(string cmdId, string action, string symbol,
                    double lot, double sl, double tp,
                    int ticket, string comment,
                    long login_account = 0, string login_password = "", string login_server = "")
  {
   if(action == "BUY")
      ExecuteBuy(cmdId, symbol, lot, sl, tp, comment);
   else if(action == "SELL")
      ExecuteSell(cmdId, symbol, lot, sl, tp, comment);
   else if(action == "CLOSE")
      ExecuteClose(cmdId, ticket);
   else if(action == "CLOSE_ALL")
      ExecuteCloseAll(cmdId);
   else if(action == "MODIFY")
      ExecuteModify(cmdId, ticket, sl, tp);
   else if(action == "LOGIN")
      ExecuteLogin(cmdId, login_account, login_password, login_server);
   else
      Print("Unknown action: " + action + " for command " + cmdId);
  }

//+------------------------------------------------------------------+
//| LOGIN — switch/reconnect MT5 account via LoginAccount()          |
//+------------------------------------------------------------------+
void ExecuteLogin(string cmdId, long account, string password, string server)
  {
   if(account <= 0)
     {
      Print("LOGIN failed: account_number required");
      PostResult(cmdId, false, 0, 0, 0, 0, -1, "account_number required");
      return;
     }

   Print("LOGIN: account=" + IntegerToString((int)account)
         + " server=" + (StringLen(server) > 0 ? server : "(current)"));

   // LoginAccount() — MQL5 built-in available since terminal build 600.
   // This EA targets build 5836+ so the call is valid.
   // Signature: bool LoginAccount(long login, string password="", string server="")
   // An empty server string keeps the current broker server.
   if(LoginAccount(account, password, server))
     {
      Print("LOGIN success. Now logged into account "
            + IntegerToString((int)AccountInfoInteger(ACCOUNT_LOGIN)));
      PostResult(cmdId, true, 0, 0, 0, 0, 0, "");
     }
   else
     {
      int err = GetLastError();
      Print("LOGIN failed. MT5 error=" + IntegerToString(err));
      PostResult(cmdId, false, 0, 0, 0, 0, err, "LoginAccount() failed — check credentials");
     }
  }

//+------------------------------------------------------------------+
//| BUY — open a long position (bridge command)                     |
//+------------------------------------------------------------------+
void ExecuteBuy(string cmdId, string symbol, double lot,
                double sl, double tp, string comment)
  {
   if(StringLen(symbol) == 0) symbol = g_symbol;
   if(lot <= 0) lot = 0.01;

   MqlTradeRequest request = {};
   MqlTradeResult  result  = {};

   request.action       = TRADE_ACTION_DEAL;
   request.symbol       = symbol;
   request.volume       = lot;
   request.type         = ORDER_TYPE_BUY;
   request.price        = SymbolInfoDouble(symbol, SYMBOL_ASK);
   request.deviation    = 10;
   request.magic        = BRIDGE_MAGIC;
   request.comment      = StringLen(comment) > 0 ? comment : "FloubaBridge BUY";
   request.type_filling = ORDER_FILLING_IOC;

   if(sl > 0) request.sl = sl;
   if(tp > 0) request.tp = tp;

   bool sent = OrderSend(request, result);

   if(sent && result.retcode == TRADE_RETCODE_DONE)
     {
      Print("BUY executed. Ticket=" + IntegerToString((int)result.order)
            + " Price=" + DoubleToString(result.price, 5));
      PostResult(cmdId, true, (int)result.order, result.price, 0, 0, 0, "");
     }
   else
     {
      Print("BUY failed. Code=" + IntegerToString((int)result.retcode) + " " + result.comment);
      PostResult(cmdId, false, 0, 0, 0, 0, (int)result.retcode, result.comment);
     }
  }

//+------------------------------------------------------------------+
//| SELL — open a short position (bridge command)                   |
//+------------------------------------------------------------------+
void ExecuteSell(string cmdId, string symbol, double lot,
                 double sl, double tp, string comment)
  {
   if(StringLen(symbol) == 0) symbol = g_symbol;
   if(lot <= 0) lot = 0.01;

   MqlTradeRequest request = {};
   MqlTradeResult  result  = {};

   request.action       = TRADE_ACTION_DEAL;
   request.symbol       = symbol;
   request.volume       = lot;
   request.type         = ORDER_TYPE_SELL;
   request.price        = SymbolInfoDouble(symbol, SYMBOL_BID);
   request.deviation    = 10;
   request.magic        = BRIDGE_MAGIC;
   request.comment      = StringLen(comment) > 0 ? comment : "FloubaBridge SELL";
   request.type_filling = ORDER_FILLING_IOC;

   if(sl > 0) request.sl = sl;
   if(tp > 0) request.tp = tp;

   bool sent = OrderSend(request, result);

   if(sent && result.retcode == TRADE_RETCODE_DONE)
     {
      Print("SELL executed. Ticket=" + IntegerToString((int)result.order)
            + " Price=" + DoubleToString(result.price, 5));
      PostResult(cmdId, true, (int)result.order, result.price, 0, 0, 0, "");
     }
   else
     {
      Print("SELL failed. Code=" + IntegerToString((int)result.retcode) + " " + result.comment);
      PostResult(cmdId, false, 0, 0, 0, 0, (int)result.retcode, result.comment);
     }
  }

//+------------------------------------------------------------------+
//| CLOSE — close a specific position by ticket (bridge command)    |
//+------------------------------------------------------------------+
void ExecuteClose(string cmdId, int ticket)
  {
   if(ticket <= 0)
     {
      Print("CLOSE failed: ticket required");
      PostResult(cmdId, false, 0, 0, 0, 0, -1, "Ticket not provided");
      return;
     }

   if(!PositionSelectByTicket((ulong)ticket))
     {
      Print("CLOSE failed: position " + IntegerToString(ticket) + " not found");
      PostResult(cmdId, false, 0, 0, 0, 0, -2, "Position not found");
      return;
     }

   string sym    = PositionGetString(POSITION_SYMBOL);
   double volume = PositionGetDouble(POSITION_VOLUME);
   double profit = PositionGetDouble(POSITION_PROFIT);
   long   ptype  = PositionGetInteger(POSITION_TYPE);

   MqlTradeRequest request = {};
   MqlTradeResult  result  = {};

   request.action       = TRADE_ACTION_DEAL;
   request.symbol       = sym;
   request.volume       = volume;
   request.type         = (ptype == POSITION_TYPE_BUY) ? ORDER_TYPE_SELL : ORDER_TYPE_BUY;
   request.price        = (ptype == POSITION_TYPE_BUY)
                          ? SymbolInfoDouble(sym, SYMBOL_BID)
                          : SymbolInfoDouble(sym, SYMBOL_ASK);
   request.position     = (ulong)ticket;
   request.deviation    = 10;
   request.magic        = BRIDGE_MAGIC;
   request.comment      = "FloubaBridge CLOSE";
   request.type_filling = ORDER_FILLING_IOC;

   bool sent = OrderSend(request, result);

   if(sent && result.retcode == TRADE_RETCODE_DONE)
     {
      Print("CLOSE executed. Ticket=" + IntegerToString(ticket));
      PostResult(cmdId, true, ticket, 0, result.price, profit, 0, "");
     }
   else
     {
      Print("CLOSE failed. Code=" + IntegerToString((int)result.retcode));
      PostResult(cmdId, false, ticket, 0, 0, 0, (int)result.retcode, result.comment);
     }
  }

//+------------------------------------------------------------------+
//| CLOSE ALL — close every open position (bridge command)          |
//+------------------------------------------------------------------+
void ExecuteCloseAll(string cmdId)
  {
   int total     = PositionsTotal();
   int closed    = 0;
   int failCount = 0;

   Print("CLOSE_ALL: closing " + IntegerToString(total) + " position(s)");

   for(int i = total - 1; i >= 0; i--)
     {
      ulong pos_ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(pos_ticket)) continue;

      string sym    = PositionGetString(POSITION_SYMBOL);
      double volume = PositionGetDouble(POSITION_VOLUME);
      long   ptype  = PositionGetInteger(POSITION_TYPE);

      MqlTradeRequest request = {};
      MqlTradeResult  result  = {};

      request.action       = TRADE_ACTION_DEAL;
      request.symbol       = sym;
      request.volume       = volume;
      request.type         = (ptype == POSITION_TYPE_BUY) ? ORDER_TYPE_SELL : ORDER_TYPE_BUY;
      request.price        = (ptype == POSITION_TYPE_BUY)
                             ? SymbolInfoDouble(sym, SYMBOL_BID)
                             : SymbolInfoDouble(sym, SYMBOL_ASK);
      request.position     = pos_ticket;
      request.deviation    = 30;
      request.magic        = BRIDGE_MAGIC;
      request.comment      = "FloubaBridge CLOSE_ALL";
      request.type_filling = ORDER_FILLING_IOC;

      bool sent = OrderSend(request, result);
      if(sent && result.retcode == TRADE_RETCODE_DONE)
         closed++;
      else
        {
         failCount++;
         Print("Failed to close ticket " + IntegerToString((int)pos_ticket)
               + " code=" + IntegerToString((int)result.retcode));
        }
     }

   bool   allClosed = (failCount == 0);
   string msg = "Closed " + IntegerToString(closed) + "/" + IntegerToString(total)
                + " position(s). Failures: " + IntegerToString(failCount);
   Print("CLOSE_ALL result: " + msg);
   PostResult(cmdId, allClosed, 0, 0, 0, 0, failCount, msg);
  }

//+------------------------------------------------------------------+
//| MODIFY — adjust SL / TP on an existing position (bridge command)|
//+------------------------------------------------------------------+
void ExecuteModify(string cmdId, int ticket, double new_sl, double new_tp)
  {
   if(ticket <= 0)
     {
      Print("MODIFY failed: ticket required");
      PostResult(cmdId, false, 0, 0, 0, 0, -1, "Ticket not provided");
      return;
     }

   if(!PositionSelectByTicket((ulong)ticket))
     {
      Print("MODIFY failed: position " + IntegerToString(ticket) + " not found");
      PostResult(cmdId, false, ticket, 0, 0, 0, -2, "Position not found");
      return;
     }

   string sym    = PositionGetString(POSITION_SYMBOL);
   double cur_sl = PositionGetDouble(POSITION_SL);
   double cur_tp = PositionGetDouble(POSITION_TP);

   double apply_sl = (new_sl > 0) ? new_sl : cur_sl;
   double apply_tp = (new_tp > 0) ? new_tp : cur_tp;

   if(MathAbs(apply_sl - cur_sl) < SymbolInfoDouble(sym, SYMBOL_POINT)
      && MathAbs(apply_tp - cur_tp) < SymbolInfoDouble(sym, SYMBOL_POINT))
     {
      if(Verbose_Logging)
         Print("MODIFY no-op: SL/TP unchanged for ticket " + IntegerToString(ticket));
      PostResult(cmdId, true, ticket, 0, 0, 0, 0, "No change needed");
      return;
     }

   MqlTradeRequest request = {};
   MqlTradeResult  result  = {};

   request.action   = TRADE_ACTION_SLTP;
   request.symbol   = sym;
   request.position = (ulong)ticket;
   request.sl       = apply_sl;
   request.tp       = apply_tp;

   bool sent = OrderSend(request, result);

   if(sent && result.retcode == TRADE_RETCODE_DONE)
     {
      Print("MODIFY executed. Ticket=" + IntegerToString(ticket)
            + " SL=" + DoubleToString(apply_sl, 5)
            + " TP=" + DoubleToString(apply_tp, 5));
      PostResult(cmdId, true, ticket, 0, 0, 0, 0, "");
     }
   else
     {
      Print("MODIFY failed. Code=" + IntegerToString((int)result.retcode) + " " + result.comment);
      PostResult(cmdId, false, ticket, 0, 0, 0, (int)result.retcode, result.comment);
     }
  }

//+------------------------------------------------------------------+
//| PUSH ACCOUNT — POST /api/bridge/account                          |
//+------------------------------------------------------------------+
void PushAccount()
  {
   double balance     = AccountInfoDouble(ACCOUNT_BALANCE);
   double equity      = AccountInfoDouble(ACCOUNT_EQUITY);
   double margin      = AccountInfoDouble(ACCOUNT_MARGIN);
   double freeMargin  = AccountInfoDouble(ACCOUNT_FREEMARGIN);
   double marginLevel = AccountInfoDouble(ACCOUNT_MARGIN_LEVEL);
   string currency    = AccountInfoString(ACCOUNT_CURRENCY);
   int    leverage    = (int)AccountInfoInteger(ACCOUNT_LEVERAGE);
   string server      = AccountInfoString(ACCOUNT_SERVER);
   string name        = AccountInfoString(ACCOUNT_NAME);

   string json = "{"
                 "\"balance\":"      + DoubleToString(balance, 2)     + ","
                 "\"equity\":"       + DoubleToString(equity, 2)      + ","
                 "\"margin\":"       + DoubleToString(margin, 2)      + ","
                 "\"free_margin\":"  + DoubleToString(freeMargin, 2)  + ","
                 "\"margin_level\":" + DoubleToString(marginLevel, 2) + ","
                 "\"currency\":\""   + EscapeJson(currency)           + "\","
                 "\"leverage\":"     + IntegerToString(leverage)      + ","
                 "\"server\":\""     + EscapeJson(server)             + "\","
                 "\"name\":\""       + EscapeJson(name)               + "\""
                 "}";

   string response;
   int status = WebPost(ROUTE_ACCOUNT, json, response);
   if(Verbose_Logging) Print("PushAccount HTTP " + IntegerToString(status));
  }

//+------------------------------------------------------------------+
//| PUSH POSITIONS — POST /api/bridge/positions                      |
//+------------------------------------------------------------------+
void PushPositions()
  {
   int total = PositionsTotal();
   string posArray = "[";

   for(int i = 0; i < total; i++)
     {
      ulong pos_ticket = PositionGetTicket(i);
      if(!PositionSelectByTicket(pos_ticket)) continue;

      string symbol       = PositionGetString(POSITION_SYMBOL);
      long   ptype        = PositionGetInteger(POSITION_TYPE);
      double volume       = PositionGetDouble(POSITION_VOLUME);
      double openPrice    = PositionGetDouble(POSITION_PRICE_OPEN);
      double currentPrice = PositionGetDouble(POSITION_PRICE_CURRENT);
      double sl           = PositionGetDouble(POSITION_SL);
      double tp           = PositionGetDouble(POSITION_TP);
      double profit       = PositionGetDouble(POSITION_PROFIT);
      datetime openTime   = (datetime)PositionGetInteger(POSITION_TIME);
      string comment      = PositionGetString(POSITION_COMMENT);
      long   magic        = PositionGetInteger(POSITION_MAGIC);

      string posType = (ptype == POSITION_TYPE_BUY) ? "BUY" : "SELL";
      string source  = (magic == (long)HFT_Magic) ? "HFT" : "bridge";

      if(i > 0) posArray += ",";

      posArray += "{"
                  "\"ticket\":"        + IntegerToString((int)pos_ticket)              + ","
                  "\"symbol\":\""      + EscapeJson(symbol)                            + "\","
                  "\"type\":\""        + posType                                       + "\","
                  "\"lot\":"           + DoubleToString(volume, 2)                     + ","
                  "\"open_price\":"    + DoubleToString(openPrice, 5)                  + ","
                  "\"current_price\":" + DoubleToString(currentPrice, 5)               + ","
                  "\"sl\":"            + DoubleToString(sl, 5)                         + ","
                  "\"tp\":"            + DoubleToString(tp, 5)                         + ","
                  "\"profit\":"        + DoubleToString(profit, 2)                     + ","
                  "\"open_time\":\""   + TimeToString(openTime, TIME_DATE|TIME_SECONDS) + "\","
                  "\"comment\":\""     + EscapeJson(comment)                           + "\","
                  "\"source\":\""      + source                                        + "\""
                  "}";
     }

   posArray += "]";

   string response;
   int status = WebPost(ROUTE_POSITIONS, "{\"positions\":" + posArray + "}", response);
   if(Verbose_Logging)
      Print("PushPositions HTTP " + IntegerToString(status) + " count=" + IntegerToString(total));
  }

//+------------------------------------------------------------------+
//| PUSH INDICATORS — POST /api/bridge/indicators (v3.1)            |
//|  Sends M5 (primary signal), M15 (trend), M30 (confirmation),    |
//|  and H1 (structure) — independent of the chart timeframe.       |
//+------------------------------------------------------------------+
void PushIndicators()
  {
   string sym = g_symbol;

   double bid   = SymbolInfoDouble(sym, SYMBOL_BID);
   double ask   = SymbolInfoDouble(sym, SYMBOL_ASK);
   double point = SymbolInfoDouble(sym, SYMBOL_POINT);
   double spread_pips = (ask - bid) / (point * 10.0);

   // ── M5 — Primary signal timeframe ──────────────────────────────────────────
   double o5 = iOpen(sym, PERIOD_M5, 1);
   double h5 = iHigh(sym, PERIOD_M5, 1);
   double l5 = iLow(sym, PERIOD_M5, 1);
   double c5 = iClose(sym, PERIOD_M5, 1);

   if(o5 == 0 || h5 == 0 || l5 == 0 || c5 == 0)
     { Print("PushIndicators: M5 OHLC not available yet"); return; }

   // ADX(14) M5
   int adxH = iADX(sym, PERIOD_M5, 14);
   double adxB[]; ArraySetAsSeries(adxB, true);
   if(CopyBuffer(adxH, 0, 1, 1, adxB) <= 0)
     { Print("PushIndicators: M5 ADX error"); IndicatorRelease(adxH); return; }
   double adx_14 = adxB[0];
   IndicatorRelease(adxH);

   // ATR(14) M5
   int atrH = iATR(sym, PERIOD_M5, 14);
   double atrB[]; ArraySetAsSeries(atrB, true);
   if(CopyBuffer(atrH, 0, 1, 1, atrB) <= 0)
     { Print("PushIndicators: M5 ATR error"); IndicatorRelease(atrH); return; }
   double atr_14 = atrB[0];
   IndicatorRelease(atrH);

   // ATR 20-bar average M5
   int atrAH = iATR(sym, PERIOD_M5, 14);
   double atrAB[]; ArraySetAsSeries(atrAB, true);
   double atr_avg_20 = 0;
   if(CopyBuffer(atrAH, 0, 1, 20, atrAB) == 20)
     { for(int i = 0; i < 20; i++) atr_avg_20 += atrAB[i]; atr_avg_20 /= 20.0; }
   IndicatorRelease(atrAH);

   // EMA(20) M5
   int e20H = iMA(sym, PERIOD_M5, 20, 0, MODE_EMA, PRICE_CLOSE);
   double e20B[]; ArraySetAsSeries(e20B, true);
   if(CopyBuffer(e20H, 0, 1, 1, e20B) <= 0)
     { Print("PushIndicators: M5 EMA20 error"); IndicatorRelease(e20H); return; }
   double ema_20 = e20B[0];
   IndicatorRelease(e20H);

   // EMA(50) M5
   int e50H = iMA(sym, PERIOD_M5, 50, 0, MODE_EMA, PRICE_CLOSE);
   double e50B[]; ArraySetAsSeries(e50B, true);
   if(CopyBuffer(e50H, 0, 1, 1, e50B) <= 0)
     { Print("PushIndicators: M5 EMA50 error"); IndicatorRelease(e50H); return; }
   double ema_50 = e50B[0];
   IndicatorRelease(e50H);

   // RSI(14) M5
   int rsiH = iRSI(sym, PERIOD_M5, 14, PRICE_CLOSE);
   double rsiB[]; ArraySetAsSeries(rsiB, true);
   if(CopyBuffer(rsiH, 0, 1, 1, rsiB) <= 0)
     { Print("PushIndicators: M5 RSI error"); IndicatorRelease(rsiH); return; }
   double rsi_14 = rsiB[0];
   IndicatorRelease(rsiH);

   // 20-candle high/low M5
   double candle_20_high = 0, candle_20_low = 999999;
   for(int i = 1; i <= 20; i++)
     {
      double bh = iHigh(sym, PERIOD_M5, i);
      double bl = iLow(sym, PERIOD_M5, i);
      if(bh > candle_20_high) candle_20_high = bh;
      if(bl < candle_20_low)  candle_20_low  = bl;
     }

   string ts_m5 = BarTimeToISO(iTime(sym, PERIOD_M5, 1));

   // ── M15 — Trend / Swing analysis timeframe ─────────────────────────────────
   double o15 = iOpen(sym, PERIOD_M15, 1);
   double h15 = iHigh(sym, PERIOD_M15, 1);
   double l15 = iLow(sym, PERIOD_M15, 1);
   double c15 = iClose(sym, PERIOD_M15, 1);
   string ts_m15 = BarTimeToISO(iTime(sym, PERIOD_M15, 1));
   bool m15_ok = (o15 > 0 && c15 > 0);

   double m15_adx = 0, m15_atr = 0, m15_rsi = 0;
   double m15_e20 = 0, m15_e50 = 0, m15_e6 = 0, m15_e25 = 0, m15_e200 = 0;

   if(m15_ok)
     {
      int indH; double b15[];

      indH = iADX(sym, PERIOD_M15, 14);
      ArraySetAsSeries(b15, true);
      if(CopyBuffer(indH, 0, 1, 1, b15) > 0) m15_adx = b15[0];
      IndicatorRelease(indH);

      ArrayResize(b15, 0);
      indH = iATR(sym, PERIOD_M15, 14);
      ArraySetAsSeries(b15, true);
      if(CopyBuffer(indH, 0, 1, 1, b15) > 0) m15_atr = b15[0];
      IndicatorRelease(indH);

      ArrayResize(b15, 0);
      indH = iRSI(sym, PERIOD_M15, 14, PRICE_CLOSE);
      ArraySetAsSeries(b15, true);
      if(CopyBuffer(indH, 0, 1, 1, b15) > 0) m15_rsi = b15[0];
      IndicatorRelease(indH);

      ArrayResize(b15, 0);
      indH = iMA(sym, PERIOD_M15, 20, 0, MODE_EMA, PRICE_CLOSE);
      ArraySetAsSeries(b15, true);
      if(CopyBuffer(indH, 0, 1, 1, b15) > 0) m15_e20 = b15[0];
      IndicatorRelease(indH);

      ArrayResize(b15, 0);
      indH = iMA(sym, PERIOD_M15, 50, 0, MODE_EMA, PRICE_CLOSE);
      ArraySetAsSeries(b15, true);
      if(CopyBuffer(indH, 0, 1, 1, b15) > 0) m15_e50 = b15[0];
      IndicatorRelease(indH);

      ArrayResize(b15, 0);
      indH = iMA(sym, PERIOD_M15, 6, 0, MODE_EMA, PRICE_CLOSE);
      ArraySetAsSeries(b15, true);
      if(CopyBuffer(indH, 0, 1, 1, b15) > 0) m15_e6 = b15[0];
      IndicatorRelease(indH);

      ArrayResize(b15, 0);
      indH = iMA(sym, PERIOD_M15, 25, 0, MODE_EMA, PRICE_CLOSE);
      ArraySetAsSeries(b15, true);
      if(CopyBuffer(indH, 0, 1, 1, b15) > 0) m15_e25 = b15[0];
      IndicatorRelease(indH);

      ArrayResize(b15, 0);
      indH = iMA(sym, PERIOD_M15, 200, 0, MODE_EMA, PRICE_CLOSE);
      ArraySetAsSeries(b15, true);
      if(CopyBuffer(indH, 0, 1, 1, b15) > 0) m15_e200 = b15[0];
      IndicatorRelease(indH);
     }

   // ── M30 — Optional confirmation timeframe ──────────────────────────────────
   double o30 = iOpen(sym, PERIOD_M30, 1);
   double h30 = iHigh(sym, PERIOD_M30, 1);
   double l30 = iLow(sym, PERIOD_M30, 1);
   double c30 = iClose(sym, PERIOD_M30, 1);
   string ts_m30 = BarTimeToISO(iTime(sym, PERIOD_M30, 1));

   // ── H1 — Higher-timeframe structure ────────────────────────────────────────
   double o_h1 = iOpen(sym, PERIOD_H1, 1);
   double h_h1 = iHigh(sym, PERIOD_H1, 1);
   double l_h1 = iLow(sym, PERIOD_H1, 1);
   double c_h1 = iClose(sym, PERIOD_H1, 1);
   string ts_h1 = BarTimeToISO(iTime(sym, PERIOD_H1, 1));

   // ── Asian session range (00:00–08:00 UTC) from H1 bars ─────────────────────
   double asian_high = 0, asian_low = 999999;
   bool   has_asian  = false;
   datetime now_utc = TimeCurrent();
   MqlDateTime dt_struct;
   TimeToStruct(now_utc, dt_struct);
   dt_struct.hour = 0; dt_struct.min = 0; dt_struct.sec = 0;
   datetime today_open_utc  = StructToTime(dt_struct);
   datetime asian_close_utc = today_open_utc + 8 * 3600;

   for(int b = 0; b < 50; b++)
     {
      datetime bt = iTime(sym, PERIOD_H1, b);
      if(bt < today_open_utc) break;
      if(bt >= asian_close_utc) continue;
      double bh = iHigh(sym, PERIOD_H1, b);
      double bl = iLow(sym, PERIOD_H1, b);
      if(bh > asian_high) asian_high = bh;
      if(bl < asian_low)  asian_low  = bl;
      has_asian = true;
     }

   // ── Chart timeframe label (informational — does not affect strategy logic) ──
   string chart_tf = PeriodToString(Period());

   // ── Build JSON ─────────────────────────────────────────────────────────────
   string json = "{"
                 "\"symbol\":\""          + EscapeJson(sym)                + "\","
                 "\"timeframe\":\"M5\","
                 "\"signal_timeframe\":\"M5\","
                 "\"chart_timeframe\":\""  + chart_tf                      + "\","
                 "\"timestamp\":\""        + ts_m5                         + "\","
                 "\"bid\":"               + DoubleToString(bid, 5)         + ","
                 "\"ask\":"               + DoubleToString(ask, 5)         + ","
                 "\"spread_pips\":"       + DoubleToString(spread_pips, 2) + ","
                 "\"open\":"              + DoubleToString(o5, 5)          + ","
                 "\"high\":"              + DoubleToString(h5, 5)          + ","
                 "\"low\":"               + DoubleToString(l5, 5)          + ","
                 "\"close\":"             + DoubleToString(c5, 5)          + ","
                 "\"adx_14\":"            + DoubleToString(adx_14, 4)      + ","
                 "\"atr_14\":"            + DoubleToString(atr_14, 5)      + ","
                 "\"ema_20\":"            + DoubleToString(ema_20, 5)      + ","
                 "\"ema_50\":"            + DoubleToString(ema_50, 5)      + ","
                 "\"rsi_14\":"            + DoubleToString(rsi_14, 4)      + ","
                 "\"atr_avg_20\":"        + DoubleToString(atr_avg_20, 5)  + ","
                 "\"candle_20_high\":"    + DoubleToString(candle_20_high, 5) + ","
                 "\"candle_20_low\":"     + DoubleToString(candle_20_low, 5);

   if(m15_ok)
     {
      json += ",\"m15_open\":"      + DoubleToString(o15, 5)
             + ",\"m15_high\":"     + DoubleToString(h15, 5)
             + ",\"m15_low\":"      + DoubleToString(l15, 5)
             + ",\"m15_close\":"    + DoubleToString(c15, 5)
             + ",\"m15_timestamp\":\"" + ts_m15 + "\""
             + ",\"m15_adx_14\":"  + DoubleToString(m15_adx, 4)
             + ",\"m15_atr_14\":"  + DoubleToString(m15_atr, 5)
             + ",\"m15_ema_20\":"  + DoubleToString(m15_e20, 5)
             + ",\"m15_ema_50\":"  + DoubleToString(m15_e50, 5)
             + ",\"m15_rsi_14\":"  + DoubleToString(m15_rsi, 4);
      if(m15_e6 > 0)
         json += ",\"m15_ema_6\":"   + DoubleToString(m15_e6, 5)
                + ",\"m15_ema_25\":"  + DoubleToString(m15_e25, 5)
                + ",\"ema_6\":" + DoubleToString(m15_e6, 5)
                + ",\"ema_25\":" + DoubleToString(m15_e25, 5);
      if(m15_e200 > 0)
         json += ",\"m15_ema_200\":" + DoubleToString(m15_e200, 5)
                + ",\"ema_200\":" + DoubleToString(m15_e200, 5);
     }

   if(o30 > 0)
      json += ",\"m30_open\":"      + DoubleToString(o30, 5)
             + ",\"m30_high\":"     + DoubleToString(h30, 5)
             + ",\"m30_low\":"      + DoubleToString(l30, 5)
             + ",\"m30_close\":"    + DoubleToString(c30, 5)
             + ",\"m30_timestamp\":\"" + ts_m30 + "\"";

   if(o_h1 > 0)
      json += ",\"h1_open\":"       + DoubleToString(o_h1, 5)
             + ",\"h1_high\":"      + DoubleToString(h_h1, 5)
             + ",\"h1_low\":"       + DoubleToString(l_h1, 5)
             + ",\"h1_close\":"     + DoubleToString(c_h1, 5)
             + ",\"h1_timestamp\":\"" + ts_h1 + "\"";

   if(has_asian && asian_high > asian_low)
      json += ",\"asian_session_high\":" + DoubleToString(asian_high, 5)
             + ",\"asian_session_low\":"  + DoubleToString(asian_low, 5);

   json += "}";

   string response;
   int status = WebPost(ROUTE_INDICATORS, json, response);

   if(status == 200)
     {
      if(Verbose_Logging)
         Print("PushIndicators OK — Chart=" + chart_tf
               + " M5 ADX=" + DoubleToString(adx_14, 1)
               + " M5 ATR=" + DoubleToString(atr_14, 4)
               + " M15 EMA20=" + DoubleToString(m15_e20, 2)
               + " M15 ADX=" + DoubleToString(m15_adx, 1));
     }
   else
      Print("PushIndicators failed. HTTP " + IntegerToString(status) + " " + response);
  }

//+------------------------------------------------------------------+
//| BarTimeToISO — convert bar open time to ISO 8601 string         |
//+------------------------------------------------------------------+
string BarTimeToISO(datetime t)
  {
   string ts = TimeToString(t, TIME_DATE|TIME_SECONDS);
   StringReplace(ts, ".", "-");
   int sp = StringFind(ts, " ");
   if(sp > 0)
      ts = StringSubstr(ts, 0, sp) + "T" + StringSubstr(ts, sp + 1) + "Z";
   return ts;
  }

//+------------------------------------------------------------------+
//| PeriodToString — map ENUM_TIMEFRAMES to readable string         |
//+------------------------------------------------------------------+
string PeriodToString(ENUM_TIMEFRAMES tf)
  {
   if(tf == PERIOD_M1)  return "M1";
   if(tf == PERIOD_M5)  return "M5";
   if(tf == PERIOD_M15) return "M15";
   if(tf == PERIOD_M30) return "M30";
   if(tf == PERIOD_H1)  return "H1";
   if(tf == PERIOD_H4)  return "H4";
   if(tf == PERIOD_D1)  return "D1";
   return IntegerToString((int)tf) + "min";
  }
//+------------------------------------------------------------------+
//| POST RESULT — POST /api/bridge/result                            |
//+------------------------------------------------------------------+
void PostResult(string cmdId, bool success,
                int ticket, double openPrice, double closePrice, double profit,
                int errCode, string errDesc)
  {
   string json = "{"
                 "\"command_id\":\""  + cmdId                        + "\","
                 "\"success\":"       + (success ? "true" : "false") + ",";

   if(ticket > 0)    json += "\"ticket\":"       + IntegerToString(ticket)       + ",";
   if(openPrice > 0) json += "\"open_price\":"   + DoubleToString(openPrice, 5)  + ",";
   if(closePrice > 0) json += "\"close_price\":" + DoubleToString(closePrice, 5) + ",";
   if(profit != 0)   json += "\"profit\":"       + DoubleToString(profit, 2)     + ",";
   if(errCode != 0)
      json += "\"mt5_error_code\":"  + IntegerToString(errCode)   + ","
              "\"mt5_error_desc\":\"" + EscapeJson(errDesc)        + "\",";

   if(StringSubstr(json, StringLen(json) - 1, 1) == ",")
      json = StringSubstr(json, 0, StringLen(json) - 1);

   json += "}";

   string response;
   int status = WebPost(ROUTE_RESULT, json, response);

   if(status != 200)
      Print("PostResult failed. HTTP " + IntegerToString(status) + " " + response);
   else if(Verbose_Logging)
      Print("PostResult OK for command " + cmdId);
  }


//+------------------------------------------------------------------+
//|                                                                  |
//|  TRADE HISTORY SYNC (v3.3)                                       |
//|                                                                  |
//+------------------------------------------------------------------+

//+------------------------------------------------------------------+
//| IsDealSent — check if a dealId is already in the sent buffer    |
//+------------------------------------------------------------------+
bool IsDealSent(string dealId)
  {
   for(int i = 0; i < g_sentDealCount; i++)
      if(g_sentDealIds[i] == dealId) return true;
   return false;
  }

//+------------------------------------------------------------------+
//| MarkDealSent — add a dealId to the circular sent buffer         |
//+------------------------------------------------------------------+
void MarkDealSent(string dealId)
  {
   if(g_sentDealCount < HISTORY_MAX_SENT)
     {
      ArrayResize(g_sentDealIds, g_sentDealCount + 1);
      g_sentDealIds[g_sentDealCount] = dealId;
      g_sentDealCount++;
     }
   else
     {
      // Circular: overwrite oldest entry (index 0 → shift left)
      ArrayCopy(g_sentDealIds, g_sentDealIds, 0, 1, HISTORY_MAX_SENT - 1);
      g_sentDealIds[HISTORY_MAX_SENT - 1] = dealId;
     }
  }

//+------------------------------------------------------------------+
//| DealReasonToString — map DEAL_REASON enum to close reason string|
//+------------------------------------------------------------------+
string DealReasonToString(long reason, string comment)
  {
   if(reason == DEAL_REASON_SL)     return "STOP_LOSS";
   if(reason == DEAL_REASON_TP)     return "TAKE_PROFIT";
   // Expert or client close — inspect comment for known patterns
   string lc = comment;
   StringToLower(lc);
   if(StringFind(lc, "trail")    >= 0) return "TRAILING_STOP";
   if(StringFind(lc, "breakeven") >= 0 ||
      StringFind(lc, "break even") >= 0 ||
      StringFind(lc, "be ")       >= 0) return "BREAK_EVEN";
   if(StringFind(lc, "daily target") >= 0 ||
      StringFind(lc, "target")    >= 0) return "DAILY_TARGET";
   if(StringFind(lc, "risk")      >= 0 ||
      StringFind(lc, "protection") >= 0) return "RISK_PROTECTION";
   if(StringFind(lc, "partial")   >= 0) return "PARTIAL_CLOSE";
   if(reason == DEAL_REASON_EXPERT)     return "MANUAL_CLOSE";
   return "MANUAL_CLOSE";
  }

//+------------------------------------------------------------------+
//| SyncTradeHistory — scan recent deals and upload new ones        |
//+------------------------------------------------------------------+
void SyncTradeHistory()
  {
   g_historyPending = false;

   // Scan the last 48 hours to catch any deals missed during EA downtime
   datetime from = TimeCurrent() - 172800;
   if(!HistorySelect(from, TimeCurrent())) return;

   int total = HistoryDealsTotal();
   if(total <= 0) return;

   string accId  = IntegerToString(AccountInfoInteger(ACCOUNT_LOGIN));
   string broker = EscapeJson(AccountInfoString(ACCOUNT_COMPANY));
   string srv    = EscapeJson(AccountInfoString(ACCOUNT_SERVER));

   for(int i = 0; i < total; i++)
     {
      ulong dealTicket = HistoryDealGetTicket(i);
      if(dealTicket == 0) continue;

      // Only process closing (OUT) deals
      long entry = HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
      if(entry != DEAL_ENTRY_OUT) continue;

      string dealId = IntegerToString((long)dealTicket);
      if(IsDealSent(dealId)) continue;

      // ── Read deal fields ───────────────────────────────────────────────────
      string sym      = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
      long   dealType = HistoryDealGetInteger(dealTicket, DEAL_TYPE);
      double volume   = HistoryDealGetDouble(dealTicket, DEAL_VOLUME);
      double exitPx   = HistoryDealGetDouble(dealTicket, DEAL_PRICE);
      double sl       = HistoryDealGetDouble(dealTicket, DEAL_SL);
      double tp       = HistoryDealGetDouble(dealTicket, DEAL_TP);
      datetime closeT = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
      double gross    = HistoryDealGetDouble(dealTicket, DEAL_PROFIT);
      double comm     = HistoryDealGetDouble(dealTicket, DEAL_COMMISSION);
      double swap     = HistoryDealGetDouble(dealTicket, DEAL_SWAP);
      string comment  = EscapeJson(HistoryDealGetString(dealTicket, DEAL_COMMENT));
      long   magic    = HistoryDealGetInteger(dealTicket, DEAL_MAGIC);
      long   posId    = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
      long   ordTkt   = HistoryDealGetInteger(dealTicket, DEAL_ORDER);
      long   dreason  = HistoryDealGetInteger(dealTicket, DEAL_REASON);

      // Direction: closing deal type is opposite to original position type
      string direction = (dealType == DEAL_TYPE_SELL) ? "BUY" : "SELL";

      // ── Find entry price from the IN deal ──────────────────────────────────
      double entryPx = 0;
      datetime openT  = 0;
      if(posId > 0 && HistorySelectByPosition((ulong)posId))
        {
         int pcnt = HistoryDealsTotal();
         for(int j = 0; j < pcnt; j++)
           {
            ulong d2 = HistoryDealGetTicket(j);
            if(d2 == 0) continue;
            if(HistoryDealGetInteger(d2, DEAL_ENTRY) == DEAL_ENTRY_IN)
              {
               entryPx = HistoryDealGetDouble(d2, DEAL_PRICE);
               openT   = (datetime)HistoryDealGetInteger(d2, DEAL_TIME);
               break;
              }
           }
         // Restore the full 48-hour window after HistorySelectByPosition
         HistorySelect(from, TimeCurrent());
        }

      // ── Derived fields ─────────────────────────────────────────────────────
      string closeReason = DealReasonToString(dreason, comment);
      double netProfit   = gross + comm + swap;

      string strategy = "";
      if(magic == (long)HFT_Magic)
         strategy = "HFT Scalper";
      else if(StringFind(comment, "FloubaBridge") >= 0 || magic == (long)BRIDGE_MAGIC)
         strategy = "bridge_trade";
      else if(StringLen(comment) > 0)
         strategy = comment;

      // ── Build JSON payload ─────────────────────────────────────────────────
      string json = "{"
                    "\"ticket\":\""     + IntegerToString(ordTkt)         + "\","
                    "\"dealId\":\""     + dealId                          + "\","
                    "\"positionId\":\"" + IntegerToString(posId)          + "\","
                    "\"accountId\":\""  + accId                           + "\","
                    "\"broker\":\""     + broker                          + "\","
                    "\"server\":\""     + srv                             + "\","
                    "\"symbol\":\""     + EscapeJson(sym)                 + "\","
                    "\"direction\":\""  + direction                       + "\","
                    "\"volume\":"       + DoubleToString(volume, 4)       + ","
                    "\"exitPrice\":"    + DoubleToString(exitPx, 5)       + ","
                    "\"closeTime\":\"" + BarTimeToISO(closeT)             + "\","
                    "\"grossProfit\":"  + DoubleToString(gross, 2)        + ","
                    "\"commission\":"   + DoubleToString(comm, 2)         + ","
                    "\"swap\":"         + DoubleToString(swap, 2)         + ","
                    "\"netProfit\":"    + DoubleToString(netProfit, 2)    + ","
                    "\"closeReason\":\"" + closeReason                    + "\","
                    "\"magicNumber\":"  + IntegerToString(magic);

      if(entryPx > 0)
         json += ",\"entryPrice\":"  + DoubleToString(entryPx, 5);
      if(openT > 0)
         json += ",\"openTime\":\""  + BarTimeToISO(openT) + "\"";
      if(sl > 0)
         json += ",\"stopLoss\":"    + DoubleToString(sl, 5);
      if(tp > 0)
         json += ",\"takeProfit\":"  + DoubleToString(tp, 5);
      if(StringLen(strategy) > 0)
         json += ",\"strategy\":\"" + EscapeJson(strategy) + "\"";

      json += "}";

      // ── Send to server ─────────────────────────────────────────────────────
      string response;
      int status = WebPost(ROUTE_TRADE_HISTORY, json, response);

      if(status == 200)
        {
         MarkDealSent(dealId);
         Print("Closed deal sent to Flouba Elite history."
               + " DealId=" + dealId
               + " Symbol=" + sym
               + " Dir=" + direction
               + " Net=" + DoubleToString(netProfit, 2));
        }
      else if(status == 409)
        {
         // Server already has this deal — mark as sent to stop retrying
         MarkDealSent(dealId);
         Print("Duplicate deal ignored. DealId=" + dealId);
        }
      else if(status <= 0 || status == 0)
        {
         // Network error — do NOT mark as sent; will retry next cycle
         Print("Trade history sync failed — retry queued."
               + " DealId=" + dealId
               + " HTTP=" + IntegerToString(status));
        }
      else if(status >= 400 && status < 500)
        {
         // 4xx client error (400/401/403) — data invalid; mark as sent to stop retrying
         MarkDealSent(dealId);
         Print("Trade history rejected by server (client error)."
               + " DealId=" + dealId
               + " HTTP=" + IntegerToString(status)
               + " " + response);
        }
      else
        {
         // 5xx server error — do NOT mark as sent; retry on next cycle
         Print("Trade history server error — retry queued."
               + " DealId=" + dealId
               + " HTTP=" + IntegerToString(status));
        }
     }
  }

//+------------------------------------------------------------------+
//|                                                                  |
//|  HTTP HELPERS                                                    |
//|                                                                  |
//+------------------------------------------------------------------+

int WebPost(string route, string jsonBody, string &response)
  {
   string url = Server_URL + route;
   uchar  postData[], resultData[];
   string resultHeaders;

   int len = StringToCharArray(jsonBody, postData, 0, WHOLE_ARRAY, CP_UTF8);
   if(len > 0) ArrayResize(postData, len - 1);

   int status = WebRequest("POST", url, g_headers, Http_Timeout, postData, resultData, resultHeaders);

   response = (ArraySize(resultData) > 0)
              ? CharArrayToString(resultData, 0, WHOLE_ARRAY, CP_UTF8) : "";

   if(status < 0)
     {
      Print("WebPost error " + IntegerToString(GetLastError()) + " for " + url
            + ". Check Tools→Options→Expert Advisors→Allowed URLs.");
      return -1;
     }
   return status;
  }

int WebGet(string route, string &response)
  {
   string url = Server_URL + route;
   uchar  postData[], resultData[];
   string resultHeaders;

   int status = WebRequest("GET", url, g_headers, Http_Timeout, postData, resultData, resultHeaders);

   response = (ArraySize(resultData) > 0)
              ? CharArrayToString(resultData, 0, WHOLE_ARRAY, CP_UTF8) : "";

   if(status < 0)
     { Print("WebGet error " + IntegerToString(GetLastError()) + " for " + url); return -1; }
   return status;
  }


//+------------------------------------------------------------------+
//|                                                                  |
//|  JSON HELPERS                                                    |
//|                                                                  |
//+------------------------------------------------------------------+

string JsonGetString(string json, string key)
  {
   string search = "\"" + key + "\":\"";
   int pos = StringFind(json, search);
   if(pos < 0) return "";
   pos += StringLen(search);
   int end = StringFind(json, "\"", pos);
   if(end < 0) return "";
   return StringSubstr(json, pos, end - pos);
  }

double JsonGetDouble(string json, string key)
  {
   string search = "\"" + key + "\":";
   int pos = StringFind(json, search);
   if(pos < 0) return 0;
   pos += StringLen(search);
   while(pos < StringLen(json) && StringSubstr(json, pos, 1) == " ") pos++;
   if(StringSubstr(json, pos, 4) == "null") return 0;
   int end = pos;
   while(end < StringLen(json))
     {
      string c = StringSubstr(json, end, 1);
      if(c == "," || c == "}" || c == "]" || c == " ") break;
      end++;
     }
   return StringToDouble(StringSubstr(json, pos, end - pos));
  }

bool JsonGetBool(string json, string key)
  {
   string search = "\"" + key + "\":";
   int pos = StringFind(json, search);
   if(pos < 0) return false;
   pos += StringLen(search);
   while(pos < StringLen(json) && StringSubstr(json, pos, 1) == " ") pos++;
   return StringSubstr(json, pos, 4) == "true";
  }

string JsonGetArray(string json, string key)
  {
   string search = "\"" + key + "\":[";
   int pos = StringFind(json, search);
   if(pos < 0) return "";
   pos += StringLen(search);
   int depth = 1, i = pos;
   while(i < StringLen(json) && depth > 0)
     {
      string c = StringSubstr(json, i, 1);
      if(c == "[") depth++;
      else if(c == "]") depth--;
      if(depth > 0) i++;
     }
   return StringSubstr(json, pos, i - pos);
  }

string ExtractNextObject(string arrayContent, int &searchPos)
  {
   int start = StringFind(arrayContent, "{", searchPos);
   if(start < 0) return "";
   int depth = 0, i = start;
   while(i < StringLen(arrayContent))
     {
      string c = StringSubstr(arrayContent, i, 1);
      if(c == "{") depth++;
      else if(c == "}")
        {
         depth--;
         if(depth == 0) { searchPos = i + 1; return StringSubstr(arrayContent, start, i - start + 1); }
        }
      i++;
     }
   return "";
  }

string EscapeJson(string s)
  {
   StringReplace(s, "\\", "\\\\");
   StringReplace(s, "\"", "\\\"");
   StringReplace(s, "\n", "\\n");
   StringReplace(s, "\r", "\\r");
   StringReplace(s, "\t", "\\t");
   return s;
  }

//+------------------------------------------------------------------+
