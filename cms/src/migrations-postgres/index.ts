import * as migration_20260903_060851_initial_postgres_baseline from './20260903_060851_initial_postgres_baseline';
import * as migration_20260903_143750_agent_proposal_api from './20260903_143750_agent_proposal_api';

export const migrations = [
  {
    up: migration_20260903_060851_initial_postgres_baseline.up,
    down: migration_20260903_060851_initial_postgres_baseline.down,
    name: '20260903_060851_initial_postgres_baseline',
  },
  {
    up: migration_20260903_143750_agent_proposal_api.up,
    down: migration_20260903_143750_agent_proposal_api.down,
    name: '20260903_143750_agent_proposal_api'
  },
];
