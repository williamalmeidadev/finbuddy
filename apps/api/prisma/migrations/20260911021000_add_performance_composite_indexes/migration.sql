-- CreateIndex
CREATE INDEX "budgets_user_id_month_idx" ON "budgets"("user_id", "month");

-- CreateIndex
CREATE INDEX "recurring_transactions_is_active_next_occurrence_idx" ON "recurring_transactions"("is_active", "next_occurrence");

-- CreateIndex
CREATE INDEX "transactions_account_id_transaction_at_idx" ON "transactions"("account_id", "transaction_at" DESC);

-- CreateIndex
CREATE INDEX "transactions_category_id_transaction_at_idx" ON "transactions"("category_id", "transaction_at");

-- CreateIndex
CREATE INDEX "transfers_from_account_id_transaction_at_idx" ON "transfers"("from_account_id", "transaction_at");

-- CreateIndex
CREATE INDEX "transfers_to_account_id_transaction_at_idx" ON "transfers"("to_account_id", "transaction_at");
