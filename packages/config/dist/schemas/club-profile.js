/**
 * Club Profile Schema
 *
 * Defines the complete configuration for a rowing club.
 * This is the master configuration that includes branding,
 * sessions, and integration settings.
 */
import { z } from 'zod';
import { SessionSchema } from './session.js';
export const ClubProfileSchema = z.object({
    version: z.string(), // "1.0.0"
    club: z.object({
        id: z.string().min(1), // "lmrc" (lowercase, no spaces)
        name: z.string().min(1), // "Lake Macquarie Rowing Club"
        shortName: z.string().min(1), // "LMRC"
        timezone: z.string(), // "Australia/Sydney"
    }),
    branding: z.object({
        logoUrl: z.string().url(),
        primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
        secondaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    }),
    sessions: z.array(SessionSchema).min(1), // At least one session required
    revSport: z.object({
        baseUrl: z.string().url(),
        // Note: credentials NOT stored in config (kept separate for security)
    }),
});
/**
 * Creates a default club profile template
 */
export function createDefaultProfile(clubId, clubName) {
    return {
        version: '1.0.0',
        club: {
            id: clubId.toLowerCase().replace(/\s+/g, '-'),
            name: clubName,
            shortName: clubName.split(' ').map(w => w[0]).join('').toUpperCase(),
            timezone: 'Australia/Sydney',
        },
        branding: {
            logoUrl: 'https://via.placeholder.com/150',
            primaryColor: '#1e40af',
            secondaryColor: '#0ea5e9',
        },
        sessions: [
            {
                id: 'AM',
                name: 'Morning',
                startTime: '06:30',
                endTime: '08:30',
                daysOfWeek: [1, 2, 3, 4, 5],
                color: '#3b82f6',
                priority: 1,
            },
        ],
        revSport: {
            baseUrl: '',
        },
    };
}
//# sourceMappingURL=club-profile.js.map