/**
 * Fetch boat list from RevSport and update boats.json
 *
 * This script:
 * 1. Authenticates with RevSport
 * 2. Scrapes the /bookings page for all boats
 * 3. Parses boat names, weights, types
 * 4. Updates boats.json with current data
 *
 * Used by GitHub Actions for daily automated updates
 * Can also be run manually: node scripts/fetch-boats.js
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');
const fs = require('fs');
const path = require('path');

// Configuration
const REVSPORT_BASE_URL = 'https://www.lakemacquarierowingclub.org.au';
const OUTPUT_FILE = path.join(__dirname, '..', 'boats.json');

/**
 * Main function to fetch boats from RevSport
 */
async function fetchBoats() {
  console.log('🚣 Starting boat data fetch from RevSport...\n');

  // Validate credentials
  if (!process.env.REVSPORT_USERNAME || !process.env.REVSPORT_PASSWORD) {
    console.error('❌ ERROR: REVSPORT_USERNAME and REVSPORT_PASSWORD environment variables required');
    process.exit(1);
  }

  // Create axios client with cookie jar (matching lmrc-booking-system config)
  const jar = new CookieJar();
  const client = wrapper(axios.create({
    baseURL: REVSPORT_BASE_URL,
    jar,
    withCredentials: true,
    maxRedirects: 5,
    timeout: 30000,
    validateStatus: (status) => status >= 200 && status < 400,
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'gzip, deflate, br',
      'Connection': 'keep-alive'
    }
  }));

  try {
    // Step 1: Authenticate
    console.log('🔐 Authenticating with RevSport...');
    await authenticate(client, jar);
    console.log('✅ Authentication successful\n');

    // Step 2: Fetch boats
    console.log('📋 Fetching boat list from /bookings page...');
    const boats = await scrapeBoats(client);
    console.log(`✅ Found ${Object.keys(boats).length} boats\n`);

    // Step 3: Save to file
    console.log('💾 Saving to boats.json...');
    await saveBoatsFile(boats);
    console.log('✅ boats.json updated successfully\n');

    // Summary
    console.log('📊 Summary:');
    console.log(`   Total boats: ${Object.keys(boats).length}`);
    console.log(`   With weight info: ${Object.values(boats).filter(b => b.weight).length}`);
    console.log(`   File: ${OUTPUT_FILE}`);
    console.log('\n✨ Done!');

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);

    // If we have existing boats.json, keep it (graceful degradation)
    if (fs.existsSync(OUTPUT_FILE)) {
      console.log('ℹ️  Existing boats.json preserved (graceful degradation)');
      process.exit(0); // Don't fail the workflow
    } else {
      console.error('⚠️  No existing boats.json to fall back to');
      process.exit(1);
    }
  }
}

/**
 * Authenticate with RevSport
 */
async function authenticate(client, jar) {
  try {
    // Get login page to extract CSRF token
    const loginPage = await client.get('/login');
    const $ = cheerio.load(loginPage.data);

    // Try multiple locations for CSRF token (RevSport uses Laravel)
    const csrfToken =
      $('input[name="_token"]').val() ||
      $('meta[name="csrf-token"]').attr('content') ||
      $('input[name="csrf-token"]').val();

    if (!csrfToken) {
      throw new Error('Could not find CSRF token on login page');
    }

    console.log('   Found CSRF token');

    // Submit login form with all required headers
    const loginResponse = await client.post('/login',
      new URLSearchParams({
        _token: csrfToken,
        username: process.env.REVSPORT_USERNAME,
        password: process.env.REVSPORT_PASSWORD,
        remember: 'on'
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': `${REVSPORT_BASE_URL}/login`,
          'Origin': REVSPORT_BASE_URL,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        validateStatus: (_status) => true // Accept all status codes
      }
    );

    console.log(`   Response status: ${loginResponse.status}`);

    // Check for error messages in response (RevSport returns 200 even on auth failure)
    if (typeof loginResponse.data === 'string') {
      const $login = cheerio.load(loginResponse.data);
      const errorMsg = $login('.alert-danger').text().trim() ||
                       $login('.error').text().trim() ||
                       $login('.invalid-feedback').text().trim();

      if (errorMsg) {
        // Clean up error message (remove extra whitespace and × symbols)
        const cleanError = errorMsg.replace(/\s+/g, ' ').replace(/×/g, '').trim();
        throw new Error(`Invalid credentials: ${cleanError}`);
      }
    }

    // Check cookies were set
    const cookies = jar.getCookiesSync(REVSPORT_BASE_URL);
    console.log(`   Cookies received: ${cookies.length}`);

    if (cookies.length > 0) {
      console.log(`   Cookie names: ${cookies.map(c => c.key).join(', ')}`);
    }

    // Small delay for session to establish (RevSport quirk)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify authentication by trying to access a protected page
    const verifyPage = await client.get('/bookings');
    const $verify = cheerio.load(verifyPage.data);

    // Check for logout button (indicates we're logged in)
    // Match lmrc-booking-system logic exactly
    const hasLogoutButton = $verify('a[href*="logout"]').length > 0 ||
                            $verify('form[action*="logout"]').length > 0;
    const hasLoginForm = $verify('form[action*="login"]').length > 0 ||
                         $verify('input[name="password"]').length > 0;

    const isAuthenticated = hasLogoutButton && !hasLoginForm;

    console.log(`   Verification: logout=${hasLogoutButton}, login=${hasLoginForm}, authenticated=${isAuthenticated}`);

    if (!isAuthenticated) {
      throw new Error('Authentication verification failed - not logged in');
    }

    console.log('   Authentication verified');

  } catch (error) {
    throw new Error(`Authentication failed: ${error.message}`);
  }
}

/**
 * Scrape boats from the /bookings page
 */
async function scrapeBoats(client) {
  try {
    const response = await client.get('/bookings');
    const $ = cheerio.load(response.data);

    const boats = {};
    let processedCount = 0;

    // Find all boat cards
    $('.card.card-hover').each((index, elem) => {
      try {
        const $card = $(elem);

        // Extract full boat name (matching lmrc-booking-system exactly: .mr-3 selector)
        const fullName = $card.find('.mr-3').first().text().trim();

        if (!fullName) {
          console.log(`   ⚠️  Skipping card ${index + 1}: No name found`);
          return;
        }

        // Extract boat ID from calendar link
        const link = $card.find('a[href*="/bookings/calendar/"]').attr('href');
        const match = link?.match(/\/calendar\/(\d+)/);
        const boatId = match?.[1];

        if (!boatId) {
          console.log(`   ⚠️  Skipping boat "${fullName}": No ID found`);
          return; // Skip this card
        }

        // Parse the boat name
        const parsed = parseBoatName(fullName);

        // Clean up nickname/displayName (trim extra whitespace)
        const cleanName = (parsed.nickname || parsed.displayName || fullName).trim();

        // Build display name matching booking board format: "2X - Better Transport (85kg)"
        let displayName = '';

        // Add type if available
        if (parsed.type) {
          displayName = `${parsed.type} - ${cleanName}`;
        } else {
          displayName = cleanName;
        }

        // Add weight badge
        if (parsed.weight) {
          displayName = `${displayName} (${parsed.weight})`;
        }

        boats[boatId] = {
          name: displayName,
          weight: parsed.weight || '',
          type: parsed.type || '',
          category: parsed.classification || 'Club Boat'
        };

        processedCount++;

        if (processedCount <= 5) {
          console.log(`   ✓ ${boatId}: ${displayName}`);
        }

      } catch (error) {
        console.log(`   ⚠️  Error processing card ${index + 1}: ${error.message}`);
      }
    });

    if (processedCount > 5) {
      console.log(`   ... and ${processedCount - 5} more boats`);
    }

    if (Object.keys(boats).length === 0) {
      throw new Error('No boats found on /bookings page');
    }

    return boats;

  } catch (error) {
    throw new Error(`Failed to scrape boats: ${error.message}`);
  }
}

/**
 * Parse RevSport boat name format
 *
 * Input examples:
 *   "2X RACER - Swift double/pair 70 KG (Ian Krix)"
 *   "1X CLUB - Jono Hunter 90 KG"
 *   "4X RACER - Friends (Dave Murray)"
 *
 * @param {string} fullName - Full boat name from RevSport
 * @returns {object} Parsed components
 */
function parseBoatName(fullName) {
  // Extract components using regex
  const typeMatch = fullName.match(/^(\d+[X\+\-])/i);           // "2X", "4+", "1X"
  const classMatch = fullName.match(/(RACER|CLUB)/i);           // "RACER" or "CLUB"
  const weightMatch = fullName.match(/(\d+)\s*KG/i);            // "70 KG"
  const nicknameMatch = fullName.match(/\(([^)]+)\)$/);         // "(Ian Krix)"

  // Clean nickname of extra whitespace
  const nickname = nicknameMatch ? nicknameMatch[1].replace(/\s+/g, ' ').trim() : '';

  // Extract display name (the middle part)
  let displayName = fullName;

  // Remove type prefix
  if (typeMatch) {
    displayName = displayName.replace(typeMatch[0], '').trim();
  }

  // Remove classification
  if (classMatch) {
    displayName = displayName.replace(classMatch[0], '').trim();
  }

  // Remove leading dash
  displayName = displayName.replace(/^\s*-\s*/, '').trim();

  // Remove nickname in parentheses
  if (nicknameMatch) {
    displayName = displayName.replace(nicknameMatch[0], '').trim();
  }

  // Remove weight
  if (weightMatch) {
    displayName = displayName.replace(weightMatch[0], '').trim();
  }

  // Clean up any extra whitespace
  displayName = displayName.replace(/\s+/g, ' ').trim();

  return {
    type: typeMatch?.[1] || '',
    classification: classMatch?.[1] || '',
    weight: weightMatch ? `${weightMatch[1]}kg` : '',
    nickname: nickname || '',
    displayName: displayName || fullName
  };
}

/**
 * Save boats data to boats.json
 */
async function saveBoatsFile(boats) {
  const output = {
    boats: boats,
    lastUpdated: new Date().toISOString(),
    source: 'RevSport (automated)',
    totalBoats: Object.keys(boats).length,
    updateFrequency: 'Daily via GitHub Actions'
  };

  try {
    // Ensure directory exists
    const dir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file with pretty formatting
    fs.writeFileSync(
      OUTPUT_FILE,
      JSON.stringify(output, null, 2) + '\n', // Add trailing newline
      'utf8'
    );

    console.log(`   Wrote ${OUTPUT_FILE}`);
    console.log(`   File size: ${fs.statSync(OUTPUT_FILE).size} bytes`);

  } catch (error) {
    throw new Error(`Failed to write boats.json: ${error.message}`);
  }
}

// Run if called directly
if (require.main === module) {
  fetchBoats();
}

module.exports = {
  fetchBoats,
  parseBoatName,
  // Export internal functions for testing
  authenticate,
  scrapeBoats,
  saveBoatsFile
};
