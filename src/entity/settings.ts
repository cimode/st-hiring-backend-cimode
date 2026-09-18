export const CURRENCIES = ['USD', 'EUR', 'GBP'] as const;
export type Currency = (typeof CURRENCIES)[number];

export interface Settings {
  general: {
    siteName: string;
    supportEmail: string;
    currency: Currency;
  };
  ticketing: {
    maxTicketsPerOrder: number;
    reservationTimeoutMinutes: number;
  };
  notifications: {
    emailEnabled: boolean;
    smsEnabled: boolean;
  };
}

/** What GET /settings returns: the settings plus when they were last saved (null = never). */
export interface StoredSettings extends Settings {
  updatedAt: Date | null;
}

export const TICKETING_LIMITS = {
  maxTicketsPerOrder: { min: 1, max: 50 },
  reservationTimeoutMinutes: { min: 1, max: 120 },
} as const;

export const DEFAULT_SETTINGS: Settings = {
  general: {
    siteName: 'SeeTickets',
    supportEmail: 'support@seetickets.example',
    currency: 'USD',
  },
  ticketing: {
    maxTicketsPerOrder: 10,
    reservationTimeoutMinutes: 15,
  },
  notifications: {
    emailEnabled: true,
    smsEnabled: false,
  },
};
