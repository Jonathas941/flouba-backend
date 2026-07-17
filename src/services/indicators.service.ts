import * as heartbeat from '../repositories/heartbeat.repository.js';
import { toNumber } from '../utils/numeric.js';
import { getRobot } from './robot.service.js';

export async function getLatestIndicators(robotId: string) {
  await getRobot(robotId);
  const latest = await heartbeat.getLatest(robotId);
  if (!latest) {
    return {
      robotId,
      available: false,
      trend: null,
      momentum: null,
      trendStrength: null,
      volatility: null,
      signal: null,
      receivedAt: null,
    };
  }
  return {
    robotId,
    available: true,
    trend: {
      ema: latest.emaValue !== null ? toNumber(latest.emaValue) : null,
      ema20: latest.ema20Value !== null ? toNumber(latest.ema20Value) : null,
      ema200: latest.ema200Value !== null ? toNumber(latest.ema200Value) : null,
      emaM15: latest.emaM15Value !== null ? toNumber(latest.emaM15Value) : null,
    },
    momentum: {
      rsi: latest.rsiValue !== null ? toNumber(latest.rsiValue) : null,
    },
    trendStrength: {
      adx: latest.adxValue !== null ? toNumber(latest.adxValue) : null,
      plusDI: latest.plusDI !== null ? toNumber(latest.plusDI) : null,
      minusDI: latest.minusDI !== null ? toNumber(latest.minusDI) : null,
    },
    volatility: {
      atr: latest.atrValue !== null ? toNumber(latest.atrValue) : null,
    },
    signal: {
      score: latest.signalScore !== null ? toNumber(latest.signalScore) : null,
      lastSignal: latest.lastSignal ?? null,
    },
    receivedAt: latest.receivedAt,
  };
}
