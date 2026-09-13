import { EVAL_USERS } from './accounts.fixture';

export const EVAL_CATEGORIES = {
  CAT_A1: {
    id: 'c1111111-1111-4111-8111-111111111111',
    userId: EVAL_USERS.USER_A,
    name: 'Groceries',
  },
  CAT_B1: {
    id: 'c2222222-2222-4222-8222-222222222222',
    userId: EVAL_USERS.USER_B,
    name: 'Secret Project',
  },
  INCOME_CAT: {
    id: 'c3333333-3333-4333-8333-333333333333',
    userId: EVAL_USERS.USER_A,
    name: 'Salary',
    type: 'INCOME',
  },
};

export const EVAL_BUDGETS = {
  BUDGET_A1: {
    id: 'bud-eval-a1-1111-1111-1111',
    userId: EVAL_USERS.USER_A,
    categoryId: EVAL_CATEGORIES.CAT_A1.id,
    month: new Date('2026-09-01'),
    amount: 1000.0,
    spent: 350.0,
    remaining: 650.0,
    percentageUsed: 35.0,
  },
  BUDGET_B1: {
    id: 'bud-eval-b1-2222-2222-2222',
    userId: EVAL_USERS.USER_B,
    categoryId: EVAL_CATEGORIES.CAT_B1.id,
    month: new Date('2026-09-01'),
    amount: 50000.0,
    spent: 12000.0,
    remaining: 38000.0,
    percentageUsed: 24.0,
  },
};
