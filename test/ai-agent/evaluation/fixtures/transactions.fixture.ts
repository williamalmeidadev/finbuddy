import {
  TransactionSource,
  TransactionType,
} from '../../../../src/generated/prisma/enums';
import { EVAL_ACCOUNTS } from './accounts.fixture';

export const EVAL_TRANSACTIONS = {
  TX_A1: {
    id: 'tx-eval-a1-1111-1111-1111',
    accountId: EVAL_ACCOUNTS.ACCOUNT_A1.id,
    categoryId: 'cat-eval-a1-1111-1111-1111',
    type: TransactionType.EXPENSE,
    amount: 150.0,
    description: 'Supermarket shopping',
    source: TransactionSource.MANUAL,
    transactionAt: new Date('2026-09-05'),
  },
  TX_B1: {
    id: 'tx-eval-b1-2222-2222-2222',
    accountId: EVAL_ACCOUNTS.ACCOUNT_B1.id,
    categoryId: 'cat-eval-b1-2222-2222-2222',
    type: TransactionType.INCOME,
    amount: 50000.0,
    description: 'Offshore dividend payment',
    source: TransactionSource.MANUAL,
    transactionAt: new Date('2026-09-05'),
  },
};
