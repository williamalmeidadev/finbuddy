-- AlterTable
ALTER TABLE "ai_confirmations" ADD COLUMN "request_id" VARCHAR(64), ADD COLUMN "ai_request_id" VARCHAR(64);

-- CreateTable
CREATE TABLE "ai_audit_events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "request_id" VARCHAR(64) NOT NULL,
    "ai_request_id" VARCHAR(64),
    "event_type" VARCHAR(64) NOT NULL,
    "tool_name" VARCHAR(64),
    "confirmation_id" UUID,
    "status" VARCHAR(32) NOT NULL,
    "risk_level" VARCHAR(16),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_audit_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_audit_events_user_id_idx" ON "ai_audit_events"("user_id");

-- CreateIndex
CREATE INDEX "ai_audit_events_ai_request_id_idx" ON "ai_audit_events"("ai_request_id");

-- CreateIndex
CREATE INDEX "ai_audit_events_confirmation_id_idx" ON "ai_audit_events"("confirmation_id");

-- CreateIndex
CREATE INDEX "ai_audit_events_created_at_idx" ON "ai_audit_events"("created_at");

-- AddForeignKey
ALTER TABLE "ai_audit_events" ADD CONSTRAINT "ai_audit_events_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
