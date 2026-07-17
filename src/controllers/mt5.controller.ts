import { Prisma } from '@prisma/client';
import { asyncHandler } from '../utils/async-handler.js';
import { successResponse } from '../utils/api-response.js';
import { prisma } from '../config/database.js';
import { acknowledge as acknowledgeCommand, markExecuting, reportResult } from '../services/command.service.js';
import { processHeartbeat } from '../services/heartbeat.service.js';
import { deliverCommands } from '../queue/command-queue.js';
import { parseCommandAcknowledge, parseCommandExecuting, parseCommandResult } from '../validators/command.validators.js';
import { parseHeartbeat } from '../validators/heartbeat.validators.js';

const Decimal = Prisma.Decimal;

export const heartbeat = asyncHandler(async (req, res) =>
  successResponse(res, await processHeartbeat({ ...parseHeartbeat(req.body), robotId: req.robotId!, accountLogin: req.accountLogin! })),
);
export const pollCommands = asyncHandler(async (req, res) =>
  successResponse(res, await deliverCommands(req.robotId!, req.requestId!, Math.min(Math.max(Number(req.query.limit) || 20, 1), 100))),
);
export const acknowledge = asyncHandler(async (req, res) => {
  const { metadata } = parseCommandAcknowledge(req.body);
  return successResponse(res, await acknowledgeCommand(req.robotId!, req.params.commandId, metadata));
});
export const executing = asyncHandler(async (req, res) => {
  const { metadata } = parseCommandExecuting(req.body);
  return successResponse(res, await markExecuting(req.robotId!, req.params.commandId, metadata));
});
export const result = asyncHandler(async (req, res) =>
  successResponse(res, await reportResult({ ...parseCommandResult(req.body), commandId: req.params.commandId, robotId: req.robotId! })),
);
export const indicators = asyncHandler(async (req, res) => {
  const { symbol, timeframe, bid, ask, spread, emaValue, ema20Value, ema200Value, emaM15Value, rsiValue, adxValue, plusDI, minusDI, atrValue, signalScore, lastSignal } = req.body;
  const now = new Date();
  await prisma.robotHeartbeat.create({
    data: {
      robotId: req.robotId!,
      accountLogin: req.accountLogin!,
      robotStatus: 'ONLINE',
      autoTradingEnabled: false,
      terminalConnected: true,
      brokerConnected: true,
      marketConnected: true,
      balance: 0,
      equity: 0,
      margin: 0,
      freeMargin: 0,
      marginLevel: 0,
      floatingProfit: 0,
      dailyProfit: 0,
      dailyLoss: 0,
      dailyNetProfit: 0,
      drawdownPercent: 0,
      openPositionCount: 0,
      pendingOrderCount: 0,
      currentSymbol: symbol,
      tradingSession: timeframe,
      emaValue: emaValue ? new Decimal(emaValue) : null,
      ema20Value: ema20Value ? new Decimal(ema20Value) : null,
      ema200Value: ema200Value ? new Decimal(ema200Value) : null,
      emaM15Value: emaM15Value ? new Decimal(emaM15Value) : null,
      rsiValue: rsiValue ? new Decimal(rsiValue) : null,
      adxValue: adxValue ? new Decimal(adxValue) : null,
      plusDI: plusDI ? new Decimal(plusDI) : null,
      minusDI: minusDI ? new Decimal(minusDI) : null,
      atrValue: atrValue ? new Decimal(atrValue) : null,
      signalScore: signalScore ? new Decimal(signalScore) : null,
      lastSignal: lastSignal,
      receivedAt: now,
    },
  });
  return successResponse(res, { robotId: req.robotId, symbol, timeframe, status: 'saved', receivedAt: now });
});
