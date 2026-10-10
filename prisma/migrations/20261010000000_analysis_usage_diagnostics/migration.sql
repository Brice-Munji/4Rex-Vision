-- AlterTable
ALTER TABLE "AnalysisUsage" ADD COLUMN     "imageHash" VARCHAR(64),
ADD COLUMN     "requestId" TEXT;

-- CreateIndex
CREATE INDEX "AnalysisUsage_imageHash_idx" ON "AnalysisUsage"("imageHash");

