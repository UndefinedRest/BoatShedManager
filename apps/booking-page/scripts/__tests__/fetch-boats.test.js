/**
 * Tests for BoatBooking fetch-boats.js script
 *
 * Focuses on critical parsing logic for boat names, which has complex regex patterns
 * that are prone to breaking when RevSport changes their naming format.
 */

import { describe, it, expect } from 'vitest';
import { parseBoatName } from '../fetch-boats.js';

describe('Boat Name Parsing', () => {
  describe('Standard format parsing', () => {
    it('should parse standard format: TYPE CLASS - NAME WEIGHT (NICKNAME)', () => {
      // Arrange
      const input = '2X RACER - Swift double/pair 70 KG (Ian Krix)';

      // Act
      const result = parseBoatName(input);

      // Assert
      expect(result).toEqual({
        type: '2X',
        classification: 'RACER',
        weight: '70kg',
        nickname: 'Ian Krix',
        displayName: 'Swift double/pair'
      });
    });

    it('should parse single scull format', () => {
      // Arrange
      const input = '1X CLUB - Jono Hunter 90 KG';

      // Act
      const result = parseBoatName(input);

      // Assert
      expect(result).toEqual({
        type: '1X',
        classification: 'CLUB',
        weight: '90kg',
        nickname: '',
        displayName: 'Jono Hunter'
      });
    });

    it('should parse coxed four format with nickname', () => {
      // Arrange
      const input = '4X RACER - Friends (Dave Murray)';

      // Act
      const result = parseBoatName(input);

      // Assert
      expect(result).toEqual({
        type: '4X',
        classification: 'RACER',
        weight: '',
        nickname: 'Dave Murray',
        displayName: 'Friends'
      });
    });
  });

  describe('Type extraction', () => {
    it('should extract 2X type (double scull)', () => {
      const result = parseBoatName('2X CLUB - Test Boat');
      expect(result.type).toBe('2X');
    });

    it('should extract 1X type (single scull)', () => {
      const result = parseBoatName('1X RACER - Test Boat');
      expect(result.type).toBe('1X');
    });

    it('should extract 4+ type (coxed four)', () => {
      const result = parseBoatName('4+ CLUB - Test Boat');
      expect(result.type).toBe('4+');
    });

    it('should extract 4- type (coxless four)', () => {
      const result = parseBoatName('4- RACER - Test Boat');
      expect(result.type).toBe('4-');
    });

    it('should extract 8+ type (eight)', () => {
      const result = parseBoatName('8+ CLUB - Test Boat');
      expect(result.type).toBe('8+');
    });

    it('should handle lowercase type format', () => {
      const result = parseBoatName('2x CLUB - Test Boat');
      expect(result.type).toBe('2x');
    });

    it('should return empty string when no type found', () => {
      const result = parseBoatName('CLUB - Test Boat Without Type');
      expect(result.type).toBe('');
    });
  });

  describe('Classification extraction', () => {
    it('should extract RACER classification', () => {
      const result = parseBoatName('2X RACER - Test Boat');
      expect(result.classification).toBe('RACER');
    });

    it('should extract CLUB classification', () => {
      const result = parseBoatName('1X CLUB - Test Boat');
      expect(result.classification).toBe('CLUB');
    });

    it('should handle lowercase classification', () => {
      const result = parseBoatName('2X racer - Test Boat');
      expect(result.classification).toBe('racer');
    });

    it('should return empty string when no classification found', () => {
      const result = parseBoatName('2X - Test Boat Without Class');
      expect(result.classification).toBe('');
    });
  });

  describe('Weight extraction', () => {
    it('should extract weight from "70 KG" format', () => {
      const result = parseBoatName('2X RACER - Test Boat 70 KG');
      expect(result.weight).toBe('70kg');
    });

    it('should extract weight from "90KG" format (no space)', () => {
      const result = parseBoatName('1X CLUB - Test Boat 90KG');
      expect(result.weight).toBe('90kg');
    });

    it('should handle lowercase "kg"', () => {
      const result = parseBoatName('2X CLUB - Test Boat 85 kg');
      expect(result.weight).toBe('85kg');
    });

    it('should return empty string when no weight found', () => {
      const result = parseBoatName('2X CLUB - Test Boat');
      expect(result.weight).toBe('');
    });

    it('should extract first weight when multiple numbers present', () => {
      const result = parseBoatName('2X RACER - Boat 123 with 70 KG rating');
      expect(result.weight).toBe('70kg');
    });
  });

  describe('Nickname extraction', () => {
    it('should extract nickname in parentheses at end', () => {
      const result = parseBoatName('2X RACER - Test Boat (Ian Krix)');
      expect(result.nickname).toBe('Ian Krix');
    });

    it('should trim whitespace from nickname', () => {
      const result = parseBoatName('2X CLUB - Test Boat (  Dave Murray  )');
      expect(result.nickname).toBe('Dave Murray');
    });

    it('should handle multiple words in nickname', () => {
      const result = parseBoatName('1X RACER - Test Boat (John Smith Jr)');
      expect(result.nickname).toBe('John Smith Jr');
    });

    it('should return empty string when no nickname found', () => {
      const result = parseBoatName('2X CLUB - Test Boat');
      expect(result.nickname).toBe('');
    });

    it('should only extract last parenthesized text as nickname', () => {
      const result = parseBoatName('2X RACER - Boat (Old Name) 70 KG (Ian Krix)');
      expect(result.nickname).toBe('Ian Krix');
    });
  });

  describe('Display name extraction', () => {
    it('should extract clean display name removing all metadata', () => {
      const result = parseBoatName('2X RACER - Swift double/pair 70 KG (Ian Krix)');
      expect(result.displayName).toBe('Swift double/pair');
    });

    it('should preserve slashes in boat name', () => {
      const result = parseBoatName('2X CLUB - double/pair boat');
      expect(result.displayName).toBe('double/pair boat');
    });

    it('should handle boat name with special characters', () => {
      const result = parseBoatName('1X RACER - O\'Brien\'s Boat 85 KG');
      expect(result.displayName).toBe('O\'Brien\'s Boat');
    });

    it('should trim leading/trailing whitespace', () => {
      const result = parseBoatName('2X CLUB -   Test Boat   ');
      expect(result.displayName).toBe('Test Boat');
    });

    it('should normalize multiple spaces to single space', () => {
      const result = parseBoatName('2X RACER - Test    Boat    Name');
      expect(result.displayName).toBe('Test Boat Name');
    });

    it('should return full name as fallback when parsing fails', () => {
      const result = parseBoatName('Malformed Boat Name');
      expect(result.displayName).toBe('Malformed Boat Name');
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty string', () => {
      const result = parseBoatName('');
      expect(result).toEqual({
        type: '',
        classification: '',
        weight: '',
        nickname: '',
        displayName: ''
      });
    });

    it('should handle boat name with only type', () => {
      const result = parseBoatName('2X');
      expect(result.type).toBe('2X');
      expect(result.displayName).toBeTruthy();
    });

    it('should handle boat name with only classification', () => {
      const result = parseBoatName('RACER');
      expect(result.classification).toBe('RACER');
    });

    it('should handle multiple parentheses gracefully', () => {
      const result = parseBoatName('2X RACER - Boat (Damaged) 70 KG (Ian)');
      expect(result.nickname).toBe('Ian'); // Should get last one
    });

    it('should handle malformed weight format', () => {
      const result = parseBoatName('2X CLUB - Test Boat KILOGRAMS');
      expect(result.weight).toBe(''); // Should not match
    });

    it('should preserve numbers in display name when not weight', () => {
      const result = parseBoatName('2X CLUB - Boat 123');
      expect(result.displayName).toBe('Boat 123');
    });

    it('should handle very long boat names', () => {
      const input = '2X RACER - This is a very long boat name with many words in it 70 KG (Nickname)';
      const result = parseBoatName(input);
      expect(result.displayName).toBe('This is a very long boat name with many words in it');
    });

    it('should handle unicode characters in names', () => {
      const result = parseBoatName('2X RACER - Café Racer 70 KG');
      expect(result.displayName).toBe('Café Racer');
    });
  });

  describe('Real-world RevSport examples', () => {
    // These test cases match actual boat names from LMRC RevSport instance

    it('should parse: 2X RACER - Swift double/pair 70 KG (Ian Krix)', () => {
      const result = parseBoatName('2X RACER - Swift double/pair 70 KG (Ian Krix)');
      expect(result).toMatchObject({
        type: '2X',
        classification: 'RACER',
        weight: '70kg',
        nickname: 'Ian Krix',
        displayName: 'Swift double/pair'
      });
    });

    it('should parse: 1X CLUB - Jono Hunter 90 KG', () => {
      const result = parseBoatName('1X CLUB - Jono Hunter 90 KG');
      expect(result).toMatchObject({
        type: '1X',
        classification: 'CLUB',
        weight: '90kg',
        displayName: 'Jono Hunter'
      });
    });

    it('should parse: 4X RACER - Friends (Dave Murray)', () => {
      const result = parseBoatName('4X RACER - Friends (Dave Murray)');
      expect(result).toMatchObject({
        type: '4X',
        classification: 'RACER',
        nickname: 'Dave Murray',
        displayName: 'Friends'
      });
    });

    it('should parse boat without weight or nickname', () => {
      const result = parseBoatName('2X CLUB - Training Boat');
      expect(result).toMatchObject({
        type: '2X',
        classification: 'CLUB',
        weight: '',
        nickname: '',
        displayName: 'Training Boat'
      });
    });
  });
});
