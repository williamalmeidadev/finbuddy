import { AccountType } from '../../../../src/generated/prisma/enums';

export const EVAL_USERS = {
  USER_A: 'user-eval-a-1111-1111-1111',
  USER_B: 'user-eval-b-2222-2222-2222',
};

export const EVAL_ACCOUNTS = {
  ACCOUNT_A1: {
    id: 'acc-eval-a1-1111-1111-1111',
    userId: EVAL_USERS.USER_A,
    name: 'Checking Account',
    type: AccountType.CHECKING,
    balance: 2500.0,
    currency: 'BRL',
    color: '#0055FF',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-09-01'),
  },
  ACCOUNT_B1: {
    id: 'acc-eval-b1-2222-2222-2222',
    userId: EVAL_USERS.USER_B,
    name: 'Secret Investment Account',
    type: AccountType.INVESTMENT,
    balance: 99000.0,
    currency: 'USD',
    color: '#FF0000',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-09-01'),
  },
};
