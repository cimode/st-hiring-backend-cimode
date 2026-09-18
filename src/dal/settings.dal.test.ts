import { Db } from 'mongodb';
import { createSettingsDAL, SETTINGS_COLLECTION, SETTINGS_DOCUMENT_ID, SettingsDocument } from './settings.dal';
import { DEFAULT_SETTINGS, Settings } from '../entity/settings';

const settings: Settings = {
  general: { siteName: 'Acme', supportEmail: 'help@acme.test', currency: 'GBP' },
  ticketing: { maxTicketsPerOrder: 4, reservationTimeoutMinutes: 30 },
  notifications: { emailEnabled: false, smsEnabled: true },
};

const setup = (stored: SettingsDocument | null) => {
  const collection = {
    findOne: jest.fn().mockResolvedValue(stored),
    updateOne: jest.fn().mockResolvedValue({ acknowledged: true }),
  };
  const db = { collection: jest.fn().mockReturnValue(collection) } as unknown as Db;
  return { collection, db, dal: createSettingsDAL(db) };
};

describe('settings DAL', () => {
  it('uses the settings collection', () => {
    const { db } = setup(null);
    expect(db.collection).toHaveBeenCalledWith(SETTINGS_COLLECTION);
  });

  it('returns defaults with updatedAt null when nothing was saved, without writing', async () => {
    // Arrange
    const { dal, collection } = setup(null);

    // Act
    const result = await dal.getSettings();

    // Assert
    expect(collection.findOne).toHaveBeenCalledWith({ _id: SETTINGS_DOCUMENT_ID });
    expect(result).toEqual({ ...DEFAULT_SETTINGS, updatedAt: null });
    expect(collection.updateOne).not.toHaveBeenCalled();
  });

  it('returns the stored document without its _id', async () => {
    // Arrange
    const updatedAt = new Date('2026-01-02T03:04:05Z');
    const { dal } = setup({ _id: SETTINGS_DOCUMENT_ID, ...settings, updatedAt });

    // Act
    const result = await dal.getSettings();

    // Assert
    expect(result).toEqual({ ...settings, updatedAt });
    expect(result).not.toHaveProperty('_id');
  });

  it('upserts the singleton document on save and returns it with a timestamp', async () => {
    // Arrange
    const { dal, collection } = setup(null);
    const before = Date.now();

    // Act
    const result = await dal.saveSettings(settings);

    // Assert
    expect(collection.updateOne).toHaveBeenCalledTimes(1);
    const [filter, update, options] = collection.updateOne.mock.calls[0];
    expect(filter).toEqual({ _id: SETTINGS_DOCUMENT_ID });
    expect(options).toEqual({ upsert: true });
    expect(update).toEqual({ $set: { ...settings, updatedAt: expect.any(Date) } });
    expect(result).toEqual({ ...settings, updatedAt: expect.any(Date) });
    expect(result.updatedAt!.getTime()).toBeGreaterThanOrEqual(before);
  });
});
