/**
 * @lmrc/config
 *
 * Shared configuration library for LMRC applications.
 * Provides type-safe configuration schemas and management utilities.
 */
// Export schemas
export { SessionSchema, ClubProfileSchema, validateSessionTimes, formatSession, createDefaultProfile, } from './schemas/index.js';
// Export manager
export { ConfigManager } from './manager/index.js';
//# sourceMappingURL=index.js.map