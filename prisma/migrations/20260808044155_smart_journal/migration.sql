-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "analysisId" TEXT,
    "pair" TEXT NOT NULL,
    "timeframe" TEXT,
    "direction" TEXT,
    "confidence" INTEGER,
    "entryPrice" DOUBLE PRECISION,
    "stopLoss" DOUBLE PRECISION,
    "takeProfit" DOUBLE PRECISION,
    "lotSize" DOUBLE PRECISION,
    "riskAmount" DOUBLE PRECISION,
    "resultType" TEXT NOT NULL DEFAULT 'OPEN',
    "resultR" DOUBLE PRECISION,
    "resultAmount" DOUBLE PRECISION,
    "traderNote" TEXT,
    "newsRisk" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalTag" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "label" TEXT NOT NULL,

    CONSTRAINT "JournalTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEmotion" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "emotion" TEXT NOT NULL,

    CONSTRAINT "JournalEmotion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalOutcome" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "targetReached" BOOLEAN,
    "mfe" DOUBLE PRECISION,
    "mae" DOUBLE PRECISION,
    "timeToTargetMins" INTEGER,
    "accuracyScore" INTEGER,
    "note" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JournalOutcome_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JournalEntry_userId_idx" ON "JournalEntry"("userId");

-- CreateIndex
CREATE INDEX "JournalEntry_userId_resultType_idx" ON "JournalEntry"("userId", "resultType");

-- CreateIndex
CREATE INDEX "JournalEntry_createdAt_idx" ON "JournalEntry"("createdAt");

-- CreateIndex
CREATE INDEX "JournalTag_entryId_idx" ON "JournalTag"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalTag_entryId_label_key" ON "JournalTag"("entryId", "label");

-- CreateIndex
CREATE INDEX "JournalEmotion_entryId_idx" ON "JournalEmotion"("entryId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEmotion_entryId_emotion_key" ON "JournalEmotion"("entryId", "emotion");

-- CreateIndex
CREATE UNIQUE INDEX "JournalOutcome_entryId_key" ON "JournalOutcome"("entryId");

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalTag" ADD CONSTRAINT "JournalTag_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEmotion" ADD CONSTRAINT "JournalEmotion_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalOutcome" ADD CONSTRAINT "JournalOutcome_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
