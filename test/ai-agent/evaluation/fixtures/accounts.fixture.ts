import { AccountType } from '../../../../src/generated/prisma/enums';

export const EVAL_USERS = {
  USER_A: 'user-eval-a-1111-1111-1111',
  USER_B: 'user-eval-b-2222-2222-2222',
};

export const EVAL_ACCOUNTS = {
  ACCOUNT_A1: {
    id: 'a1111111-1111-4111-8111-111111111111',
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
    id: 'b2222222-2222-4222-8222-222222222222',
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
  ACCOUNT_A2: {
    id: 'a2222222-2222-4222-8222-222222222222',
    userId: EVAL_USERS.USER_A,
    name: 'Savings Account',
    type: AccountType.SAVINGS,
    balance: 5000.0,
    currency: 'BRL',
    color: '#00FF55',
    isActive: true,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-09-01'),
  },
  ACCOUNT_INACTIVE: {
    id: 'a3333333-3333-4333-8333-333333333333',
    userId: EVAL_USERS.USER_A,
    name: 'Closed Account',
    type: AccountType.CHECKING,
    balance: 0.0,
    currency: 'BRL',
    color: '#888888',
    isActive: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-09-01'),
  },
};
