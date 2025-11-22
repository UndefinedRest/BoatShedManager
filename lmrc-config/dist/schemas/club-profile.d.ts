/**
 * Club Profile Schema
 *
 * Defines the complete configuration for a rowing club.
 * This is the master configuration that includes branding,
 * sessions, and integration settings.
 */
import { z } from 'zod';
export declare const ClubProfileSchema: z.ZodObject<{
    version: z.ZodString;
    club: z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        shortName: z.ZodString;
        timezone: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        shortName: string;
        timezone: string;
    }, {
        id: string;
        name: string;
        shortName: string;
        timezone: string;
    }>;
    branding: z.ZodObject<{
        logoUrl: z.ZodString;
        primaryColor: z.ZodString;
        secondaryColor: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        logoUrl: string;
        primaryColor: string;
        secondaryColor: string;
    }, {
        logoUrl: string;
        primaryColor: string;
        secondaryColor: string;
    }>;
    sessions: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        name: z.ZodString;
        startTime: z.ZodString;
        endTime: z.ZodString;
        daysOfWeek: z.ZodArray<z.ZodNumber, "many">;
        color: z.ZodOptional<z.ZodString>;
        priority: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        startTime: string;
        endTime: string;
        daysOfWeek: number[];
        color?: string | undefined;
        priority?: number | undefined;
    }, {
        id: string;
        name: string;
        startTime: string;
        endTime: string;
        daysOfWeek: number[];
        color?: string | undefined;
        priority?: number | undefined;
    }>, "many">;
    revSport: z.ZodObject<{
        baseUrl: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        baseUrl: string;
    }, {
        baseUrl: string;
    }>;
}, "strip", z.ZodTypeAny, {
    version: string;
    club: {
        id: string;
        name: string;
        shortName: string;
        timezone: string;
    };
    branding: {
        logoUrl: string;
        primaryColor: string;
        secondaryColor: string;
    };
    sessions: {
        id: string;
        name: string;
        startTime: string;
        endTime: string;
        daysOfWeek: number[];
        color?: string | undefined;
        priority?: number | undefined;
    }[];
    revSport: {
        baseUrl: string;
    };
}, {
    version: string;
    club: {
        id: string;
        name: string;
        shortName: string;
        timezone: string;
    };
    branding: {
        logoUrl: string;
        primaryColor: string;
        secondaryColor: string;
    };
    sessions: {
        id: string;
        name: string;
        startTime: string;
        endTime: string;
        daysOfWeek: number[];
        color?: string | undefined;
        priority?: number | undefined;
    }[];
    revSport: {
        baseUrl: string;
    };
}>;
export type ClubProfile = z.infer<typeof ClubProfileSchema>;
/**
 * Creates a default club profile template
 */
export declare function createDefaultProfile(clubId: string, clubName: string): ClubProfile;
//# sourceMappingURL=club-profile.d.ts.map