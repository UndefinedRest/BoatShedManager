/**
 * Session Schema
 *
 * Defines the structure for rowing session configuration.
 * Sessions are time slots when members can book boats.
 */
import { z } from 'zod';
export declare const SessionSchema: z.ZodObject<{
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
}>;
export type Session = z.infer<typeof SessionSchema>;
/**
 * Validates that end time is after start time
 */
export declare function validateSessionTimes(session: Session): boolean;
/**
 * Formats a session for display
 */
export declare function formatSession(session: Session): string;
//# sourceMappingURL=session.d.ts.map