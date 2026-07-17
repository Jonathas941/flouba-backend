export interface AccountSyncInput {
  robotId: string;
  accountLogin: string;
  brokerName?: string;
  brokerServer?: string;
  accountCurrency?: string;
  leverage?: number;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel?: number;
  floatingProfit?: number;
  dailyProfit?: number;
  dailyLoss?: number;
  dailyNetProfit?: number;
  drawdownPercent?: number;
  maxDrawdownPercent?: number;
  autoTradingEnabled?: boolean;
  terminalConnected?: boolean;
  brokerConnected?: boolean;
  timestamp?: string;
}

export interface AccountSummary {
  robotId: string;
  accountLogin: string;
  brokerName: string | null;
  brokerServer: string | null;
  accountCurrency: string | null;
  leverage: number | null;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  marginLevel: number;
  floatingProfit: number;
  dailyProfit: number;
  dailyLoss: number;
  dailyNetProfit: number;
  drawdownPercent: number;
  maxDrawdownPercent: number;
  autoTradingEnabled: boolean;
  terminalConnected: boolean;
  brokerConnected: boolean;
  enabled: boolean;
  lastSyncedAt: string | null;
}
