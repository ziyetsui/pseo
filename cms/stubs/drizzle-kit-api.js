// drizzle-kit is used by Payload's migration CLI, never by the runtime Worker.
// Fail closed if a runtime path unexpectedly invokes one of its D1 helpers.
module.exports = {
  generateSQLiteDrizzleJson: () => {
    throw new Error('drizzle-kit/api is unavailable in the runtime Worker')
  },
  generateSQLiteMigration: () => {
    throw new Error('drizzle-kit/api is unavailable in the runtime Worker')
  },
  pushSQLiteSchema: () => {
    throw new Error('drizzle-kit/api is unavailable in the runtime Worker')
  },
}
