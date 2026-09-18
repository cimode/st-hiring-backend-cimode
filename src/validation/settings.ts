import { CURRENCIES, Currency, Settings, TICKETING_LIMITS } from '../entity/settings';

export interface FieldError {
  field: string;
  message: string;
}

export type ValidationResult<T> = { ok: true; value: T } | { ok: false; errors: FieldError[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

// Deliberately simple: one "@", something on both sides, no whitespace. Real deliverability
// can only be checked by sending mail; this only catches obvious typos.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Validates an incoming settings document.
 *
 * Builds a brand-new object from the known fields only, so nothing unvalidated (extra keys,
 * prototype pollution attempts, wrong types) ever reaches the database. All field errors are
 * collected in a single pass so a client can fix its payload in one round-trip.
 */
export const validateSettings = (input: unknown): ValidationResult<Settings> => {
  if (!isRecord(input)) {
    return { ok: false, errors: [{ field: '', message: 'body must be an object' }] };
  }

  const errors: FieldError[] = [];
  const section = (name: string) => (isRecord(input[name]) ? (input[name] as Record<string, unknown>) : {});
  const general = section('general');
  const ticketing = section('ticketing');
  const notifications = section('notifications');

  const nonEmptyString = (value: unknown, field: string): string => {
    if (typeof value !== 'string' || value.trim() === '') {
      errors.push({ field, message: 'must be a non-empty string' });
      return '';
    }
    return value;
  };

  const email = (value: unknown, field: string): string => {
    if (typeof value !== 'string' || !EMAIL_PATTERN.test(value)) {
      errors.push({ field, message: 'must be a valid email address' });
      return '';
    }
    return value;
  };

  const currency = (value: unknown, field: string): Currency => {
    if (!CURRENCIES.includes(value as Currency)) {
      errors.push({ field, message: `must be one of ${CURRENCIES.join(', ')}` });
      return CURRENCIES[0];
    }
    return value as Currency;
  };

  const integerInRange = (value: unknown, field: string, { min, max }: { min: number; max: number }): number => {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
      errors.push({ field, message: `must be an integer between ${min} and ${max}` });
      return min;
    }
    return value;
  };

  const boolean = (value: unknown, field: string): boolean => {
    if (typeof value !== 'boolean') {
      errors.push({ field, message: 'must be a boolean' });
      return false;
    }
    return value;
  };

  const value: Settings = {
    general: {
      siteName: nonEmptyString(general.siteName, 'general.siteName'),
      supportEmail: email(general.supportEmail, 'general.supportEmail'),
      currency: currency(general.currency, 'general.currency'),
    },
    ticketing: {
      maxTicketsPerOrder: integerInRange(
        ticketing.maxTicketsPerOrder,
        'ticketing.maxTicketsPerOrder',
        TICKETING_LIMITS.maxTicketsPerOrder,
      ),
      reservationTimeoutMinutes: integerInRange(
        ticketing.reservationTimeoutMinutes,
        'ticketing.reservationTimeoutMinutes',
        TICKETING_LIMITS.reservationTimeoutMinutes,
      ),
    },
    notifications: {
      emailEnabled: boolean(notifications.emailEnabled, 'notifications.emailEnabled'),
      smsEnabled: boolean(notifications.smsEnabled, 'notifications.smsEnabled'),
    },
  };

  return errors.length > 0 ? { ok: false, errors } : { ok: true, value };
};
