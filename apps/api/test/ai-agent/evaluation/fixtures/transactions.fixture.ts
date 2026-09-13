import {
  TransactionSource,
  TransactionType,
} from '../../../../src/generated/prisma/enums';
import { EVAL_ACCOUNTS } from './accounts.fixture';

export const EVAL_TRANSACTIONS = {
  TX_A1: {
    id: 'f1111111-1111-4111-8111-111111111111',
    accountId: EVAL_ACCOUNTS.ACCOUNT_A1.id,
    categoryId: 'c1111111-1111-4111-8111-111111111111',
    type: TransactionType.EXPENSE,
    amount: 150.0,
    description: 'Supermarket shopping',
    source: TransactionSource.MANUAL,
    transactionAt: new Date('2026-09-05'),
  },
  TX_B1: {
    id: 'f2222222-2222-4222-8222-222222222222',
    accountId: EVAL_ACCOUNTS.ACCOUNT_B1.id,
    categoryId: 'c2222222-2222-4222-8222-222222222222',
    type: TransactionType.INCOME,
    amount: 50000.0,
    description: 'Offshore dividend payment',
    source: TransactionSource.MANUAL,
    transactionAt: new Date('2026-09-05'),
  },
  TX_TRANSFER: {
    id: 'f4444444-4444-4444-8444-444444444444',
    accountId: EVAL_ACCOUNTS.ACCOUNT_A1.id,
    categoryId: null,
    type: TransactionType.EXPENSE,
    amount: 200.0,
    description: 'Transfer out',
    source: TransactionSource.SYSTEM,
    transferId: 'tr-eval-1111-1111-1111',
    transactionAt: new Date('2026-09-05'),
  },
  TX_SYSTEM: {
    id: 'f5555555-5555-4555-8555-555555555555',
    accountId: EVAL_ACCOUNTS.ACCOUNT_A1.id,
    categoryId: null,
    type: TransactionType.INCOME,
    amount: 10.0,
    description: 'Interest credit',
    source: TransactionSource.SYSTEM,
    transferId: null,
    transactionAt: new Date('2026-09-05'),
  },
};
