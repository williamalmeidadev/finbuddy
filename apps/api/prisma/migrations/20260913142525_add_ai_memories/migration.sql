-- CreateEnum
CREATE TYPE "AiMemoryType" AS ENUM ('PREFERENCE', 'FINANCIAL_GOAL', 'GENERAL_CONTEXT');

-- CreateTable
CREATE TABLE "ai_memories" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "type" "AiMemoryType" NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "value" VARCHAR(1000) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "ai_memories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_memories_user_id_idx" ON "ai_memories"("user_id");

-- CreateIndex
CREATE INDEX "ai_memories_user_id_type_idx" ON "ai_memories"("user_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "ai_memories_user_id_type_key_key" ON "ai_memories"("user_id", "type", "key");

-- AddForeignKey
ALTER TABLE "ai_memories" ADD CONSTRAINT "ai_memories_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
