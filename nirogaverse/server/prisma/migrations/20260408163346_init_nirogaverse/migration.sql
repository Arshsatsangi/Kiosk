/*
  Warnings:

  - You are about to drop the `BloomLevel` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `BookChunk` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `CachedAnswer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChatMessage` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ChatSession` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PerformanceSummary` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Question` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuizAnswer` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `QuizAttempt` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Topic` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `User` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `UserQuestionSet` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `_QuestionToSet` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "NiroModule" AS ENUM ('AYURVAANI', 'PRAKRITIPRATIBIMBA', 'VAIDYAVIVEKA');

-- DropForeignKey
ALTER TABLE "BookChunk" DROP CONSTRAINT "BookChunk_topicId_fkey";

-- DropForeignKey
ALTER TABLE "ChatMessage" DROP CONSTRAINT "ChatMessage_chatSessionId_fkey";

-- DropForeignKey
ALTER TABLE "ChatSession" DROP CONSTRAINT "ChatSession_topicId_fkey";

-- DropForeignKey
ALTER TABLE "ChatSession" DROP CONSTRAINT "ChatSession_userId_fkey";

-- DropForeignKey
ALTER TABLE "PerformanceSummary" DROP CONSTRAINT "PerformanceSummary_bloomLevelId_fkey";

-- DropForeignKey
ALTER TABLE "PerformanceSummary" DROP CONSTRAINT "PerformanceSummary_topicId_fkey";

-- DropForeignKey
ALTER TABLE "PerformanceSummary" DROP CONSTRAINT "PerformanceSummary_userId_fkey";

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_bloomLevelId_fkey";

-- DropForeignKey
ALTER TABLE "Question" DROP CONSTRAINT "Question_topicId_fkey";

-- DropForeignKey
ALTER TABLE "QuizAnswer" DROP CONSTRAINT "QuizAnswer_questionId_fkey";

-- DropForeignKey
ALTER TABLE "QuizAnswer" DROP CONSTRAINT "QuizAnswer_quizAttemptId_fkey";

-- DropForeignKey
ALTER TABLE "QuizAttempt" DROP CONSTRAINT "QuizAttempt_bloomLevelId_fkey";

-- DropForeignKey
ALTER TABLE "QuizAttempt" DROP CONSTRAINT "QuizAttempt_topicId_fkey";

-- DropForeignKey
ALTER TABLE "QuizAttempt" DROP CONSTRAINT "QuizAttempt_userId_fkey";

-- DropForeignKey
ALTER TABLE "UserQuestionSet" DROP CONSTRAINT "UserQuestionSet_bloomLevelId_fkey";

-- DropForeignKey
ALTER TABLE "UserQuestionSet" DROP CONSTRAINT "UserQuestionSet_topicId_fkey";

-- DropForeignKey
ALTER TABLE "UserQuestionSet" DROP CONSTRAINT "UserQuestionSet_userId_fkey";

-- DropForeignKey
ALTER TABLE "_QuestionToSet" DROP CONSTRAINT "_QuestionToSet_A_fkey";

-- DropForeignKey
ALTER TABLE "_QuestionToSet" DROP CONSTRAINT "_QuestionToSet_B_fkey";

-- DropTable
DROP TABLE "BloomLevel";

-- DropTable
DROP TABLE "BookChunk";

-- DropTable
DROP TABLE "CachedAnswer";

-- DropTable
DROP TABLE "ChatMessage";

-- DropTable
DROP TABLE "ChatSession";

-- DropTable
DROP TABLE "PerformanceSummary";

-- DropTable
DROP TABLE "Question";

-- DropTable
DROP TABLE "QuizAnswer";

-- DropTable
DROP TABLE "QuizAttempt";

-- DropTable
DROP TABLE "Topic";

-- DropTable
DROP TABLE "User";

-- DropTable
DROP TABLE "UserQuestionSet";

-- DropTable
DROP TABLE "_QuestionToSet";

-- DropEnum
DROP TYPE "MessageRole";

-- DropEnum
DROP TYPE "MessageSource";

-- DropEnum
DROP TYPE "QuestionSource";

-- DropEnum
DROP TYPE "QuestionType";

-- DropEnum
DROP TYPE "QuizStatus";

-- CreateTable
CREATE TABLE "app_users" (
    "id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_sessions" (
    "id" UUID NOT NULL,
    "app_user_id" UUID NOT NULL,
    "refresh_token" VARCHAR(255) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "app_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_sessions" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "module" "NiroModule" NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Session',
    "context" JSONB,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "role" VARCHAR(16) NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_profiles" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "name" TEXT,
    "age" INTEGER,
    "gender" VARCHAR(32),
    "weight_kg" DOUBLE PRECISION,
    "mobile" VARCHAR(32),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "encounters" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "problem" TEXT NOT NULL,
    "symptoms" TEXT NOT NULL,
    "remedy_plan" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "encounters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dosha_assessments" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "vata_score" INTEGER NOT NULL,
    "pitta_score" INTEGER NOT NULL,
    "kapha_score" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dosha_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "case_attempts" (
    "id" TEXT NOT NULL,
    "user_id" UUID NOT NULL,
    "case_text" TEXT NOT NULL,
    "answer_text" TEXT NOT NULL,
    "feedback" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "app_users_email_key" ON "app_users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "app_sessions_refresh_token_key" ON "app_sessions"("refresh_token");

-- CreateIndex
CREATE INDEX "app_sessions_app_user_id_idx" ON "app_sessions"("app_user_id");

-- CreateIndex
CREATE INDEX "app_sessions_expires_at_idx" ON "app_sessions"("expires_at");

-- CreateIndex
CREATE INDEX "chat_sessions_user_id_module_idx" ON "chat_sessions"("user_id", "module");

-- CreateIndex
CREATE INDEX "chat_sessions_updated_at_idx" ON "chat_sessions"("updated_at");

-- CreateIndex
CREATE INDEX "chat_messages_session_id_created_at_idx" ON "chat_messages"("session_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "patient_profiles_user_id_key" ON "patient_profiles"("user_id");

-- CreateIndex
CREATE INDEX "encounters_user_id_created_at_idx" ON "encounters"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "dosha_assessments_user_id_created_at_idx" ON "dosha_assessments"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "case_attempts_user_id_created_at_idx" ON "case_attempts"("user_id", "created_at");

-- AddForeignKey
ALTER TABLE "app_sessions" ADD CONSTRAINT "app_sessions_app_user_id_fkey" FOREIGN KEY ("app_user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_sessions" ADD CONSTRAINT "chat_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "chat_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_profiles" ADD CONSTRAINT "patient_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "encounters" ADD CONSTRAINT "encounters_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dosha_assessments" ADD CONSTRAINT "dosha_assessments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_attempts" ADD CONSTRAINT "case_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "app_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
