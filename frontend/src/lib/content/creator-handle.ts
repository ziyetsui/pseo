/**
 * Formats a creator handle for display without changing the repository value.
 * Fixture data already includes `@`, while API/test adapters may provide a
 * bare handle, so every presentation surface goes through this boundary.
 */
export function formatCreatorHandle(handle: string): string {
  return `@${handle.trim().replace(/^@+/, "")}`;
}
