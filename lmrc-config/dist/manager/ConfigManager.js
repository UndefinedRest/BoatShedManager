/**
 * Configuration Manager
 *
 * Handles loading, saving, and validating club configuration files.
 * Uses Zod for runtime validation to ensure config integrity.
 */
import { readFile, writeFile, mkdir } from 'fs/promises';
import { dirname } from 'path';
import { ClubProfileSchema } from '../schemas/index.js';
export class ConfigManager {
    configPath;
    constructor(configPath) {
        this.configPath = configPath;
    }
    /**
     * Load and validate configuration from disk
     */
    async load() {
        try {
            const raw = await readFile(this.configPath, 'utf8');
            const parsed = JSON.parse(raw);
            // Validate with Zod - will throw if invalid
            return ClubProfileSchema.parse(parsed);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                throw new Error(`Configuration file not found: ${this.configPath}`);
            }
            throw error;
        }
    }
    /**
     * Save configuration to disk (with validation)
     */
    async save(config) {
        // Validate before saving
        const validated = ClubProfileSchema.parse(config);
        // Ensure directory exists
        await mkdir(dirname(this.configPath), { recursive: true });
        // Write with pretty formatting
        await writeFile(this.configPath, JSON.stringify(validated, null, 2), 'utf8');
    }
    /**
     * Update sessions only (convenience method)
     */
    async updateSessions(sessions) {
        const config = await this.load();
        config.sessions = sessions;
        await this.save(config);
    }
    /**
     * Add a new session
     */
    async addSession(session) {
        const config = await this.load();
        config.sessions.push(session);
        await this.save(config);
    }
    /**
     * Remove a session by ID
     */
    async removeSession(sessionId) {
        const config = await this.load();
        config.sessions = config.sessions.filter(s => s.id !== sessionId);
        await this.save(config);
    }
    /**
     * Update a single session
     */
    async updateSession(sessionId, updates) {
        const config = await this.load();
        const index = config.sessions.findIndex(s => s.id === sessionId);
        if (index === -1) {
            throw new Error(`Session not found: ${sessionId}`);
        }
        config.sessions[index] = {
            ...config.sessions[index],
            ...updates,
        };
        await this.save(config);
    }
    /**
     * Update branding
     */
    async updateBranding(branding) {
        const config = await this.load();
        config.branding = {
            ...config.branding,
            ...branding,
        };
        await this.save(config);
    }
    /**
     * Check if configuration file exists
     */
    async exists() {
        try {
            await readFile(this.configPath, 'utf8');
            return true;
        }
        catch {
            return false;
        }
    }
}
//# sourceMappingURL=ConfigManager.js.map