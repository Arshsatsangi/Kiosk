-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "imageUrls" JSONB;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" TEXT NOT NULL DEFAULT 'user';

-- CreateTable
CREATE TABLE "CachedAnswer" (
    "id" TEXT NOT NULL,
    "keywords" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "source" "MessageSource" NOT NULL DEFAULT 'LLM',
    "imageUrls" JSONB,
    "hitCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CachedAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CachedAnswer_keywords_idx" ON "CachedAnswer"("keywords");
