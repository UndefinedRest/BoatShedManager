/**
 * Parser unit tests
 */

import { describe, it, expect } from 'vitest';
import { parseBoatsFromHtml, parseBookingsFromJson, formatDateForApi, type RawRevSportBooking } from './parser.js';

describe('parseBoatsFromHtml', () => {
  it('parses a single scull from HTML', () => {
    const html = `
      <div class="card card-hover">
        <div class="mr-3">1X - Carmody single scull ( Go For Gold )</div>
        <a href="/bookings/calendar/123">Calendar</a>
      </div>
    `;

    const boats = parseBoatsFromHtml(html);

    expect(boats).toHaveLength(1);
    expect(boats[0]).toMatchObject({
      externalId: '123',
      boatType: '1X',
      boatCategory: 'race',
      classification: 'T',
      weight: null,
      isDamaged: false,
    });
    expect(boats[0].metadata).toMatchObject({
      nickname: 'Go For Gold',
      sweepCapable: false,
    });
  });

  it('parses racer boat with weight', () => {
    const html = `
      <div class="card card-hover">
        <div class="mr-3">2X RACER - Swift double/pair 70 KG (Ian Krix)</div>
        <a href="/bookings/calendar/456">Calendar</a>
      </div>
    `;

    const boats = parseBoatsFromHtml(html);

    expect(boats).toHaveLength(1);
    expect(boats[0]).toMatchObject({
      externalId: '456',
      boatType: '2X',
      boatCategory: 'race',
      classification: 'R',
      weight: 70,
      isDamaged: false,
    });
    expect(boats[0].metadata).toMatchObject({
      nickname: 'Ian Krix',
    });
  });

  it('parses sweep-capable boat', () => {
    const html = `
      <div class="card card-hover">
        <div class="mr-3">2X/- RACER - Partridge 95 KG</div>
        <a href="/bookings/calendar/789">Calendar</a>
      </div>
    `;

    const boats = parseBoatsFromHtml(html);

    expect(boats).toHaveLength(1);
    expect(boats[0]).toMatchObject({
      externalId: '789',
      boatType: '2X',
      weight: 95,
    });
    expect(boats[0].metadata?.sweepCapable).toBe(true);
  });

  it('parses tinnie', () => {
    const html = `
      <div class="card card-hover">
        <div class="mr-3">Tinnie - 15HP (2010 Stacer Seasprite 359)</div>
        <a href="/bookings/calendar/111">Calendar</a>
      </div>
    `;

    const boats = parseBoatsFromHtml(html);

    expect(boats).toHaveLength(1);
    expect(boats[0]).toMatchObject({
      externalId: '111',
      boatType: null,
      boatCategory: 'tinnie',
      classification: null,
    });
  });

  it('detects damaged status from name', () => {
    const html = `
      <div class="card card-hover">
        <div class="mr-3">1X - Broken boat DAMAGED (Out of Service)</div>
        <a href="/bookings/calendar/222">Calendar</a>
      </div>
    `;

    const boats = parseBoatsFromHtml(html);

    expect(boats).toHaveLength(1);
    expect(boats[0].isDamaged).toBe(true);
    expect(boats[0].damagedReason).toBe('Marked as damaged in RevSport');
  });

  it('detects damaged status from badge', () => {
    const html = `
      <div class="card card-hover">
        <div class="mr-3">1X - Some boat</div>
        <span class="badge-danger">Damaged</span>
        <a href="/bookings/calendar/333">Calendar</a>
      </div>
    `;

    const boats = parseBoatsFromHtml(html);

    expect(boats).toHaveLength(1);
    expect(boats[0].isDamaged).toBe(true);
  });

  it('parses multiple boats', () => {
    const html = `
      <div class="card card-hover">
        <div class="mr-3">1X - Boat One</div>
        <a href="/bookings/calendar/1">Calendar</a>
      </div>
      <div class="card card-hover">
        <div class="mr-3">2X - Boat Two</div>
        <a href="/bookings/calendar/2">Calendar</a>
      </div>
      <div class="card card-hover">
        <div class="mr-3">4X - Boat Three</div>
        <a href="/bookings/calendar/3">Calendar</a>
      </div>
    `;

    const boats = parseBoatsFromHtml(html);

    expect(boats).toHaveLength(3);
    expect(boats[0].externalId).toBe('1');
    expect(boats[1].externalId).toBe('2');
    expect(boats[2].externalId).toBe('3');
  });

  it('skips cards without calendar link', () => {
    const html = `
      <div class="card card-hover">
        <div class="mr-3">Some other card</div>
      </div>
    `;

    const boats = parseBoatsFromHtml(html);

    expect(boats).toHaveLength(0);
  });

  it('returns empty array for empty HTML', () => {
    const boats = parseBoatsFromHtml('');

    expect(boats).toHaveLength(0);
  });
});

describe('parseBookingsFromJson', () => {
  it('parses basic booking', () => {
    const raw: RawRevSportBooking[] = [
      {
        id: 42,
        title: 'Booked by John Smith',
        start: '2025-10-25T06:00:00+11:00',
        end: '2025-10-25T07:00:00+11:00',
      },
    ];

    const bookings = parseBookingsFromJson(raw, 'boat123');

    expect(bookings).toHaveLength(1);
    expect(bookings[0]).toMatchObject({
      externalId: '42',
      boatExternalId: 'boat123',
      date: '2025-10-25',
      startTime: '06:00',
      endTime: '07:00',
      memberName: 'John Smith',
      sessionName: null,
    });
  });

  it('handles booking without id', () => {
    const raw: RawRevSportBooking[] = [
      {
        title: 'Booked by Jane Doe',
        start: '2025-10-25T08:00:00+11:00',
        end: '2025-10-25T09:30:00+11:00',
      },
    ];

    const bookings = parseBookingsFromJson(raw, 'boat456');

    expect(bookings).toHaveLength(1);
    expect(bookings[0].externalId).toBeNull();
    expect(bookings[0].memberName).toBe('Jane Doe');
  });

  it('handles booking with string id', () => {
    const raw: RawRevSportBooking[] = [
      {
        id: 'abc-123',
        title: 'Test User',
        start: '2025-10-25T10:00:00+11:00',
        end: '2025-10-25T11:00:00+11:00',
      },
    ];

    const bookings = parseBookingsFromJson(raw, 'boat789');

    expect(bookings[0].externalId).toBe('abc-123');
    expect(bookings[0].memberName).toBe('Test User');
  });

  it('parses multiple bookings', () => {
    const raw: RawRevSportBooking[] = [
      {
        id: 1,
        title: 'Booked by User One',
        start: '2025-10-25T06:00:00+11:00',
        end: '2025-10-25T07:00:00+11:00',
      },
      {
        id: 2,
        title: 'Booked by User Two',
        start: '2025-10-25T07:00:00+11:00',
        end: '2025-10-25T08:00:00+11:00',
      },
      {
        id: 3,
        title: 'Booked by User Three',
        start: '2025-10-25T08:00:00+11:00',
        end: '2025-10-25T09:00:00+11:00',
      },
    ];

    const bookings = parseBookingsFromJson(raw, 'boat999');

    expect(bookings).toHaveLength(3);
    expect(bookings[0].memberName).toBe('User One');
    expect(bookings[1].memberName).toBe('User Two');
    expect(bookings[2].memberName).toBe('User Three');
  });

  it('preserves raw data', () => {
    const raw: RawRevSportBooking[] = [
      {
        id: 42,
        title: 'Test',
        start: '2025-10-25T06:00:00+11:00',
        end: '2025-10-25T07:00:00+11:00',
        url: '/some/url',
        extendedProps: { newWindow: true },
      },
    ];

    const bookings = parseBookingsFromJson(raw, 'boat123');

    expect(bookings[0].rawData).toMatchObject({
      id: 42,
      url: '/some/url',
      extendedProps: { newWindow: true },
    });
  });

  it('returns empty array for empty input', () => {
    const bookings = parseBookingsFromJson([], 'boat123');

    expect(bookings).toHaveLength(0);
  });
});

describe('formatDateForApi', () => {
  it('formats date with positive offset', () => {
    // Create a date in local time
    const date = new Date(2025, 9, 25, 0, 0, 0); // Oct 25, 2025

    const formatted = formatDateForApi(date);

    // Should start with correct date
    expect(formatted).toMatch(/^2025-10-25T00:00:00/);
    // Should have timezone offset
    expect(formatted).toMatch(/[+-]\d{2}:\d{2}$/);
  });

  it('formats date with correct year/month/day', () => {
    const date = new Date(2024, 0, 15); // Jan 15, 2024

    const formatted = formatDateForApi(date);

    expect(formatted).toMatch(/^2024-01-15T00:00:00/);
  });

  it('pads single digit months and days', () => {
    const date = new Date(2025, 5, 5); // Jun 5, 2025

    const formatted = formatDateForApi(date);

    expect(formatted).toMatch(/^2025-06-05T00:00:00/);
  });
});
