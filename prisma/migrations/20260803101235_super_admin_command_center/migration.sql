-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "SubscriptionSource" AS ENUM ('PAYMENT', 'ADMIN', 'PROMO');

-- CreateEnum
CREATE TYPE "AdminActionType" AS ENUM ('GRANT_PRO', 'EXTEND_PRO', 'REVOKE_PRO', 'RESET_USAGE', 'SUSPEND_USER', 'UNSUSPEND_USER', 'CHANGE_SETTINGS');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "lastActiveAt" TIMESTAMP(3),
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'USER',
ADD COLUMN     "subscriptionSource" "SubscriptionSource",
ADD COLUMN     "suspended" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "AnalysisUsage" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pair" TEXT,
    "timeframe" TEXT,
    "confidence" INTEGER,
    "provider" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisUsage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAction" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "targetId" TEXT,
    "type" "AdminActionType" NOT NULL,
    "details" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnalysisUsage_userId_idx" ON "AnalysisUsage"("userId");

-- CreateIndex
CREATE INDEX "AnalysisUsage_createdAt_idx" ON "AnalysisUsage"("createdAt");

-- CreateIndex
CREATE INDEX "AnalysisUsage_pair_idx" ON "AnalysisUsage"("pair");

-- CreateIndex
CREATE INDEX "AdminAction_actorId_idx" ON "AdminAction"("actorId");

-- CreateIndex
CREATE INDEX "AdminAction_targetId_idx" ON "AdminAction"("targetId");

-- CreateIndex
CREATE INDEX "AdminAction_createdAt_idx" ON "AdminAction"("createdAt");

-- AddForeignKey
ALTER TABLE "AnalysisUsage" ADD CONSTRAINT "AnalysisUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAction" ADD CONSTRAINT "AdminAction_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAction" ADD CONSTRAINT "AdminAction_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
