import { describe, it, expect } from 'vitest';
import { parseApiErrorMessage } from './error-utils';

describe('parseApiErrorMessage', () => {
  it('extracts nested error.message from backend ApiError format', () => {
    const bePayload = {
      success: false,
      error: {
        code: 'CHECKIN_5002',
        message: 'Tamu sudah melakukan check-in sebelumnya',
      },
    };
    expect(parseApiErrorMessage(bePayload)).toBe('Tamu sudah melakukan check-in sebelumnya');
  });

  it('extracts top-level message if present', () => {
    const payload = { message: 'Kapasitas penuh' };
    expect(parseApiErrorMessage(payload)).toBe('Kapasitas penuh');
  });

  it('extracts message from Error instance', () => {
    const err = new Error('Network timeout');
    expect(parseApiErrorMessage(err)).toBe('Network timeout');
  });

  it('handles string errors and fallback properly', () => {
    expect(parseApiErrorMessage('Gagal scan')).toBe('Gagal scan');
    expect(parseApiErrorMessage(null, 'Fallback msg')).toBe('Fallback msg');
    expect(parseApiErrorMessage({}, 'Fallback msg')).toBe('Fallback msg');
    expect(parseApiErrorMessage(undefined, 'Fallback msg')).toBe('Fallback msg');
  });
});
