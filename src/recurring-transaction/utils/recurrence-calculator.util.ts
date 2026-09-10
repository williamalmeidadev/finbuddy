import { RecurrenceFrequency } from '../../generated/prisma/enums';

export function calculateNextOccurrence(
  currentDate: Date,
  frequency: RecurrenceFrequency,
  endDate?: Date | null,
): Date | null {
  const origDay = currentDate.getUTCDate();
  let year = currentDate.getUTCFullYear();
  let month = currentDate.getUTCMonth();
  let day = currentDate.getUTCDate();

  let next: Date;

  switch (frequency) {
    case RecurrenceFrequency.DAILY:
      next = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));
      break;

    case RecurrenceFrequency.WEEKLY:
      next = new Date(Date.UTC(year, month, day + 7, 0, 0, 0, 0));
      break;

    case RecurrenceFrequency.MONTHLY: {
      const targetMonth = month + 1;
      year += Math.floor(targetMonth / 12);
      month = targetMonth % 12;
      const maxDays = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      day = Math.min(origDay, maxDays);
      next = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      break;
    }

    case RecurrenceFrequency.YEARLY: {
      year += 1;
      const maxDays = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      day = Math.min(origDay, maxDays);
      next = new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
      break;
    }

    default:
      next = new Date(Date.UTC(year, month, day + 1, 0, 0, 0, 0));
  }

  if (endDate && next > endDate) {
    return null;
  }

  return next;
}
