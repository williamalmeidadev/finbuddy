/**
 * Sanitizes input strings by stripping null bytes, control characters,
 * and invisible zero-width unicode characters to prevent injection/truncation attacks.
 */
export function sanitizeString(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  // Remove null bytes (\u0000), control characters (\u0001-\u001F, \u007F-\u009F),
  // and zero-width/invisible characters (\u200B-\u200D, \uFEFF)

  return value
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, '')
    .trim();
}

/**
 * Sanitizes and normalizes email address input.
 * Strips control characters, trims whitespace, and converts to lowercase.
 */
export function sanitizeEmail(value: unknown): unknown {
  if (typeof value !== 'string') {
    return value;
  }
  const sanitized = sanitizeString(value) as string;
  return sanitized.toLowerCase();
}

/**
 * Regex for strict email validation:
 * - Requires standard local part and valid domain
 * - Disallows consecutive dots, starting/ending dots
 * - Disallows script tags or invalid injection characters
 */
export const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function isValidEmail(email: string): boolean {
  if (typeof email !== 'string' || !email || email.length > 254) {
    return false;
  }
  if (email.includes('..') || email.includes('<') || email.includes('>')) {
    return false;
  }
  return EMAIL_REGEX.test(email);
}
