/**
 * FinBuddy Reusable Financial Formatting Utilities
 *
 * Provides locale-aware currency, percentage, and date formatting.
 * Backend remains the authoritative source of financial calculations.
 */

export function formatCurrency(
  amount: number,
  currency = 'BRL',
  locale = 'pt-BR'
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

export function formatPercentage(value: number, locale = 'pt-BR'): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: 'percent',
      minimumFractionDigits: 1,
      maximumFractionDigits: 2,
    }).format(value / 100);
  } catch {
    return `${value.toFixed(1)}%`;
  }
}

export function formatDate(
  dateInput: string | Date,
  locale = 'pt-BR'
): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

export function formatDateTime(
  dateInput: string | Date,
  locale = 'pt-BR'
): string {
  if (!dateInput) return '';
  const date = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function getFinancialVariant(
  amount: number
): 'positive' | 'negative' | 'neutral' {
  if (amount > 0) return 'positive';
  if (amount < 0) return 'negative';
  return 'neutral';
}
