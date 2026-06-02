import { describe, it, expect } from 'vitest';
import { normalizePhoneNumber, isValidPhoneNumber } from './phone';

describe('normalizePhoneNumber', () => {
  it('should return empty string for empty input', () => {
    expect(normalizePhoneNumber('')).toBe('');
  });

  it('should normalize standard Indonesian local formats', () => {
    expect(normalizePhoneNumber('087825515689')).toBe('+6287825515689');
    expect(normalizePhoneNumber('6287825515689')).toBe('+6287825515689');
    expect(normalizePhoneNumber('87825515689')).toBe('+6287825515689');
    expect(normalizePhoneNumber('+6287825515689')).toBe('+6287825515689');
  });

  it('should remove spaces, dashes, and parentheses', () => {
    expect(normalizePhoneNumber('0878-2551-5689')).toBe('+6287825515689');
    expect(normalizePhoneNumber('(0878) 2551 5689')).toBe('+6287825515689');
    expect(normalizePhoneNumber(' +62 878 2551 5689 ')).toBe('+6287825515689');
  });
});

describe('isValidPhoneNumber', () => {
  it('should validate standard normalized format (+628xxxxxxxxxx)', () => {
    expect(isValidPhoneNumber('+6287825515689')).toBe(true);
    expect(isValidPhoneNumber('+6281234567890')).toBe(true);
    expect(isValidPhoneNumber('+6289999999999')).toBe(true);
  });

  it('should reject local formats without normalization', () => {
    expect(isValidPhoneNumber('087825515689')).toBe(false);
    expect(isValidPhoneNumber('87825515689')).toBe(false);
  });

  it('should reject invalid prefixes', () => {
    expect(isValidPhoneNumber('+627123456789')).toBe(false); // not starting with 8
    expect(isValidPhoneNumber('+628023456789')).toBe(false); // starting with 80
  });

  it('should reject invalid lengths', () => {
    expect(isValidPhoneNumber('+6281234567')).toBe(false); // too short
    expect(isValidPhoneNumber('+6281234567890123')).toBe(false); // too long
  });
});
