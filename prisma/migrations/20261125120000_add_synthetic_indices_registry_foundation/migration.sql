-- CreateTable
CREATE TABLE "SyntheticAnalysisUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "instrument" TEXT,
    "category" TEXT,
    "timeframe" TEXT,
    "confidence" INTEGER,
    "provider" TEXT,
    "requestId" TEXT,
    "imageHash" VARCHAR(64),
    "direction" TEXT,
    "headline" TEXT,
    "summary" TEXT,
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyntheticAnalysisUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyntheticSetupLifecycle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "setupId" TEXT NOT NULL,
    "instrument" TEXT NOT NULL,
    "category" TEXT NOT NULL,
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
    "entryFreshness" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyntheticSetupLifecycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyntheticLifecycleObservation" (
    "id" TEXT NOT NULL,
    "setupId" TEXT NOT NULL,
    "sourceAnalysisId" TEXT NOT NULL,
    "price" DOUBLE PRECISION,
    "state" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'chart_analysis',
    "observedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyntheticLifecycleObservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyntheticInstrumentMeta" (
    "symbol" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SyntheticInstrumentMeta_pkey" PRIMARY KEY ("symbol")
);

-- CreateIndex
CREATE INDEX "SyntheticAnalysisUsage_userId_idx" ON "SyntheticAnalysisUsage"("userId");

-- CreateIndex
CREATE INDEX "SyntheticAnalysisUsage_createdAt_idx" ON "SyntheticAnalysisUsage"("createdAt");

-- CreateIndex
CREATE INDEX "SyntheticAnalysisUsage_instrument_idx" ON "SyntheticAnalysisUsage"("instrument");

-- CreateIndex
CREATE INDEX "SyntheticAnalysisUsage_userId_createdAt_idx" ON "SyntheticAnalysisUsage"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SyntheticAnalysisUsage_imageHash_idx" ON "SyntheticAnalysisUsage"("imageHash");

-- CreateIndex
CREATE INDEX "SyntheticSetupLifecycle_userId_idx" ON "SyntheticSetupLifecycle"("userId");

-- CreateIndex
CREATE INDEX "SyntheticSetupLifecycle_userId_instrument_idx" ON "SyntheticSetupLifecycle"("userId", "instrument");

-- CreateIndex
CREATE INDEX "SyntheticSetupLifecycle_state_idx" ON "SyntheticSetupLifecycle"("state");

-- CreateIndex
CREATE UNIQUE INDEX "SyntheticSetupLifecycle_userId_setupId_key" ON "SyntheticSetupLifecycle"("userId", "setupId");

-- CreateIndex
CREATE INDEX "SyntheticLifecycleObservation_setupId_observedAt_idx" ON "SyntheticLifecycleObservation"("setupId", "observedAt");

-- CreateIndex
CREATE UNIQUE INDEX "SyntheticLifecycleObservation_setupId_sourceAnalysisId_key" ON "SyntheticLifecycleObservation"("setupId", "sourceAnalysisId");

-- AddForeignKey
ALTER TABLE "SyntheticAnalysisUsage" ADD CONSTRAINT "SyntheticAnalysisUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyntheticSetupLifecycle" ADD CONSTRAINT "SyntheticSetupLifecycle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyntheticLifecycleObservation" ADD CONSTRAINT "SyntheticLifecycleObservation_setupId_fkey" FOREIGN KEY ("setupId") REFERENCES "SyntheticSetupLifecycle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
