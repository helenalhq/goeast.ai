import type { SiteConfig } from './types';

export function getSiteConfig(): SiteConfig {
  return {
    paymentEnabled: process.env.PAYMENT_ENABLED !== 'false',
  };
}
