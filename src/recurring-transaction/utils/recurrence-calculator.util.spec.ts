import { RecurrenceFrequency } from '../../generated/prisma/enums';
import { calculateNextOccurrence } from './recurrence-calculator.util';

describe('calculateNextOccurrence', () => {
  it('should advance DAILY recurrence by 1 day', () => {
    const start = new Date(Date.UTC(2026, 8, 10)); // 2026-09-10
    const next = calculateNextOccurrence(start, RecurrenceFrequency.DAILY);
    expect(next?.toISOString().split('T')[0]).toBe('2026-09-11');
  });

  it('should advance WEEKLY recurrence by 7 days', () => {
    const start = new Date(Date.UTC(2026, 8, 10)); // 2026-09-10
    const next = calculateNextOccurrence(start, RecurrenceFrequency.WEEKLY);
    expect(next?.toISOString().split('T')[0]).toBe('2026-09-17');
  });

  it('should advance MONTHLY recurrence by 1 month', () => {
    const start = new Date(Date.UTC(2026, 8, 10)); // 2026-09-10
    const next = calculateNextOccurrence(start, RecurrenceFrequency.MONTHLY);
    expect(next?.toISOString().split('T')[0]).toBe('2026-10-10');
  });

  it('should handle month-end day clamping for MONTHLY (Jan 31 -> Feb 28)', () => {
    const jan31 = new Date(Date.UTC(2026, 0, 31)); // 2026-01-31
    const next = calculateNextOccurrence(jan31, RecurrenceFrequency.MONTHLY);
    expect(next?.toISOString().split('T')[0]).toBe('2026-02-28');
  });

  it('should handle leap year for MONTHLY (Jan 31 -> Feb 29 in 2028)', () => {
    const jan31 = new Date(Date.UTC(2028, 0, 31)); // 2028-01-31
    const next = calculateNextOccurrence(jan31, RecurrenceFrequency.MONTHLY);
    expect(next?.toISOString().split('T')[0]).toBe('2028-02-29');
  });

  it('should advance YEARLY recurrence by 1 year', () => {
    const start = new Date(Date.UTC(2026, 8, 10)); // 2026-09-10
    const next = calculateNextOccurrence(start, RecurrenceFrequency.YEARLY);
    expect(next?.toISOString().split('T')[0]).toBe('2027-09-10');
  });

  it('should handle leap year day for YEARLY (Feb 29 -> Feb 28 in non-leap year)', () => {
    const feb29 = new Date(Date.UTC(2028, 1, 29)); // 2028-02-29
    const next = calculateNextOccurrence(feb29, RecurrenceFrequency.YEARLY);
    expect(next?.toISOString().split('T')[0]).toBe('2029-02-28');
  });

  it('should return null if calculated next occurrence exceeds endDate', () => {
    const start = new Date(Date.UTC(2026, 8, 10));
    const endDate = new Date(Date.UTC(2026, 8, 12));
    const next = calculateNextOccurrence(
      start,
      RecurrenceFrequency.WEEKLY,
      endDate,
    );
    expect(next).toBeNull();
  });
});
