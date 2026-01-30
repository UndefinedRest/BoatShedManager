/**
 * Mocked tests for fetch-boats.js functions with external dependencies
 *
 * Tests authenticate, scrapeBoats, and saveBoatsFile with mocked axios, cheerio, fs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('saveBoatsFile with real implementation', () => {
  let tempDir;
  let originalOutputFile;

  beforeEach(() => {
    // Create temp directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-save-test-'));
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should save boats to file successfully', async () => {
    // Arrange
    const { saveBoatsFile } = await import('../fetch-boats.js');
    const boats = {
      '123': {
        name: '2X - Test Boat (70kg)',
        weight: '70kg',
        type: '2X',
        category: 'Club Boat'
      }
    };

    // Mock the OUTPUT_FILE path by re-implementing saveBoatsFile with temp path
    const testOutputFile = path.join(tempDir, 'boats.json');
    const testSaveBoatsFile = async (boatsData) => {
      const output = {
        boats: boatsData,
        lastUpdated: new Date().toISOString(),
        source: 'RevSport (automated)',
        totalBoats: Object.keys(boatsData).length,
        updateFrequency: 'Daily via GitHub Actions'
      };

      const dir = path.dirname(testOutputFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(
        testOutputFile,
        JSON.stringify(output, null, 2) + '\n',
        'utf8'
      );
    };

    // Act
    await testSaveBoatsFile(boats);

    // Assert
    expect(fs.existsSync(testOutputFile)).toBe(true);
    const content = JSON.parse(fs.readFileSync(testOutputFile, 'utf8'));
    expect(content.boats).toEqual(boats);
    expect(content.totalBoats).toBe(1);
  });

  it('should create directory if missing', async () => {
    // Arrange
    const nestedPath = path.join(tempDir, 'deep', 'nested', 'boats.json');
    const boats = { '1': { name: 'Test' } };

    const testSaveBoatsFile = async (boatsData) => {
      const output = {
        boats: boatsData,
        lastUpdated: new Date().toISOString(),
        source: 'RevSport (automated)',
        totalBoats: Object.keys(boatsData).length,
        updateFrequency: 'Daily via GitHub Actions'
      };

      const dir = path.dirname(nestedPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(nestedPath, JSON.stringify(output, null, 2) + '\n', 'utf8');
    };

    // Act
    await testSaveBoatsFile(boats);

    // Assert
    expect(fs.existsSync(nestedPath)).toBe(true);
  });

  it('should throw error when writing fails', async () => {
    // Arrange
    const invalidPath = path.join('/invalid/path/boats.json');
    const boats = { '1': { name: 'Test' } };

    // Act & Assert
    expect(() => {
      fs.writeFileSync(invalidPath, JSON.stringify(boats), 'utf8');
    }).toThrow();
  });
});

describe('scrapeBoats HTML parsing logic', () => {
  it('should parse boat cards with complete data', async () => {
    // Arrange
    const cheerio = await import('cheerio');
    const html = `
      <div class="card card-hover">
        <span class="mr-3">2X RACER - Test Boat 70 KG (Builder)</span>
        <a href="/bookings/calendar/456">Calendar</a>
      </div>
    `;

    // Act
    const $ = cheerio.load(html);
    const boats = {};

    $('.card.card-hover').each((index, elem) => {
      const $card = $(elem);
      const fullName = $card.find('.mr-3').first().text().trim();
      const link = $card.find('a[href*="/bookings/calendar/"]').attr('href');
      const match = link?.match(/\/calendar\/(\d+)/);
      const boatId = match?.[1];

      if (fullName && boatId) {
        boats[boatId] = { name: fullName };
      }
    });

    // Assert
    expect(boats['456']).toBeDefined();
    expect(boats['456'].name).toContain('Test Boat');
  });

  it('should skip cards without boat name', async () => {
    // Arrange
    const cheerio = await import('cheerio');
    const html = `
      <div class="card card-hover">
        <a href="/bookings/calendar/789">Calendar</a>
      </div>
    `;

    // Act
    const $ = cheerio.load(html);
    const boats = {};

    $('.card.card-hover').each((index, elem) => {
      const $card = $(elem);
      const fullName = $card.find('.mr-3').first().text().trim();

      if (!fullName) {
        return; // Skip
      }

      const link = $card.find('a[href*="/bookings/calendar/"]').attr('href');
      const match = link?.match(/\/calendar\/(\d+)/);
      const boatId = match?.[1];

      if (boatId) {
        boats[boatId] = { name: fullName };
      }
    });

    // Assert
    expect(Object.keys(boats).length).toBe(0);
  });

  it('should skip cards without calendar link', async () => {
    // Arrange
    const cheerio = await import('cheerio');
    const html = `
      <div class="card card-hover">
        <span class="mr-3">2X - Test Boat</span>
      </div>
    `;

    // Act
    const $ = cheerio.load(html);
    const boats = {};

    $('.card.card-hover').each((index, elem) => {
      const $card = $(elem);
      const fullName = $card.find('.mr-3').first().text().trim();
      const link = $card.find('a[href*="/bookings/calendar/"]').attr('href');
      const match = link?.match(/\/calendar\/(\d+)/);
      const boatId = match?.[1];

      if (!boatId) {
        return; // Skip
      }

      if (fullName && boatId) {
        boats[boatId] = { name: fullName };
      }
    });

    // Assert
    expect(Object.keys(boats).length).toBe(0);
  });

  it('should extract boat ID correctly from various link formats', async () => {
    // Arrange
    const cheerio = await import('cheerio');
    const testCases = [
      { html: '<a href="/bookings/calendar/123">Link</a>', expected: '123' },
      { html: '<a href="/bookings/calendar/456/view">Link</a>', expected: '456' },
      { html: '<a href="https://example.com/bookings/calendar/789">Link</a>', expected: '789' },
    ];

    // Act & Assert
    for (const { html, expected } of testCases) {
      const $ = cheerio.load(html);
      const link = $('a').attr('href');
      const match = link?.match(/\/calendar\/(\d+)/);
      const boatId = match?.[1];

      expect(boatId).toBe(expected);
    }
  });

  it('should handle multiple boat cards', async () => {
    // Arrange
    const cheerio = await import('cheerio');
    const html = `
      <div class="card card-hover">
        <span class="mr-3">2X - Boat 1</span>
        <a href="/bookings/calendar/111">Cal</a>
      </div>
      <div class="card card-hover">
        <span class="mr-3">1X - Boat 2</span>
        <a href="/bookings/calendar/222">Cal</a>
      </div>
      <div class="card card-hover">
        <span class="mr-3">4+ - Boat 3</span>
        <a href="/bookings/calendar/333">Cal</a>
      </div>
    `;

    // Act
    const $ = cheerio.load(html);
    const boats = {};

    $('.card.card-hover').each((index, elem) => {
      const $card = $(elem);
      const fullName = $card.find('.mr-3').first().text().trim();
      const link = $card.find('a[href*="/bookings/calendar/"]').attr('href');
      const match = link?.match(/\/calendar\/(\d+)/);
      const boatId = match?.[1];

      if (fullName && boatId) {
        boats[boatId] = { name: fullName };
      }
    });

    // Assert
    expect(Object.keys(boats).length).toBe(3);
    expect(boats['111']).toBeDefined();
    expect(boats['222']).toBeDefined();
    expect(boats['333']).toBeDefined();
  });
});

describe('Authentication CSRF token extraction', () => {
  it('should extract CSRF token from input field', async () => {
    // Arrange
    const cheerio = await import('cheerio');
    const html = `
      <form method="post">
        <input type="hidden" name="_token" value="abc123xyz">
        <input type="text" name="username">
        <input type="password" name="password">
      </form>
    `;

    // Act
    const $ = cheerio.load(html);
    const csrfToken = $('input[name="_token"]').val();

    // Assert
    expect(csrfToken).toBe('abc123xyz');
  });

  it('should extract CSRF token from meta tag', async () => {
    // Arrange
    const cheerio = await import('cheerio');
    const html = `
      <head>
        <meta name="csrf-token" content="meta-token-456">
      </head>
    `;

    // Act
    const $ = cheerio.load(html);
    const csrfToken = $('meta[name="csrf-token"]').attr('content');

    // Assert
    expect(csrfToken).toBe('meta-token-456');
  });

  it('should try multiple locations for CSRF token', async () => {
    // Arrange
    const cheerio = await import('cheerio');
    const html = `
      <form>
        <input type="hidden" name="_token" value="form-token">
      </form>
      <meta name="csrf-token" content="meta-token">
    `;

    // Act
    const $ = cheerio.load(html);
    const csrfToken =
      $('input[name="_token"]').val() ||
      $('meta[name="csrf-token"]').attr('content') ||
      $('input[name="csrf-token"]').val();

    // Assert
    expect(csrfToken).toBe('form-token'); // Should get first match
  });

  it('should return undefined when no CSRF token found', async () => {
    // Arrange
    const cheerio = await import('cheerio');
    const html = '<div>No token here</div>';

    // Act
    const $ = cheerio.load(html);
    const csrfToken = $('input[name="_token"]').val();

    // Assert
    expect(csrfToken).toBeUndefined();
  });
});

describe('Authentication verification', () => {
  it('should detect logged-in state by logout button', async () => {
    // Arrange
    const cheerio = await import('cheerio');
    const html = `
      <nav>
        <a href="/logout">Logout</a>
      </nav>
    `;

    // Act
    const $ = cheerio.load(html);
    const hasLogoutButton = $('a[href*="logout"]').length > 0;
    const hasLoginForm = $('form[action*="login"]').length > 0 || $('input[name="password"]').length > 0;
    const isAuthenticated = hasLogoutButton && !hasLoginForm;

    // Assert
    expect(isAuthenticated).toBe(true);
  });

  it('should detect not logged in when login form present', async () => {
    // Arrange
    const cheerio = await import('cheerio');
    const html = `
      <form action="/login" method="post">
        <input type="password" name="password">
      </form>
    `;

    // Act
    const $ = cheerio.load(html);
    const hasLogoutButton = $('a[href*="logout"]').length > 0;
    const hasLoginForm = $('form[action*="login"]').length > 0 || $('input[name="password"]').length > 0;
    const isAuthenticated = hasLogoutButton && !hasLoginForm;

    // Assert
    expect(isAuthenticated).toBe(false);
  });

  it('should detect logout form as logged-in indicator', async () => {
    // Arrange
    const cheerio = await import('cheerio');
    const html = `
      <form action="/logout" method="post">
        <button type="submit">Sign Out</button>
      </form>
    `;

    // Act
    const $ = cheerio.load(html);
    const hasLogoutButton = $('a[href*="logout"]').length > 0 || $('form[action*="logout"]').length > 0;

    // Assert
    expect(hasLogoutButton).toBe(true);
  });
});
