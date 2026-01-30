/**
 * Test script for parsing boat names
 *
 * Usage: node scripts/test-parse.js
 *
 * This helps verify the parsing logic works correctly
 * for different RevSport boat name formats.
 */

const { parseBoatName } = require('./fetch-boats');

// Test cases from actual RevSport data
const testCases = [
  "2X RACER - Swift double/pair 70 KG (Ian Krix)",
  "1X CLUB - Jono Hunter 90 KG",
  "4X RACER - Friends (Dave Murray)",
  "2X CLUB - The Rose 75 KG",
  "1X RACER - Cockle Creek 65 KG",
  "4+ RACER - Ray Beeton 85 KG",
  "2- CLUB - Better Transport 85 KG"
];

console.log('🧪 Testing Boat Name Parsing\n');
console.log('='.repeat(80));

testCases.forEach((fullName, index) => {
  console.log(`\n${index + 1}. Input: "${fullName}"`);
  const parsed = parseBoatName(fullName);

  // Build display name (same logic as fetch-boats.js)
  let displayName = parsed.nickname || parsed.displayName || fullName;
  if (parsed.weight) {
    displayName = `${displayName} (${parsed.weight})`;
  }

  console.log(`   Output: "${displayName}"`);
  console.log(`   Details:`, {
    type: parsed.type || '(none)',
    classification: parsed.classification || '(none)',
    weight: parsed.weight || '(none)',
    nickname: parsed.nickname || '(none)',
    displayName: parsed.displayName || '(none)'
  });
});

console.log('\n' + '='.repeat(80));
console.log('\n✅ Test complete\n');
