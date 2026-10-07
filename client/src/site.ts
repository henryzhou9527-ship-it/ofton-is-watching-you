import settings from '../../deployment/site.config.json';

export const SITE_NAME = 'お布団巻き is watching you';
// VITE variables are public build-time settings, never device or database secrets.
export const SITE_SETTINGS = {
  displayName: (import.meta.env.VITE_DISPLAY_NAME ?? settings.displayName).trim(),
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? settings.apiBaseUrl).trim(),
};
