import { prisma } from '../config/database.js';
export async function runDailyStatisticsJob() {
  const day = new Date(); day.setUTCHours(0, 0, 0, 0);
  const accounts = await prisma.tradingAccount.findMany();
  for (const a of accounts) await prisma.dailyAccountStatistic.upsert({ where: { robotId_statisticDate: { robotId: a.robotId, statisticDate: day } }, create: { robotId: a.robotId, accountLogin: a.accountLogin, statisticDate: day, endingBalance: a.balance, endingEquity: a.equity, dailyProfit: a.dailyProfit, dailyLoss: a.dailyLoss, dailyNetProfit: a.dailyNetProfit, maxDrawdownPercent: a.maxDrawdownPercent }, update: { endingBalance: a.balance, endingEquity: a.equity, dailyProfit: a.dailyProfit, dailyLoss: a.dailyLoss, dailyNetProfit: a.dailyNetProfit, maxDrawdownPercent: a.maxDrawdownPercent } });
  return accounts.length;
}
