import { Collection, Db } from 'mongodb';
import { DEFAULT_SETTINGS, Settings, StoredSettings } from '../entity/settings';

/**
 * Settings are a singleton: one document with a fixed _id. Using a constant _id (instead of
 * "the first document in the collection") makes the upsert atomic and idempotent, and rules
 * out ever having two settings documents.
 */
export const SETTINGS_DOCUMENT_ID = 'global';
export const SETTINGS_COLLECTION = 'settings';

export interface SettingsDocument extends Settings {
  _id: string;
  updatedAt: Date;
}

export interface SettingsDAL {
  /** Current settings, or the defaults (with updatedAt: null) when nothing was ever saved. */
  getSettings(): Promise<StoredSettings>;
  /** Full replacement of the settings document; creates it on first call. */
  saveSettings(settings: Settings): Promise<StoredSettings>;
}

export const createSettingsDAL = (db: Db): SettingsDAL => {
  const collection: Collection<SettingsDocument> = db.collection<SettingsDocument>(SETTINGS_COLLECTION);

  return {
    async getSettings() {
      const document = await collection.findOne({ _id: SETTINGS_DOCUMENT_ID });
      if (!document) {
        // GET never writes: returning defaults keeps reads side-effect free.
        return { ...DEFAULT_SETTINGS, updatedAt: null };
      }
      const { _id, ...settings } = document;
      void _id;
      return settings;
    },

    async saveSettings(settings) {
      const updatedAt = new Date();
      await collection.updateOne({ _id: SETTINGS_DOCUMENT_ID }, { $set: { ...settings, updatedAt } }, { upsert: true });
      return { ...settings, updatedAt };
    },
  };
};
