/**
 * Session Schema
 *
 * Defines the structure for rowing session configuration.
 * Sessions are time slots when members can book boats.
 */

import { z } from 'zod';

export const SessionSchema = z.object({
  id: z.string().min(1),                          // "AM1", "AM2", "SAT"
  name: z.string().min(1),                        // "Early Morning"
  startTime: z.string().regex(/^\d{2}:\d{2}$/),   // "06:30"
  endTime: z.string().regex(/^\d{2}:\d{2}$/),     // "07:30"
  daysOfWeek: z.array(z.number().min(0).max(6)),  // [1,2,3,4,5] (0=Sun, 6=Sat)
  color: z.string().optional(),                   // "#60a5fa"
  priority: z.number().optional(),                // Display order
});

export type Session = z.infer<typeof SessionSchema>;

/**
 * Validates that end time is after start time
 */
export function validateSessionTimes(session: Session): boolean {
  const [startH, startM] = session.startTime.split(':').map(Number);
  const [endH, endM] = session.endTime.split(':').map(Number);

  const startMinutes = startH * 60 + startM;
  const endMinutes = endH * 60 + endM;

  return endMinutes > startMinutes;
}

/**
 * Formats a session for display
 */
export function formatSession(session: Session): string {
  return `${session.name} (${session.startTime}-${session.endTime})`;
}
