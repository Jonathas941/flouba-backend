import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const RISK_RULE_TEMPLATES = [
  {
    code: 'MAX_DAILY_LOSS_PERCENT',
    name: 'Maximum daily loss percent',
    description: 'Reject new entries when daily loss percent exceeds configured limit',
  },
  {
    code: 'MAX_DRAWDOWN_PERCENT',
    name: 'Maximum drawdown percent',
    description: 'Reject new entries when drawdown exceeds configured limit',
  },
  {
    code: 'MAX_OPEN_POSITIONS',
    name: 'Maximum open positions',
    description: 'Limit concurrent open positions',
  },
  {
    code: 'MAX_LOT_SIZE',
    name: 'Maximum lot size',
    description: 'Reject orders above maximum lot size',
  },
  {
    code: 'MIN_FREE_MARGIN',
    name: 'Minimum free margin',
    description: 'Reject entries when free margin is too low',
  },
  {
    code: 'REQUIRE_STOP_LOSS',
    name: 'Require stop loss',
    description: 'Require stop loss on entry commands when enabled',
  },
  {
    code: 'EMERGENCY_STOP',
    name: 'Emergency stop gate',
    description: 'Block entry commands while emergency stop is active',
  },
  {
    code: 'MARTINGALE_DISABLED',
    name: 'Martingale disabled by default',
    description: 'Martingale recovery sizing is disabled unless explicitly enabled later',
  },
] as const;

async function main(): Promise<void> {
  for (const template of RISK_RULE_TEMPLATES) {
    const existing = await prisma.riskRule.findFirst({
      where: { robotId: null, code: template.code, isTemplate: true },
    });
    const data = {
        robotId: null,
        code: template.code,
        name: template.name,
        description: template.description,
        enabled: true,
        isTemplate: true,
        config: {},
      };
    if (existing) {
      await prisma.riskRule.update({ where: { id: existing.id }, data });
    } else {
      await prisma.riskRule.create({ data });
    }
  }

  if (process.env.NODE_ENV === 'development') {
    const robotId = 'flouba-lite-dev-001';
    await prisma.robot.upsert({
      where: { robotId },
      create: {
        robotId,
        robotName: 'Flouba Lite Dev Robot',
        accountLogin: '100001',
        brokerName: 'Demo Broker',
        brokerServer: 'Demo-Server',
        accountCurrency: 'USD',
        accountLeverage: 100,
        accountType: 'DEMO',
        eaVersion: '0.0.0-dev',
        terminalVersion: '5.0',
        operatingSystem: 'Windows',
        vpsIdentifier: 'local-dev',
        supportedSymbols: ['EURUSD', 'GBPUSD', 'XAUUSD'],
        supportedTimeframes: ['M15', 'H1'],
        magicNumber: 44001,
        autoTradingEnabled: false,
        terminalConnected: false,
        brokerConnected: false,
        status: 'OFFLINE',
        emergencyStopActive: false,
      },
      update: {
        robotName: 'Flouba Lite Dev Robot',
        status: 'OFFLINE',
      },
    });

    await prisma.robotSettings.upsert({
      where: { robotId },
      create: {
        robotId,
        autoTradingEnabled: false,
        allowedSymbols: ['EURUSD', 'GBPUSD', 'XAUUSD'],
        blockedSymbols: [],
        maximumLotSize: 1,
        minimumLotSize: 0.01,
        defaultRiskPercent: 1,
        maximumRiskPercent: 2,
        maximumOpenPositions: 10,
        maximumPositionsPerSymbol: 3,
        maximumDailyLossPercent: 5,
        maximumDrawdownPercent: 10,
        minimumFreeMargin: 100,
        minimumMarginLevel: 150,
        requireStopLoss: true,
        newsFilterEnabled: false,
        trailingStopEnabled: false,
        breakEvenEnabled: false,
        partialCloseEnabled: false,
        emergencyStopActive: false,
        commandExpirationSeconds: 300,
        heartbeatTimeoutSeconds: 30,
        martingaleEnabled: false,
      },
      update: {},
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
