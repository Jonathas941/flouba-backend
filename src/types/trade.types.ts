import type { OrderType, TradeDirection } from '@prisma/client';

export interface PositionSyncItem {
  brokerPositionId: string;
  brokerTicket?: string;
  accountLogin: string;
  robotId: string;
  symbol: string;
  direction: TradeDirection;
  volume: number;
  openPrice: number;
  currentPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  profit?: number;
  swap?: number;
  commission?: number;
  magicNumber?: number;
  comment?: string;
  openedAt?: Date | string;
  updatedAt?: Date | string;
}

export interface OrderSyncItem {
  brokerOrderId: string;
  brokerTicket?: string;
  accountLogin: string;
  robotId: string;
  symbol: string;
  orderType: OrderType;
  volume: number;
  requestedPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  expiration?: Date | string;
  magicNumber?: number;
  comment?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface TradeSyncItem {
  brokerDealId: string;
  brokerPositionId?: string;
  brokerTicket?: string;
  accountLogin: string;
  robotId: string;
  symbol: string;
  direction: TradeDirection;
  volume: number;
  openPrice: number;
  closePrice: number;
  stopLoss?: number;
  takeProfit?: number;
  grossProfit?: number;
  commission?: number;
  swap?: number;
  netProfit?: number;
  magicNumber?: number;
  comment?: string;
  openedAt?: Date | string;
  closedAt: Date | string;
  closeReason?: string;
}
