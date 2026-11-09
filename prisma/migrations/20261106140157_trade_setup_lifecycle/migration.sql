-- CreateTable
CREATE TABLE "TradeSetupLifecycle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "setupId" TEXT NOT NULL,
    "pair" TEXT NOT NULL,
    "timeframe" TEXT,
    "bias" TEXT NOT NULL,
    "entryZone" TEXT NOT NULL,
    "invalidationZone" TEXT NOT NULL,
    "target1" TEXT NOT NULL,
    "target2" TEXT NOT NULL,
    "entryMid" DOUBLE PRECISION NOT NULL,
    "invalidationMid" DOUBLE PRECISION NOT NULL,
    "target1Mid" DOUBLE PRECISION NOT NULL,
    "target2Mid" DOUBLE PRECISION NOT NULL,
    "riskReward" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "priceAtGeneration" DOUBLE PRECISION,
    "state" TEXT NOT NULL DEFAULT 'ACTIVE',
    "lastPrice" DOUBLE PRECISION,
    "lastCheckedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TradeSetupLifecycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SetupLifecycleObservation" (
    "id" TEXT NOT NULL,
    "setupId" TEXT NOT NULL,
    "sourceAnalysisId" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "state" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SetupLifecycleObservation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TradeSetupLifecycle_setupId_key" ON "TradeSetupLifecycle"("setupId");

-- CreateIndex
CREATE INDEX "TradeSetupLifecycle_userId_idx" ON "TradeSetupLifecycle"("userId");

-- CreateIndex
CREATE INDEX "TradeSetupLifecycle_userId_pair_idx" ON "TradeSetupLifecycle"("userId", "pair");

-- CreateIndex
CREATE INDEX "TradeSetupLifecycle_state_idx" ON "TradeSetupLifecycle"("state");

-- CreateIndex
CREATE INDEX "SetupLifecycleObservation_setupId_observedAt_idx" ON "SetupLifecycleObservation"("setupId", "observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SetupLifecycleObservation_setupId_sourceAnalysisId_key" ON "SetupLifecycleObservation"("setupId", "sourceAnalysisId");

-- AddForeignKey
ALTER TABLE "TradeSetupLifecycle" ADD CONSTRAINT "TradeSetupLifecycle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SetupLifecycleObservation" ADD CONSTRAINT "SetupLifecycleObservation_setupId_fkey" FOREIGN KEY ("setupId") REFERENCES "TradeSetupLifecycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

