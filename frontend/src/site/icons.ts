import type { Metadata } from 'next';

/** Same square mark and dark materials as the existing model/deck wordmark. */
export const siteIcons: Metadata['icons'] = {
  icon: [
    { url: '/favicon.ico', sizes: '64x64', type: 'image/x-icon' },
    { url: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
  ],
};
