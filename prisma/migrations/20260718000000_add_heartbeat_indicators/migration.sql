-- AlterTable
ALTER TABLE "RobotHeartbeat" ADD COLUMN     "emaValue" DECIMAL(18,8),
ADD COLUMN     "ema20Value" DECIMAL(18,8),
ADD COLUMN     "ema200Value" DECIMAL(18,8),
ADD COLUMN     "emaM15Value" DECIMAL(18,8),
ADD COLUMN     "rsiValue" DECIMAL(18,8),
ADD COLUMN     "adxValue" DECIMAL(18,8),
ADD COLUMN     "plusDI" DECIMAL(18,8),
ADD COLUMN     "minusDI" DECIMAL(18,8),
ADD COLUMN     "atrValue" DECIMAL(18,8),
ADD COLUMN     "signalScore" DECIMAL(18,8),
ADD COLUMN     "lastSignal" TEXT;
