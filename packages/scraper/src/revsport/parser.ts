/**
 * RevSport HTML/JSON parsing utilities
 *
 * Extracts boat and booking data from RevSport responses.
 */

import * as cheerio from 'cheerio';
import type { Boat, Booking } from '../adapter.js';

/**
 * Raw booking from RevSport JSON API
 */
export interface RawRevSportBooking {
  id?: string | number;
  title: string;
  start: string;
  end: string;
  url?: string;
  extendedProps?: {
    newWindow?: boolean;
  };
}

/**
 * Parse boats from the /bookings HTML page
 */
export function parseBoatsFromHtml(html: string): Boat[] {
  const $ = cheerio.load(html);
  const boats: Boat[] = [];

  $('.card.card-hover').each((_index, element) => {
    try {
      const $card = $(element);

      // Extract boat name
      const fullName = $card.find('.mr-3').first().text().trim();
      if (!fullName) return;

      // Extract boat ID from calendar link
      const calendarLink = $card.find('a[href*="/bookings/calendar/"]');
      const calendarUrl = calendarLink.attr('href') || '';
      const boatIdMatch = calendarUrl.match(/\/calendar\/(\d+)/);
      const boatId = boatIdMatch ? boatIdMatch[1] : null;

      if (!boatId) return;

      // Parse boat details from name
      const details = parseBoatName(fullName);

      // Check for damaged status (often in name or badge)
      const isDamaged = /damaged|out of service|unavailable/i.test(fullName) ||
                        $card.find('.badge-danger, .badge-warning').length > 0;

      const boat: Boat = {
        externalId: boatId,
        name: details.displayName,
        boatType: details.type,
        boatCategory: details.category,
        classification: details.classification,
        weight: details.weight ? parseInt(details.weight, 10) : null,
        isDamaged,
        damagedReason: isDamaged ? 'Marked as damaged in RevSport' : null,
        metadata: {
          fullName,
          nickname: details.nickname,
          sweepCapable: details.sweepCapable,
          calendarUrl,
          bookingUrl: `/bookings/${boatId}`,
        },
      };

      boats.push(boat);
    } catch {
      // Skip invalid cards
    }
  });

  return boats;
}

/**
 * Parse boat name into structured data
 *
 * Examples:
 * - "1X - Carmody single scull ( Go For Gold )"
 * - "2X RACER - Swift double/pair 70 KG (Ian Krix)"
 * - "4X - Ausrowtec coxed quad/four 90 KG Hunter"
 * - "2X/- RACER - Partridge 95 KG" (sweep capable)
 * - "Tinnie - 15HP (2010 Stacer Seasprite 359)"
 */
function parseBoatName(fullName: string): {
  type: string | null;
  classification: string | null;
  category: string;
  weight: string | null;
  sweepCapable: boolean;
  nickname: string;
  displayName: string;
} {
  // Detect tinnies
  const isTinnie = /\btinnie\b/i.test(fullName) || /\d+\s*HP\b/i.test(fullName);
  const category = isTinnie ? 'tinnie' : 'race';

  // Extract type and sweep capability
  const typeMatch = fullName.match(/^(1X|2X|4X|8X)(\/[\+\-])?/);
  const type = typeMatch ? typeMatch[1] : null;
  const sweepCapable = !!typeMatch && !!typeMatch[2];

  // Extract classification
  const racerMatch = fullName.match(/RACER/i);
  const rtMatch = fullName.match(/\bRT\b/i);
  const classification = racerMatch ? 'R' : rtMatch ? 'RT' : 'T';

  // Extract weight
  const weightMatch = fullName.match(/(\d+)\s*KG/i);
  const weight = weightMatch ? weightMatch[1] : null;

  // Extract nickname
  const nicknameMatch = fullName.match(/\(\s*([^)]+)\s*\)/);
  const nickname = nicknameMatch ? nicknameMatch[1].trim() : '';

  // Clean up display name
  let displayName = fullName;
  if (isTinnie) {
    displayName = fullName
      .replace(/^Tinnie\s*-\s*/i, '')
      .replace(/\d+\s*HP\s*/i, '')
      .replace(/\([^)]*\)/, '')
      .replace(/\s+/g, ' ')
      .trim();
  } else {
    displayName = fullName
      .replace(/^(1X|2X|4X|8X)(\/[\+\-])?\s*(-\s*)?/i, '')
      .replace(/\bRACER\b\s*-?\s*/i, '')
      .replace(/\b(RT|T)\b\s*-?\s*/i, '')
      .replace(/\d+\s*KG/i, '')
      .replace(/\([^)]*\)/, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return {
    type,
    classification: isTinnie ? null : classification,
    category,
    weight,
    sweepCapable,
    nickname,
    displayName,
  };
}

/**
 * Parse bookings from RevSport JSON API response
 */
export function parseBookingsFromJson(
  rawBookings: RawRevSportBooking[],
  boatExternalId: string
): Booking[] {
  return rawBookings.map((raw) => {
    // Parse ISO datetime strings
    const startDate = new Date(raw.start);
    const endDate = new Date(raw.end);

    const date = formatDate(startDate);
    const startTime = formatTime(startDate);
    const endTime = formatTime(endDate);

    // Extract member name from title (e.g., "Booked by John Smith" -> "John Smith")
    const memberName = raw.title.replace(/^Booked by\s*/i, '').trim();

    return {
      externalId: raw.id?.toString() ?? null,
      boatExternalId,
      date,
      startTime,
      endTime,
      memberName,
      sessionName: null, // Will be set by adapter based on club config
      rawData: raw as unknown as Record<string, unknown>,
    };
  });
}

function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format date for RevSport API parameter
 * Example: 2025-10-25T00:00:00+11:00
 */
export function formatDateForApi(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const offset = -date.getTimezoneOffset();
  const offsetHours = String(Math.floor(Math.abs(offset) / 60)).padStart(2, '0');
  const offsetMins = String(Math.abs(offset) % 60).padStart(2, '0');
  const offsetSign = offset >= 0 ? '+' : '-';
  const timezone = `${offsetSign}${offsetHours}:${offsetMins}`;

  return `${year}-${month}-${day}T00:00:00${timezone}`;
}
