import { validateSettings } from './settings';

const valid = {
  general: { siteName: 'SeeTickets', supportEmail: 'support@example.com', currency: 'EUR' },
  ticketing: { maxTicketsPerOrder: 10, reservationTimeoutMinutes: 15 },
  notifications: { emailEnabled: true, smsEnabled: false },
};

const fields = (input: unknown) => {
  const result = validateSettings(input);
  return result.ok === false ? result.errors.map((e) => e.field) : [];
};

describe('validateSettings', () => {
  it('accepts a valid document', () => {
    expect(validateSettings(valid)).toEqual({ ok: true, value: valid });
  });

  it('returns a fresh object built only from known fields', () => {
    // Arrange
    const input = { ...valid, extra: 'ignored', general: { ...valid.general, injected: true } };

    // Act
    const result = validateSettings(input);

    // Assert
    expect(result).toEqual({ ok: true, value: valid });
    if (result.ok === true) expect(result.value).not.toBe(input);
  });

  it.each([null, undefined, 'text', 42, [], true])('rejects a non-object body: %p', (body) => {
    expect(validateSettings(body)).toEqual({ ok: false, errors: [{ field: '', message: 'body must be an object' }] });
  });

  it('reports every missing field when sections are absent', () => {
    expect(fields({})).toEqual([
      'general.siteName',
      'general.supportEmail',
      'general.currency',
      'ticketing.maxTicketsPerOrder',
      'ticketing.reservationTimeoutMinutes',
      'notifications.emailEnabled',
      'notifications.smsEnabled',
    ]);
  });

  it.each(['', '   ', 5, null])('rejects siteName=%p', (siteName) => {
    expect(fields({ ...valid, general: { ...valid.general, siteName } })).toEqual(['general.siteName']);
  });

  it.each(['not-an-email', 'a@', '@b.com', 'a b@c.com', ''])('rejects supportEmail=%p', (supportEmail) => {
    expect(fields({ ...valid, general: { ...valid.general, supportEmail } })).toEqual(['general.supportEmail']);
  });

  it.each(['usd', 'XXX', 1, null])('rejects currency=%p', (currency) => {
    const result = validateSettings({ ...valid, general: { ...valid.general, currency } });
    expect(result).toEqual({
      ok: false,
      errors: [{ field: 'general.currency', message: 'must be one of USD, EUR, GBP' }],
    });
  });

  it.each([0, 51, 1.5, '10', null])('rejects maxTicketsPerOrder=%p', (maxTicketsPerOrder) => {
    expect(fields({ ...valid, ticketing: { ...valid.ticketing, maxTicketsPerOrder } })).toEqual([
      'ticketing.maxTicketsPerOrder',
    ]);
  });

  it.each([0, 121, 2.5, '15'])('rejects reservationTimeoutMinutes=%p', (reservationTimeoutMinutes) => {
    expect(fields({ ...valid, ticketing: { ...valid.ticketing, reservationTimeoutMinutes } })).toEqual([
      'ticketing.reservationTimeoutMinutes',
    ]);
  });

  it('accepts the range boundaries', () => {
    const boundaries = { ...valid, ticketing: { maxTicketsPerOrder: 50, reservationTimeoutMinutes: 120 } };
    expect(validateSettings(boundaries)).toEqual({ ok: true, value: boundaries });
  });

  it.each(['true', 1, null])('rejects non-boolean notification flags: %p', (flag) => {
    expect(fields({ ...valid, notifications: { emailEnabled: flag, smsEnabled: flag } })).toEqual([
      'notifications.emailEnabled',
      'notifications.smsEnabled',
    ]);
  });

  it('collects errors across sections in one pass', () => {
    const broken = {
      general: { siteName: '', supportEmail: 'x', currency: 'EUR' },
      ticketing: { maxTicketsPerOrder: 10, reservationTimeoutMinutes: 999 },
      notifications: { emailEnabled: true, smsEnabled: 'no' },
    };
    expect(fields(broken)).toEqual([
      'general.siteName',
      'general.supportEmail',
      'ticketing.reservationTimeoutMinutes',
      'notifications.smsEnabled',
    ]);
  });
});
