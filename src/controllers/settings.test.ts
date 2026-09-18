import { Request } from 'express';
import { createSettingsController } from './settings';
import { SettingsDAL } from '../dal/settings.dal';
import { DEFAULT_SETTINGS, Settings } from '../entity/settings';
import { fakeRequest, fakeResponse } from '../test-utils/express';

const settings: Settings = {
  general: { siteName: 'Acme', supportEmail: 'help@acme.test', currency: 'GBP' },
  ticketing: { maxTicketsPerOrder: 4, reservationTimeoutMinutes: 30 },
  notifications: { emailEnabled: false, smsEnabled: true },
};

const jsonRequest = (body: unknown, contentType: string | null = 'application/json'): Request =>
  Object.assign(fakeRequest({ body }), { is: (type: string) => (contentType === type ? type : false) });

const setup = () => {
  const settingsDAL: jest.Mocked<SettingsDAL> = {
    getSettings: jest.fn().mockResolvedValue({ ...DEFAULT_SETTINGS, updatedAt: null }),
    saveSettings: jest.fn(async (value: Settings) => ({ ...value, updatedAt: new Date('2026-05-06T00:00:00Z') })),
  };
  return { settingsDAL, controller: createSettingsController({ settingsDAL }) };
};

describe('settings controller', () => {
  it('GET returns whatever the DAL provides', async () => {
    // Arrange
    const { controller } = setup();
    const response = fakeResponse();

    // Act
    await controller.getSettings(fakeRequest(), response.res);

    // Assert
    expect(response.statusCode()).toBe(200);
    expect(response.body()).toEqual({ ...DEFAULT_SETTINGS, updatedAt: null });
  });

  it('POST saves a valid body and returns the stored document', async () => {
    // Arrange
    const { controller, settingsDAL } = setup();
    const response = fakeResponse();

    // Act
    await controller.saveSettings(jsonRequest({ ...settings, extra: 'dropped' }), response.res);

    // Assert
    expect(settingsDAL.saveSettings).toHaveBeenCalledWith(settings);
    expect(response.statusCode()).toBe(200);
    expect(response.body()).toEqual({ ...settings, updatedAt: new Date('2026-05-06T00:00:00Z') });
  });

  it('POST rejects an invalid body with 400 and field details, without saving', async () => {
    // Arrange
    const { controller, settingsDAL } = setup();
    const response = fakeResponse();

    // Act
    await controller.saveSettings(
      jsonRequest({ ...settings, general: { ...settings.general, currency: 'XXX' } }),
      response.res,
    );

    // Assert
    expect(response.statusCode()).toBe(400);
    expect(response.body()).toEqual({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid settings',
        details: [{ field: 'general.currency', message: 'must be one of USD, EUR, GBP' }],
      },
    });
    expect(settingsDAL.saveSettings).not.toHaveBeenCalled();
  });

  it('POST rejects non-JSON content types with 415', async () => {
    // Arrange
    const { controller, settingsDAL } = setup();
    const response = fakeResponse();

    // Act
    await controller.saveSettings(jsonRequest(undefined, 'text/plain'), response.res);

    // Assert
    expect(response.statusCode()).toBe(415);
    expect(settingsDAL.saveSettings).not.toHaveBeenCalled();
  });
});
