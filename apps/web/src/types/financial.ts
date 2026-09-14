export type AccountType = 'checking' | 'savings' | 'credit_card' | 'investment' | 'cash';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  limit?: number; // for credit cards
  color: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'expense' | 'income';
  icon: string;
  color: string;
  budgetLimit?: number; // Optional monthly limit
}

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense' | 'transfer';
  categoryId?: string;
  accountId: string;
  destinationAccountId?: string; // only for transfer type
  date: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline: string;
  accountId: string; // Account designated for this goal
  color: string;
}

export interface User {
  name: string;
  email: string;
  avatarUrl?: string;
}

export type ActiveTab = 'overview' | 'accounts' | 'transactions' | 'categories' | 'goals';
export type AuthView = 'login' | 'register' | 'forgot-password';
