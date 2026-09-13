-- AlterTable
ALTER TABLE "transactions" ADD COLUMN "recurring_transaction_id" UUID,
ADD COLUMN "recurring_occurrence" DATE;

-- CreateIndex
CREATE INDEX "transactions_recurring_transaction_id_idx" ON "transactions"("recurring_transaction_id");

-- CreateIndex
CREATE UNIQUE INDEX "transactions_recurring_transaction_id_recurring_occurrence_key" ON "transactions"("recurring_transaction_id", "recurring_occurrence");

-- AddForeignKey
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_recurring_transaction_id_fkey" FOREIGN KEY ("recurring_transaction_id") REFERENCES "recurring_transactions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
