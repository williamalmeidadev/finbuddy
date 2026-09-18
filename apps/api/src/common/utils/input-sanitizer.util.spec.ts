import {
  sanitizeString,
  sanitizeEmail,
  isValidEmail,
} from './input-sanitizer.util';

describe('input-sanitizer.util', () => {
  describe('sanitizeString', () => {
    it('should strip null bytes and control characters', () => {
      const input = 'hello\u0000world\u0007!';
      expect(sanitizeString(input)).toBe('helloworld!');
    });

    it('should strip zero-width spaces', () => {
      const input = 'user\u200B@example.com';
      expect(sanitizeString(input)).toBe('user@example.com');
    });

    it('should trim outer whitespace', () => {
      const input = '   password123   ';
      expect(sanitizeString(input)).toBe('password123');
    });

    it('should return non-string inputs as is', () => {
      expect(sanitizeString(123 as any)).toBe(123);
      expect(sanitizeString(null as any)).toBe(null);
    });
  });

  describe('sanitizeEmail', () => {
    it('should trim and lowercase email address', () => {
      const input = '  USER.NAME+tag@EXAMPLE.COM  ';
      expect(sanitizeEmail(input)).toBe('user.name+tag@example.com');
    });

    it('should strip control characters and null bytes from email', () => {
      const input = 'user\u0000name\u001F@domain.com';
      expect(sanitizeEmail(input)).toBe('username@domain.com');
    });

    it('should return non-string input as is', () => {
      expect(sanitizeEmail(undefined as any)).toBe(undefined);
    });
  });

  describe('isValidEmail', () => {
    it('should return true for valid email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('user.name+tag@sub.example.co.uk')).toBe(true);
    });

    it('should return false for emails exceeding 254 characters', () => {
      const longEmail = 'a'.repeat(250) + '@example.com';
      expect(isValidEmail(longEmail)).toBe(false);
    });

    it('should return false for malformed or dangerous email addresses', () => {
      expect(isValidEmail('user@')).toBe(false);
      expect(isValidEmail('@example.com')).toBe(false);
      expect(isValidEmail('user..name@example.com')).toBe(false);
      expect(isValidEmail('user@domain..com')).toBe(false);
      expect(isValidEmail('<script>alert(1)</script>@example.com')).toBe(false);
      expect(isValidEmail("SELECT * FROM users'@example.com")).toBe(false);
    });
  });
});
