-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "RobotStatus" AS ENUM ('REGISTERING', 'ONLINE', 'OFFLINE', 'PAUSED', 'STOPPED', 'ERROR', 'EMERGENCY_STOPPED', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('DEMO', 'REAL', 'CONTEST', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "CommandType" AS ENUM ('OPEN_BUY', 'OPEN_SELL', 'PLACE_BUY_LIMIT', 'PLACE_SELL_LIMIT', 'PLACE_BUY_STOP', 'PLACE_SELL_STOP', 'MODIFY_POSITION', 'MODIFY_PENDING_ORDER', 'CLOSE_POSITION', 'CLOSE_PARTIAL', 'CLOSE_ALL_POSITIONS', 'CANCEL_PENDING_ORDER', 'CANCEL_ALL_PENDING_ORDERS', 'MOVE_TO_BREAKEVEN', 'ENABLE_TRAILING_STOP', 'DISABLE_TRAILING_STOP', 'START_ROBOT', 'STOP_ROBOT', 'PAUSE_ROBOT', 'RESUME_ROBOT', 'EMERGENCY_STOP', 'CLEAR_EMERGENCY_STOP', 'UPDATE_ROBOT_SETTINGS', 'SYNC_ACCOUNT', 'SYNC_POSITIONS', 'SYNC_ORDERS', 'SYNC_TRADES');

-- CreateEnum
CREATE TYPE "CommandStatus" AS ENUM ('QUEUED', 'VALIDATING', 'REJECTED', 'DELIVERED', 'ACKNOWLEDGED', 'EXECUTING', 'COMPLETED', 'FAILED', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CommandPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "TradeDirection" AS ENUM ('BUY', 'SELL');

-- CreateEnum
CREATE TYPE "OrderType" AS ENUM ('BUY_LIMIT', 'SELL_LIMIT', 'BUY_STOP', 'SELL_STOP', 'BUY_STOP_LIMIT', 'SELL_STOP_LIMIT');

-- CreateEnum
CREATE TYPE "PositionStatus" AS ENUM ('OPEN', 'CLOSED', 'STALE');

-- CreateEnum
CREATE TYPE "PendingOrderStatus" AS ENUM ('PENDING', 'FILLED', 'CANCELLED', 'EXPIRED', 'STALE');

-- CreateEnum
CREATE TYPE "RiskStatus" AS ENUM ('OK', 'WARNING', 'BLOCKED', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "SecurityEventSeverity" AS ENUM ('INFO', 'WARNING', 'CRITICAL');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'READ', 'AUTH', 'COMMAND', 'SYNC', 'EMERGENCY', 'SETTINGS', 'SYSTEM');

-- CreateTable
CREATE TABLE "Robot" (
    "id" TEXT NOT NULL,
    "robotId" TEXT NOT NULL,
    "robotName" TEXT NOT NULL,
    "accountLogin" TEXT NOT NULL,
    "brokerName" TEXT,
    "brokerServer" TEXT,
    "accountCurrency" TEXT DEFAULT 'USD',
    "accountLeverage" INTEGER,
    "accountType" "AccountType" NOT NULL DEFAULT 'UNKNOWN',
    "eaVersion" TEXT,
    "terminalVersion" TEXT,
    "operatingSystem" TEXT,
    "vpsIdentifier" TEXT,
    "supportedSymbols" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "supportedTimeframes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "magicNumber" INTEGER,
    "autoTradingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "terminalConnected" BOOLEAN NOT NULL DEFAULT false,
    "brokerConnected" BOOLEAN NOT NULL DEFAULT false,
    "marketConnected" BOOLEAN NOT NULL DEFAULT false,
    "status" "RobotStatus" NOT NULL DEFAULT 'REGISTERING',
    "emergencyStopActive" BOOLEAN NOT NULL DEFAULT false,
    "emergencyStopAt" TIMESTAMP(3),
    "emergencyStopBy" TEXT,
    "robotTokenHash" TEXT,
    "lastHeartbeatAt" TIMESTAMP(3),
    "lastSeenAt" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Robot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradingAccount" (
    "id" TEXT NOT NULL,
    "robotId" TEXT NOT NULL,
    "accountLogin" TEXT NOT NULL,
    "brokerName" TEXT,
    "brokerServer" TEXT,
    "accountCurrency" TEXT DEFAULT 'USD',
    "leverage" INTEGER,
    "accountType" "AccountType" NOT NULL DEFAULT 'UNKNOWN',
    "balance" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "equity" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "margin" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "freeMargin" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "marginLevel" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "floatingProfit" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "dailyProfit" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "dailyLoss" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "dailyNetProfit" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "drawdownPercent" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "maxDrawdownPercent" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "autoTradingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "terminalConnected" BOOLEAN NOT NULL DEFAULT false,
    "brokerConnected" BOOLEAN NOT NULL DEFAULT false,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RobotHeartbeat" (
    "id" TEXT NOT NULL,
    "robotId" TEXT NOT NULL,
    "accountLogin" TEXT NOT NULL,
    "robotStatus" "RobotStatus" NOT NULL,
    "autoTradingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "terminalConnected" BOOLEAN NOT NULL DEFAULT false,
    "brokerConnected" BOOLEAN NOT NULL DEFAULT false,
    "marketConnected" BOOLEAN NOT NULL DEFAULT false,
    "lastTickTime" TIMESTAMP(3),
    "lastTradeTime" TIMESTAMP(3),
    "lastCommandTime" TIMESTAMP(3),
    "balance" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "equity" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "margin" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "freeMargin" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "marginLevel" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "floatingProfit" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "dailyProfit" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "dailyLoss" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "dailyNetProfit" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "drawdownPercent" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "maxDrawdownPercent" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "openPositionCount" INTEGER NOT NULL DEFAULT 0,
    "pendingOrderCount" INTEGER NOT NULL DEFAULT 0,
    "currentSpread" DECIMAL(18,8),
    "averageSpread" DECIMAL(18,8),
    "currentSymbol" TEXT,
    "tradingSession" TEXT,
    "sessionAllowed" BOOLEAN NOT NULL DEFAULT true,
    "newsFilterActive" BOOLEAN NOT NULL DEFAULT false,
    "spreadFilterPassed" BOOLEAN NOT NULL DEFAULT true,
    "riskStatus" "RiskStatus" NOT NULL DEFAULT 'UNKNOWN',
    "eaVersion" TEXT,
    "terminalVersion" TEXT,
    "clientTimestamp" TIMESTAMP(3),
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RobotHeartbeat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RobotSettings" (
    "id" TEXT NOT NULL,
    "robotId" TEXT NOT NULL,
    "autoTradingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "allowedSymbols" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "blockedSymbols" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maximumLotSize" DECIMAL(18,8) NOT NULL DEFAULT 1.0,
    "minimumLotSize" DECIMAL(18,8) NOT NULL DEFAULT 0.01,
    "defaultRiskPercent" DECIMAL(18,8) NOT NULL DEFAULT 1.0,
    "maximumRiskPercent" DECIMAL(18,8) NOT NULL DEFAULT 2.0,
    "maximumOpenPositions" INTEGER NOT NULL DEFAULT 10,
    "maximumPositionsPerSymbol" INTEGER NOT NULL DEFAULT 3,
    "maximumDailyLossAmount" DECIMAL(18,8),
    "maximumDailyLossPercent" DECIMAL(18,8) NOT NULL DEFAULT 5.0,
    "dailyProfitTargetAmount" DECIMAL(18,8),
    "dailyProfitTargetPercent" DECIMAL(18,8),
    "maximumDrawdownPercent" DECIMAL(18,8) NOT NULL DEFAULT 10.0,
    "minimumFreeMargin" DECIMAL(18,8) NOT NULL DEFAULT 100,
    "minimumMarginLevel" DECIMAL(18,8) NOT NULL DEFAULT 150,
    "maximumSpreadPoints" DECIMAL(18,8),
    "requireStopLoss" BOOLEAN NOT NULL DEFAULT true,
    "minimumRewardRiskRatio" DECIMAL(18,8),
    "allowedTradingSessions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "newsFilterEnabled" BOOLEAN NOT NULL DEFAULT false,
    "trailingStopEnabled" BOOLEAN NOT NULL DEFAULT false,
    "breakEvenEnabled" BOOLEAN NOT NULL DEFAULT false,
    "partialCloseEnabled" BOOLEAN NOT NULL DEFAULT false,
    "emergencyStopActive" BOOLEAN NOT NULL DEFAULT false,
    "commandExpirationSeconds" INTEGER NOT NULL DEFAULT 300,
    "heartbeatTimeoutSeconds" INTEGER NOT NULL DEFAULT 30,
    "martingaleEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RobotSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RobotSettingsHistory" (
    "id" TEXT NOT NULL,
    "robotId" TEXT NOT NULL,
    "changedBy" TEXT,
    "changeSource" TEXT NOT NULL,
    "previousValues" JSONB NOT NULL,
    "newValues" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RobotSettingsHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeCommand" (
    "id" TEXT NOT NULL,
    "commandId" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "robotId" TEXT NOT NULL,
    "tradingAccountId" TEXT,
    "accountLogin" TEXT NOT NULL,
    "commandType" "CommandType" NOT NULL,
    "symbol" TEXT,
    "direction" "TradeDirection",
    "lotSize" DECIMAL(18,8),
    "riskPercent" DECIMAL(18,8),
    "entryPrice" DECIMAL(18,8),
    "stopLoss" DECIMAL(18,8),
    "takeProfit" DECIMAL(18,8),
    "trailingStopPoints" DECIMAL(18,8),
    "breakEvenTriggerPoints" DECIMAL(18,8),
    "partialClosePercent" DECIMAL(18,8),
    "brokerTicket" TEXT,
    "brokerPositionId" TEXT,
    "brokerOrderId" TEXT,
    "magicNumber" INTEGER,
    "comment" TEXT,
    "metadata" JSONB,
    "priority" "CommandPriority" NOT NULL DEFAULT 'NORMAL',
    "status" "CommandStatus" NOT NULL DEFAULT 'QUEUED',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maximumRetryCount" INTEGER NOT NULL DEFAULT 3,
    "rejectionCode" TEXT,
    "rejectionReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "executionStartedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "deliveryOwner" TEXT,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeCommand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeCommandStatusHistory" (
    "id" TEXT NOT NULL,
    "commandId" TEXT NOT NULL,
    "fromStatus" "CommandStatus",
    "toStatus" "CommandStatus" NOT NULL,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TradeCommandStatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TradeExecution" (
    "id" TEXT NOT NULL,
    "commandId" TEXT NOT NULL,
    "robotId" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL,
    "brokerOrderId" TEXT,
    "brokerPositionId" TEXT,
    "brokerTicket" TEXT,
    "symbol" TEXT,
    "direction" "TradeDirection",
    "requestedLot" DECIMAL(18,8),
    "executedLot" DECIMAL(18,8),
    "requestedPrice" DECIMAL(18,8),
    "executedPrice" DECIMAL(18,8),
    "stopLoss" DECIMAL(18,8),
    "takeProfit" DECIMAL(18,8),
    "spread" DECIMAL(18,8),
    "slippage" DECIMAL(18,8),
    "commission" DECIMAL(18,8),
    "swap" DECIMAL(18,8),
    "brokerReturnCode" INTEGER,
    "brokerMessage" TEXT,
    "executionDurationMs" INTEGER,
    "errorCode" TEXT,
    "errorMessage" TEXT,
    "terminalTimestamp" TIMESTAMP(3),
    "clientTimestamp" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OpenPosition" (
    "id" TEXT NOT NULL,
    "robotId" TEXT NOT NULL,
    "accountLogin" TEXT NOT NULL,
    "brokerPositionId" TEXT NOT NULL,
    "brokerTicket" TEXT,
    "symbol" TEXT NOT NULL,
    "direction" "TradeDirection" NOT NULL,
    "volume" DECIMAL(18,8) NOT NULL,
    "openPrice" DECIMAL(18,8) NOT NULL,
    "currentPrice" DECIMAL(18,8),
    "stopLoss" DECIMAL(18,8),
    "takeProfit" DECIMAL(18,8),
    "profit" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "swap" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "commission" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "magicNumber" INTEGER,
    "comment" TEXT,
    "status" "PositionStatus" NOT NULL DEFAULT 'OPEN',
    "openedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OpenPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PendingOrder" (
    "id" TEXT NOT NULL,
    "robotId" TEXT NOT NULL,
    "accountLogin" TEXT NOT NULL,
    "brokerOrderId" TEXT NOT NULL,
    "brokerTicket" TEXT,
    "symbol" TEXT NOT NULL,
    "orderType" "OrderType" NOT NULL,
    "volume" DECIMAL(18,8) NOT NULL,
    "requestedPrice" DECIMAL(18,8) NOT NULL,
    "stopLoss" DECIMAL(18,8),
    "takeProfit" DECIMAL(18,8),
    "expiration" TIMESTAMP(3),
    "magicNumber" INTEGER,
    "comment" TEXT,
    "status" "PendingOrderStatus" NOT NULL DEFAULT 'PENDING',
    "orderCreatedAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PendingOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClosedTrade" (
    "id" TEXT NOT NULL,
    "robotId" TEXT NOT NULL,
    "accountLogin" TEXT NOT NULL,
    "brokerDealId" TEXT NOT NULL,
    "brokerPositionId" TEXT,
    "brokerTicket" TEXT,
    "symbol" TEXT NOT NULL,
    "direction" "TradeDirection" NOT NULL,
    "volume" DECIMAL(18,8) NOT NULL,
    "openPrice" DECIMAL(18,8) NOT NULL,
    "closePrice" DECIMAL(18,8) NOT NULL,
    "stopLoss" DECIMAL(18,8),
    "takeProfit" DECIMAL(18,8),
    "grossProfit" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "commission" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "swap" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "netProfit" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "magicNumber" INTEGER,
    "comment" TEXT,
    "closeReason" TEXT,
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClosedTrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyAccountStatistic" (
    "id" TEXT NOT NULL,
    "robotId" TEXT NOT NULL,
    "accountLogin" TEXT NOT NULL,
    "statisticDate" DATE NOT NULL,
    "startingBalance" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "endingBalance" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "startingEquity" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "endingEquity" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "dailyProfit" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "dailyLoss" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "dailyNetProfit" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "maxDrawdownPercent" DECIMAL(18,8) NOT NULL DEFAULT 0,
    "tradesClosed" INTEGER NOT NULL DEFAULT 0,
    "positionsOpened" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DailyAccountStatistic_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RiskRule" (
    "id" TEXT NOT NULL,
    "robotId" TEXT,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "isTemplate" BOOLEAN NOT NULL DEFAULT false,
    "config" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RiskRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RobotLog" (
    "id" TEXT NOT NULL,
    "robotId" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "category" TEXT,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "commandId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RobotLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorId" TEXT,
    "robotId" TEXT,
    "accountLogin" TEXT,
    "commandId" TEXT,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "message" TEXT NOT NULL,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SecurityEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "severity" "SecurityEventSeverity" NOT NULL DEFAULT 'WARNING',
    "message" TEXT NOT NULL,
    "actorType" TEXT,
    "actorId" TEXT,
    "robotId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiRequestLog" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "statusCode" INTEGER,
    "durationMs" INTEGER,
    "robotId" TEXT,
    "accountLogin" TEXT,
    "commandId" TEXT,
    "actorType" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "errorCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApiRequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdempotencyRecord" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "requestHash" TEXT,
    "responseStatus" INTEGER,
    "responseBody" JSONB,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookEvent" (
    "id" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "targetUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobLock" (
    "id" TEXT NOT NULL,
    "jobName" TEXT NOT NULL,
    "lockedBy" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobLock_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Robot_robotId_key" ON "Robot"("robotId");

-- CreateIndex
CREATE INDEX "Robot_accountLogin_idx" ON "Robot"("accountLogin");

-- CreateIndex
CREATE INDEX "Robot_status_idx" ON "Robot"("status");

-- CreateIndex
CREATE INDEX "Robot_lastHeartbeatAt_idx" ON "Robot"("lastHeartbeatAt");

-- CreateIndex
CREATE INDEX "Robot_emergencyStopActive_idx" ON "Robot"("emergencyStopActive");

-- CreateIndex
CREATE INDEX "Robot_createdAt_idx" ON "Robot"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TradingAccount_robotId_key" ON "TradingAccount"("robotId");

-- CreateIndex
CREATE INDEX "TradingAccount_accountLogin_idx" ON "TradingAccount"("accountLogin");

-- CreateIndex
CREATE INDEX "TradingAccount_lastSyncedAt_idx" ON "TradingAccount"("lastSyncedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TradingAccount_accountLogin_brokerServer_key" ON "TradingAccount"("accountLogin", "brokerServer");

-- CreateIndex
CREATE INDEX "RobotHeartbeat_robotId_receivedAt_idx" ON "RobotHeartbeat"("robotId", "receivedAt");

-- CreateIndex
CREATE INDEX "RobotHeartbeat_accountLogin_idx" ON "RobotHeartbeat"("accountLogin");

-- CreateIndex
CREATE INDEX "RobotHeartbeat_receivedAt_idx" ON "RobotHeartbeat"("receivedAt");

-- CreateIndex
CREATE INDEX "RobotHeartbeat_robotStatus_idx" ON "RobotHeartbeat"("robotStatus");

-- CreateIndex
CREATE UNIQUE INDEX "RobotSettings_robotId_key" ON "RobotSettings"("robotId");

-- CreateIndex
CREATE INDEX "RobotSettingsHistory_robotId_createdAt_idx" ON "RobotSettingsHistory"("robotId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TradeCommand_commandId_key" ON "TradeCommand"("commandId");

-- CreateIndex
CREATE INDEX "TradeCommand_robotId_status_idx" ON "TradeCommand"("robotId", "status");

-- CreateIndex
CREATE INDEX "TradeCommand_commandType_idx" ON "TradeCommand"("commandType");

-- CreateIndex
CREATE INDEX "TradeCommand_status_priority_createdAt_idx" ON "TradeCommand"("status", "priority", "createdAt");

-- CreateIndex
CREATE INDEX "TradeCommand_accountLogin_idx" ON "TradeCommand"("accountLogin");

-- CreateIndex
CREATE INDEX "TradeCommand_idempotencyKey_idx" ON "TradeCommand"("idempotencyKey");

-- CreateIndex
CREATE INDEX "TradeCommand_expiresAt_idx" ON "TradeCommand"("expiresAt");

-- CreateIndex
CREATE INDEX "TradeCommand_brokerTicket_idx" ON "TradeCommand"("brokerTicket");

-- CreateIndex
CREATE INDEX "TradeCommand_brokerPositionId_idx" ON "TradeCommand"("brokerPositionId");

-- CreateIndex
CREATE INDEX "TradeCommand_brokerOrderId_idx" ON "TradeCommand"("brokerOrderId");

-- CreateIndex
CREATE INDEX "TradeCommand_createdAt_idx" ON "TradeCommand"("createdAt");

-- CreateIndex
CREATE INDEX "TradeCommand_symbol_idx" ON "TradeCommand"("symbol");

-- CreateIndex
CREATE UNIQUE INDEX "TradeCommand_robotId_idempotencyKey_key" ON "TradeCommand"("robotId", "idempotencyKey");

-- CreateIndex
CREATE INDEX "TradeCommandStatusHistory_commandId_createdAt_idx" ON "TradeCommandStatusHistory"("commandId", "createdAt");

-- CreateIndex
CREATE INDEX "TradeCommandStatusHistory_toStatus_idx" ON "TradeCommandStatusHistory"("toStatus");

-- CreateIndex
CREATE UNIQUE INDEX "TradeExecution_commandId_key" ON "TradeExecution"("commandId");

-- CreateIndex
CREATE INDEX "TradeExecution_robotId_idx" ON "TradeExecution"("robotId");

-- CreateIndex
CREATE INDEX "TradeExecution_brokerTicket_idx" ON "TradeExecution"("brokerTicket");

-- CreateIndex
CREATE INDEX "TradeExecution_brokerPositionId_idx" ON "TradeExecution"("brokerPositionId");

-- CreateIndex
CREATE INDEX "TradeExecution_brokerOrderId_idx" ON "TradeExecution"("brokerOrderId");

-- CreateIndex
CREATE INDEX "TradeExecution_createdAt_idx" ON "TradeExecution"("createdAt");

-- CreateIndex
CREATE INDEX "OpenPosition_robotId_status_idx" ON "OpenPosition"("robotId", "status");

-- CreateIndex
CREATE INDEX "OpenPosition_accountLogin_idx" ON "OpenPosition"("accountLogin");

-- CreateIndex
CREATE INDEX "OpenPosition_symbol_idx" ON "OpenPosition"("symbol");

-- CreateIndex
CREATE INDEX "OpenPosition_brokerTicket_idx" ON "OpenPosition"("brokerTicket");

-- CreateIndex
CREATE INDEX "OpenPosition_openedAt_idx" ON "OpenPosition"("openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "OpenPosition_robotId_brokerPositionId_key" ON "OpenPosition"("robotId", "brokerPositionId");

-- CreateIndex
CREATE INDEX "PendingOrder_robotId_status_idx" ON "PendingOrder"("robotId", "status");

-- CreateIndex
CREATE INDEX "PendingOrder_accountLogin_idx" ON "PendingOrder"("accountLogin");

-- CreateIndex
CREATE INDEX "PendingOrder_symbol_idx" ON "PendingOrder"("symbol");

-- CreateIndex
CREATE INDEX "PendingOrder_brokerTicket_idx" ON "PendingOrder"("brokerTicket");

-- CreateIndex
CREATE INDEX "PendingOrder_orderType_idx" ON "PendingOrder"("orderType");

-- CreateIndex
CREATE UNIQUE INDEX "PendingOrder_robotId_brokerOrderId_key" ON "PendingOrder"("robotId", "brokerOrderId");

-- CreateIndex
CREATE INDEX "ClosedTrade_robotId_closedAt_idx" ON "ClosedTrade"("robotId", "closedAt");

-- CreateIndex
CREATE INDEX "ClosedTrade_accountLogin_idx" ON "ClosedTrade"("accountLogin");

-- CreateIndex
CREATE INDEX "ClosedTrade_symbol_idx" ON "ClosedTrade"("symbol");

-- CreateIndex
CREATE INDEX "ClosedTrade_brokerTicket_idx" ON "ClosedTrade"("brokerTicket");

-- CreateIndex
CREATE INDEX "ClosedTrade_brokerPositionId_idx" ON "ClosedTrade"("brokerPositionId");

-- CreateIndex
CREATE INDEX "ClosedTrade_closedAt_idx" ON "ClosedTrade"("closedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ClosedTrade_robotId_brokerDealId_key" ON "ClosedTrade"("robotId", "brokerDealId");

-- CreateIndex
CREATE INDEX "DailyAccountStatistic_accountLogin_statisticDate_idx" ON "DailyAccountStatistic"("accountLogin", "statisticDate");

-- CreateIndex
CREATE INDEX "DailyAccountStatistic_statisticDate_idx" ON "DailyAccountStatistic"("statisticDate");

-- CreateIndex
CREATE UNIQUE INDEX "DailyAccountStatistic_robotId_statisticDate_key" ON "DailyAccountStatistic"("robotId", "statisticDate");

-- CreateIndex
CREATE INDEX "RiskRule_code_idx" ON "RiskRule"("code");

-- CreateIndex
CREATE INDEX "RiskRule_isTemplate_idx" ON "RiskRule"("isTemplate");

-- CreateIndex
CREATE UNIQUE INDEX "RiskRule_robotId_code_key" ON "RiskRule"("robotId", "code");

-- CreateIndex
CREATE INDEX "RobotLog_robotId_createdAt_idx" ON "RobotLog"("robotId", "createdAt");

-- CreateIndex
CREATE INDEX "RobotLog_level_idx" ON "RobotLog"("level");

-- CreateIndex
CREATE INDEX "RobotLog_commandId_idx" ON "RobotLog"("commandId");

-- CreateIndex
CREATE INDEX "AuditLog_robotId_createdAt_idx" ON "AuditLog"("robotId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_actorType_idx" ON "AuditLog"("actorType");

-- CreateIndex
CREATE INDEX "AuditLog_commandId_idx" ON "AuditLog"("commandId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_requestId_idx" ON "AuditLog"("requestId");

-- CreateIndex
CREATE INDEX "SecurityEvent_eventType_idx" ON "SecurityEvent"("eventType");

-- CreateIndex
CREATE INDEX "SecurityEvent_severity_idx" ON "SecurityEvent"("severity");

-- CreateIndex
CREATE INDEX "SecurityEvent_robotId_idx" ON "SecurityEvent"("robotId");

-- CreateIndex
CREATE INDEX "SecurityEvent_createdAt_idx" ON "SecurityEvent"("createdAt");

-- CreateIndex
CREATE INDEX "SecurityEvent_requestId_idx" ON "SecurityEvent"("requestId");

-- CreateIndex
CREATE INDEX "ApiRequestLog_requestId_idx" ON "ApiRequestLog"("requestId");

-- CreateIndex
CREATE INDEX "ApiRequestLog_createdAt_idx" ON "ApiRequestLog"("createdAt");

-- CreateIndex
CREATE INDEX "ApiRequestLog_robotId_idx" ON "ApiRequestLog"("robotId");

-- CreateIndex
CREATE INDEX "ApiRequestLog_path_idx" ON "ApiRequestLog"("path");

-- CreateIndex
CREATE INDEX "ApiRequestLog_statusCode_idx" ON "ApiRequestLog"("statusCode");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_expiresAt_idx" ON "IdempotencyRecord"("expiresAt");

-- CreateIndex
CREATE INDEX "IdempotencyRecord_createdAt_idx" ON "IdempotencyRecord"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "IdempotencyRecord_scope_idempotencyKey_key" ON "IdempotencyRecord"("scope", "idempotencyKey");

-- CreateIndex
CREATE INDEX "WebhookEvent_status_idx" ON "WebhookEvent"("status");

-- CreateIndex
CREATE INDEX "WebhookEvent_eventType_idx" ON "WebhookEvent"("eventType");

-- CreateIndex
CREATE INDEX "WebhookEvent_createdAt_idx" ON "WebhookEvent"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "JobLock_jobName_key" ON "JobLock"("jobName");

-- CreateIndex
CREATE INDEX "JobLock_expiresAt_idx" ON "JobLock"("expiresAt");

-- AddForeignKey
ALTER TABLE "TradingAccount" ADD CONSTRAINT "TradingAccount_robotId_fkey" FOREIGN KEY ("robotId") REFERENCES "Robot"("robotId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RobotHeartbeat" ADD CONSTRAINT "RobotHeartbeat_robotId_fkey" FOREIGN KEY ("robotId") REFERENCES "Robot"("robotId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RobotSettings" ADD CONSTRAINT "RobotSettings_robotId_fkey" FOREIGN KEY ("robotId") REFERENCES "Robot"("robotId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RobotSettingsHistory" ADD CONSTRAINT "RobotSettingsHistory_robotId_fkey" FOREIGN KEY ("robotId") REFERENCES "Robot"("robotId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeCommand" ADD CONSTRAINT "TradeCommand_robotId_fkey" FOREIGN KEY ("robotId") REFERENCES "Robot"("robotId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeCommandStatusHistory" ADD CONSTRAINT "TradeCommandStatusHistory_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "TradeCommand"("commandId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeExecution" ADD CONSTRAINT "TradeExecution_commandId_fkey" FOREIGN KEY ("commandId") REFERENCES "TradeCommand"("commandId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TradeExecution" ADD CONSTRAINT "TradeExecution_robotId_fkey" FOREIGN KEY ("robotId") REFERENCES "Robot"("robotId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpenPosition" ADD CONSTRAINT "OpenPosition_robotId_fkey" FOREIGN KEY ("robotId") REFERENCES "Robot"("robotId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PendingOrder" ADD CONSTRAINT "PendingOrder_robotId_fkey" FOREIGN KEY ("robotId") REFERENCES "Robot"("robotId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClosedTrade" ADD CONSTRAINT "ClosedTrade_robotId_fkey" FOREIGN KEY ("robotId") REFERENCES "Robot"("robotId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyAccountStatistic" ADD CONSTRAINT "DailyAccountStatistic_robotId_fkey" FOREIGN KEY ("robotId") REFERENCES "Robot"("robotId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RiskRule" ADD CONSTRAINT "RiskRule_robotId_fkey" FOREIGN KEY ("robotId") REFERENCES "Robot"("robotId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RobotLog" ADD CONSTRAINT "RobotLog_robotId_fkey" FOREIGN KEY ("robotId") REFERENCES "Robot"("robotId") ON DELETE CASCADE ON UPDATE CASCADE;

