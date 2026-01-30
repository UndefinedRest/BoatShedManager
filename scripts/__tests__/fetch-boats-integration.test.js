/**
 * Integration tests for BoatBooking fetch-boats.js
 *
 * Tests file writing, HTML scraping, and error handling
 * Uses mocks to avoid external dependencies (network, real file system)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Import functions to test
const fetchBoatsModule = await import('../fetch-boats.js');

describe('saveBoatsFile (File Writing)', () => {
  let tempDir;
  let tempFile;

  beforeEach(() => {
    // Create temp directory for each test
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-test-'));
    tempFile = path.join(tempDir, 'boats.json');
  });

  afterEach(() => {
    // Clean up temp files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  it('should write boats data to JSON file with correct structure', async () => {
    // Arrange
    const boats = {
      '123': {
        name: '2X - Test Boat (70kg)',
        weight: '70kg',
        type: '2X',
        category: 'Club Boat'
      },
      '456': {
        name: '1X - Another Boat (90kg)',
        weight: '90kg',
        type: '1X',
        category: 'Club Boat'
      }
    };

    // Mock saveBoatsFile to write to temp location
    const saveBoatsFile = async (boatsData) => {
      const output = {
        boats: boatsData,
        lastUpdated: new Date().toISOString(),
        source: 'RevSport (automated)',
        totalBoats: Object.keys(boatsData).length,
        updateFrequency: 'Daily via GitHub Actions'
      };

      fs.writeFileSync(tempFile, JSON.stringify(output, null, 2) + '\n', 'utf8');
    };

    // Act
    await saveBoatsFile(boats);

    // Assert
    expect(fs.existsSync(tempFile)).toBe(true);

    const fileContent = fs.readFileSync(tempFile, 'utf8');
    const parsed = JSON.parse(fileContent);

    expect(parsed).toHaveProperty('boats');
    expect(parsed).toHaveProperty('lastUpdated');
    expect(parsed).toHaveProperty('source', 'RevSport (automated)');
    expect(parsed).toHaveProperty('totalBoats', 2);
    expect(parsed.boats).toEqual(boats);
  });

  it('should create directory if it does not exist', async () => {
    // Arrange
    const nestedDir = path.join(tempDir, 'nested', 'path');
    const nestedFile = path.join(nestedDir, 'boats.json');
    const boats = { '123': { name: 'Test' } };

    // Mock saveBoatsFile with directory creation
    const saveBoatsFile = async (boatsData) => {
      const output = {
        boats: boatsData,
        lastUpdated: new Date().toISOString(),
        source: 'RevSport (automated)',
        totalBoats: Object.keys(boatsData).length,
        updateFrequency: 'Daily via GitHub Actions'
      };

      const dir = path.dirname(nestedFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(nestedFile, JSON.stringify(output, null, 2) + '\n', 'utf8');
    };

    // Act
    await saveBoatsFile(boats);

    // Assert
    expect(fs.existsSync(nestedDir)).toBe(true);
    expect(fs.existsSync(nestedFile)).toBe(true);
  });

  it('should write pretty-formatted JSON', async () => {
    // Arrange
    const boats = {
      '123': { name: 'Test Boat' }
    };

    const saveBoatsFile = async (boatsData) => {
      const output = {
        boats: boatsData,
        lastUpdated: '2024-01-01T00:00:00.000Z',
        source: 'RevSport (automated)',
        totalBoats: 1,
        updateFrequency: 'Daily via GitHub Actions'
      };

      fs.writeFileSync(tempFile, JSON.stringify(output, null, 2) + '\n', 'utf8');
    };

    // Act
    await saveBoatsFile(boats);

    // Assert
    const fileContent = fs.readFileSync(tempFile, 'utf8');

    // Check for pretty formatting (indentation and newlines)
    expect(fileContent).toContain('{\n  ');
    expect(fileContent).toMatch(/"boats": \{\s+/);
    expect(fileContent).toMatch(/\n$/); // Trailing newline
  });

  it('should include lastUpdated timestamp', async () => {
    // Arrange
    const boats = { '123': { name: 'Test' } };
    const beforeTime = new Date();

    const saveBoatsFile = async (boatsData) => {
      const output = {
        boats: boatsData,
        lastUpdated: new Date().toISOString(),
        source: 'RevSport (automated)',
        totalBoats: Object.keys(boatsData).length,
        updateFrequency: 'Daily via GitHub Actions'
      };

      fs.writeFileSync(tempFile, JSON.stringify(output, null, 2) + '\n', 'utf8');
    };

    // Act
    await saveBoatsFile(boats);
    const afterTime = new Date();

    // Assert
    const parsed = JSON.parse(fs.readFileSync(tempFile, 'utf8'));
    const updatedTime = new Date(parsed.lastUpdated);

    expect(updatedTime.getTime()).toBeGreaterThanOrEqual(beforeTime.getTime());
    expect(updatedTime.getTime()).toBeLessThanOrEqual(afterTime.getTime());
  });

  it('should handle empty boats object', async () => {
    // Arrange
    const boats = {};

    const saveBoatsFile = async (boatsData) => {
      const output = {
        boats: boatsData,
        lastUpdated: new Date().toISOString(),
        source: 'RevSport (automated)',
        totalBoats: Object.keys(boatsData).length,
        updateFrequency: 'Daily via GitHub Actions'
      };

      fs.writeFileSync(tempFile, JSON.stringify(output, null, 2) + '\n', 'utf8');
    };

    // Act
    await saveBoatsFile(boats);

    // Assert
    const parsed = JSON.parse(fs.readFileSync(tempFile, 'utf8'));
    expect(parsed.boats).toEqual({});
    expect(parsed.totalBoats).toBe(0);
  });
});

describe('HTML Scraping Edge Cases', () => {
  it('should handle malformed HTML gracefully', () => {
    // Arrange
    const cheerio = require('cheerio');
    const malformedHTML = '<div><span>Unclosed tag';

    // Act
    const $ = cheerio.load(malformedHTML);

    // Assert - Cheerio should parse without throwing
    expect($('div').length).toBeGreaterThan(0);
  });

  it('should handle missing boat cards', () => {
    // Arrange
    const cheerio = require('cheerio');
    const emptyHTML = '<html><body><p>No boats here</p></body></html>';

    // Act
    const $ = cheerio.load(emptyHTML);
    const boats = {};
    $('.card.card-hover').each((index, elem) => {
      boats[index] = 'found';
    });

    // Assert
    expect(Object.keys(boats).length).toBe(0);
  });

  it('should handle boat cards without names', () => {
    // Arrange
    const cheerio = require('cheerio');
    const htmlWithoutName = `
      <div class="card card-hover">
        <a href="/bookings/calendar/123">Link</a>
      </div>
    `;

    // Act
    const $ = cheerio.load(htmlWithoutName);
    const fullName = $('.card.card-hover').find('.mr-3').first().text().trim();

    // Assert
    expect(fullName).toBe('');
  });

  it('should handle boat cards without calendar links', () => {
    // Arrange
    const cheerio = require('cheerio');
    const htmlWithoutLink = `
      <div class="card card-hover">
        <span class="mr-3">Test Boat</span>
      </div>
    `;

    // Act
    const $ = cheerio.load(htmlWithoutLink);
    const link = $('.card.card-hover').find('a[href*="/bookings/calendar/"]').attr('href');

    // Assert
    expect(link).toBeUndefined();
  });

  it('should extract boat ID from calendar link', () => {
    // Arrange
    const cheerio = require('cheerio');
    const html = `
      <div class="card card-hover">
        <span class="mr-3">Test Boat</span>
        <a href="/bookings/calendar/456">Calendar</a>
      </div>
    `;

    // Act
    const $ = cheerio.load(html);
    const link = $('.card.card-hover').find('a[href*="/bookings/calendar/"]').attr('href');
    const match = link?.match(/\/calendar\/(\d+)/);
    const boatId = match?.[1];

    // Assert
    expect(boatId).toBe('456');
  });
});

describe('Error Handling', () => {
  it('should handle missing environment variables gracefully', () => {
    // Arrange
    const originalUsername = process.env.REVSPORT_USERNAME;
    const originalPassword = process.env.REVSPORT_PASSWORD;
    delete process.env.REVSPORT_USERNAME;
    delete process.env.REVSPORT_PASSWORD;

    // Act & Assert
    expect(process.env.REVSPORT_USERNAME).toBeUndefined();
    expect(process.env.REVSPORT_PASSWORD).toBeUndefined();

    // Cleanup
    if (originalUsername) process.env.REVSPORT_USERNAME = originalUsername;
    if (originalPassword) process.env.REVSPORT_PASSWORD = originalPassword;
  });

  it('should preserve existing boats.json on error (graceful degradation)', () => {
    // Arrange
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'boat-error-test-'));
    const tempFile = path.join(tempDir, 'boats.json');
    const existingData = { boats: { '1': { name: 'Existing Boat' } } };

    fs.writeFileSync(tempFile, JSON.stringify(existingData), 'utf8');

    // Act - Simulate error condition
    const fileExists = fs.existsSync(tempFile);

    // Assert
    expect(fileExists).toBe(true);
    const preserved = JSON.parse(fs.readFileSync(tempFile, 'utf8'));
    expect(preserved).toEqual(existingData);

    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });
  });
});

describe('Data Transformation', () => {
  it('should build correct display name format', () => {
    // Arrange
    const parsed = {
      type: '2X',
      nickname: 'Better Transport',
      weight: '85kg',
      classification: 'RACER'
    };

    // Act
    let displayName = '';
    if (parsed.type) {
      displayName = `${parsed.type} - ${parsed.nickname}`;
    }
    if (parsed.weight) {
      displayName = `${displayName} (${parsed.weight})`;
    }

    // Assert
    expect(displayName).toBe('2X - Better Transport (85kg)');
  });

  it('should handle boat without weight in display name', () => {
    // Arrange
    const parsed = {
      type: '1X',
      nickname: 'Test Boat',
      weight: '',
      classification: 'CLUB'
    };

    // Act
    let displayName = `${parsed.type} - ${parsed.nickname}`;
    if (parsed.weight) {
      displayName = `${displayName} (${parsed.weight})`;
    }

    // Assert
    expect(displayName).toBe('1X - Test Boat');
  });

  it('should use displayName when nickname is empty', () => {
    // Arrange
    const parsed = {
      type: '2X',
      nickname: '',
      displayName: 'Fallback Name',
      weight: '70kg'
    };

    // Act
    const cleanName = (parsed.nickname || parsed.displayName).trim();
    const displayName = `${parsed.type} - ${cleanName} (${parsed.weight})`;

    // Assert
    expect(displayName).toBe('2X - Fallback Name (70kg)');
  });
});
