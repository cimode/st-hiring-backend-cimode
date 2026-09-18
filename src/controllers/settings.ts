import { Request, Response } from 'express';
import { SettingsDAL } from '../dal/settings.dal';
import { validateSettings } from '../validation/settings';

export const createSettingsController = ({ settingsDAL }: { settingsDAL: SettingsDAL }) => ({
  getSettings: async (_req: Request, res: Response) => {
    res.json(await settingsDAL.getSettings());
  },

  saveSettings: async (req: Request, res: Response) => {
    // express.json() only parses application/json; anything else arrives as an undefined body.
    if (!req.is('application/json')) {
      res.status(415).json({
        error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Content-Type must be application/json' },
      });
      return;
    }

    const validation = validateSettings(req.body);
    if (validation.ok === false) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid settings', details: validation.errors },
      });
      return;
    }

    res.json(await settingsDAL.saveSettings(validation.value));
  },
});
