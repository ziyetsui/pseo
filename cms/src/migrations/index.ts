import * as migration_20260902_225800_initial_cloudflare_d1 from './20260902_225800_initial_cloudflare_d1';
import * as migration_20260903_042456 from './20260903_042456';
import * as migration_20260903_043011 from './20260903_043011';
import * as migration_20260903_120000_content_withdrawals from './20260903_120000_content_withdrawals';

export const migrations = [
  {
    up: migration_20260902_225800_initial_cloudflare_d1.up,
    down: migration_20260902_225800_initial_cloudflare_d1.down,
    name: '20260902_225800_initial_cloudflare_d1',
  },
  {
    up: migration_20260903_042456.up,
    down: migration_20260903_042456.down,
    name: '20260903_042456',
  },
  {
    up: migration_20260903_043011.up,
    down: migration_20260903_043011.down,
    name: '20260903_043011'
  },
  {
    up: migration_20260903_120000_content_withdrawals.up,
    down: migration_20260903_120000_content_withdrawals.down,
    name: '20260903_120000_content_withdrawals',
  },
];
