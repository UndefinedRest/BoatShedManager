/**
 * Configuration Manager
 *
 * Handles loading, saving, and validating club configuration files.
 * Uses Zod for runtime validation to ensure config integrity.
 */
import { ClubProfile, Session } from '../schemas/index.js';
export declare class ConfigManager {
    private configPath;
    constructor(configPath: string);
    /**
     * Load and validate configuration from disk
     */
    load(): Promise<ClubProfile>;
    /**
     * Save configuration to disk (with validation)
     */
    save(config: ClubProfile): Promise<void>;
    /**
     * Update sessions only (convenience method)
     */
    updateSessions(sessions: Session[]): Promise<void>;
    /**
     * Add a new session
     */
    addSession(session: Session): Promise<void>;
    /**
     * Remove a session by ID
     */
    removeSession(sessionId: string): Promise<void>;
    /**
     * Update a single session
     */
    updateSession(sessionId: string, updates: Partial<Session>): Promise<void>;
    /**
     * Update branding
     */
    updateBranding(branding: Partial<ClubProfile['branding']>): Promise<void>;
    /**
     * Check if configuration file exists
     */
    exists(): Promise<boolean>;
}
//# sourceMappingURL=ConfigManager.d.ts.map