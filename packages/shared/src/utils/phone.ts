/**
 * Normalizes an Indonesian phone number to international format '+628xxxxxxxxxx'.
 *
 * Handles inputs like:
 * - '087825515689' -> '+6287825515689'
 * - '87825515689' -> '+6287825515689'
 * - '6287825515689' -> '+6287825515689'
 * - '+6287825515689' -> '+6287825515689'
 * - '0878-2551-5689' -> '+6287825515689'
 * - '(0878) 2551 5689' -> '+6287825515689'
 *
 * @param phone - The raw phone number input string
 * @returns The normalized phone number or empty string
 */
export function normalizePhoneNumber(phone: string): string {
  if (!phone) return '';

  // 1. Remove all spaces, dashes, parentheses, and non-numeric characters except leading '+'
  let cleaned = phone.replace(/[^\d+]/g, '').trim();

  // 2. Handle different prefixes
  if (cleaned.startsWith('08')) {
    cleaned = '+62' + cleaned.slice(1);
  } else if (cleaned.startsWith('628')) {
    cleaned = '+' + cleaned;
  } else if (cleaned.startsWith('8')) {
    cleaned = '+62' + cleaned;
  } else if (cleaned.startsWith('+628')) {
    // already normalized
  }

  return cleaned;
}

/**
 * Validates if the phone number is a valid Indonesian mobile phone number.
 * Valid format must be '+628xxxxxxxxxx' where:
 * - Starts with '+628'
 * - Followed by a non-zero digit [1-9] (provider digit)
 * - Followed by 7 to 11 digits
 * - Total length excluding + is 11 to 15 digits (total length including + is 12 to 16 characters)
 *
 * @param phone - The normalized phone number string
 * @returns True if valid, false otherwise
 */
export function isValidPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const phoneRegex = /^\+628[1-9][0-9]{7,11}$/;
  return phoneRegex.test(phone);
}
