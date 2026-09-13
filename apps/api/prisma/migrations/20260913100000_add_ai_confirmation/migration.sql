-- CreateEnum
CREATE TYPE "AiConfirmationStatus" AS ENUM ('PENDING', 'CONSUMED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ai_confirmations" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "tool_name" VARCHAR(100) NOT NULL,
    "arguments_json" JSONB NOT NULL,
    "status" "AiConfirmationStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "consumed_at" TIMESTAMPTZ,

    CONSTRAINT "ai_confirmations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_confirmations_user_id_idx" ON "ai_confirmations"("user_id");

-- CreateIndex
CREATE INDEX "ai_confirmations_user_id_status_idx" ON "ai_confirmations"("user_id", "status");

-- CreateIndex
CREATE INDEX "ai_confirmations_status_expires_at_idx" ON "ai_confirmations"("status", "expires_at");

-- AddForeignKey
ALTER TABLE "ai_confirmations" ADD CONSTRAINT "ai_confirmations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
