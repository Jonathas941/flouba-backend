import { toNumber } from '../utils/numeric.js';
import { AppError, ErrorCodes } from '../utils/errors.js';
import * as heartbeat from '../repositories/heartbeat.repository.js';
import { getRobot } from './robot.service.js';

export interface IndicatorSnapshot {
  robotId: string;
  ema: {
    emaValue: number | null;
    ema20Value: number | null;
    ema200Value: number | null;
    emaM15Value: number | null;
  };
  rsi: {
    rsiValue: number | null;
  };
  adx: {
    adxValue: number | null;
    plusDI: number | null;
    minusDI: number | null;
  };
  atr: {
    atrValue: number | null;
  };
  signalScore: number | null;
  lastSignal: string | null;
  receivedAt: string | null;
  timestamp: string;
}

export async function getLatestIndicators(robotId: string): Promise<IndicatorSnapshot> {
  await getRobot(robotId);
  const latest = await heartbeat.getLatest(robotId);
  if (!latest) {
    throw new AppError(ErrorCodes.NOT_FOUND, 'No heartbeat data available for robot', 404, { robotId });
  }

  return {
    robotId,
    ema: {
      emaValue: latest.emaValue !== null && latest.emaValue !== undefined ? toNumber(latest.emaValue) : null,
      ema20Value: latest.ema20Value !== null && latest.ema20Value !== undefined ? toNumber(latest.ema20Value) : null,
      ema200Value: latest.ema200Value !== null && latest.ema200Value !== undefined ? toNumber(latest.ema200Value) : null,
      emaM15Value: latest.emaM15Value !== null && latest.emaM15Value !== undefined ? toNumber(latest.emaM15Value) : null,
    },
    rsi: {
      rsiValue: latest.rsiValue !== null && latest.rsiValue !== undefined ? toNumber(latest.rsiValue) : null,
    },
    adx: {
      adxValue: latest.adxValue !== null && latest.adxValue !== undefined ? toNumber(latest.adxValue) : null,
      plusDI: latest.plusDI !== null && latest.plusDI !== undefined ? toNumber(latest.plusDI) : null,
      minusDI: latest.minusDI !== null && latest.minusDI !== undefined ? toNumber(latest.minusDI) : null,
    },
    atr: {
      atrValue: latest.atrValue !== null && latest.atrValue !== undefined ? toNumber(latest.atrValue) : null,
    },
    signalScore: latest.signalScore !== null && latest.signalScore !== undefined ? toNumber(latest.signalScore) : null,
    lastSignal: latest.lastSignal ?? null,
    receivedAt: latest.receivedAt?.toISOString() ?? null,
    timestamp: new Date().toISOString(),
  };
}
