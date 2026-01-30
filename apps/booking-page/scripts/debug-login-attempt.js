/**
 * Debug script to test actual login attempt
 * Shows exactly what we're sending and what response we get
 */

const axios = require('axios');
const cheerio = require('cheerio');
const { CookieJar } = require('tough-cookie');
const { wrapper } = require('axios-cookiejar-support');

async function testLogin() {
  console.log('🧪 Testing RevSport Login\n');

  if (!process.env.REVSPORT_USERNAME || !process.env.REVSPORT_PASSWORD) {
    console.error('❌ ERROR: Set REVSPORT_USERNAME and REVSPORT_PASSWORD environment variables');
    process.exit(1);
  }

  const jar = new CookieJar();
  const client = wrapper(axios.create({
    baseURL: 'https://www.lakemacquarierowingclub.org.au',
    jar,
    withCredentials: true,
    timeout: 30000
  }));

  try {
    // Step 1: Get login page
    console.log('1️⃣ Fetching login page...');
    const loginPage = await client.get('/login');
    const $ = cheerio.load(loginPage.data);

    const csrfToken = $('input[name="_token"]').val();
    console.log(`   ✓ CSRF Token: ${csrfToken.substring(0, 20)}...`);

    // Step 2: Prepare login data
    const loginData = {
      _token: csrfToken,
      username: process.env.REVSPORT_USERNAME,
      password: process.env.REVSPORT_PASSWORD
    };

    console.log('\n2️⃣ Preparing login request...');
    console.log(`   Username: ${loginData.username}`);
    console.log(`   Password: ${'*'.repeat(loginData.password.length)}`);
    console.log(`   CSRF: ${csrfToken.substring(0, 20)}...`);

    // Try different approaches
    console.log('\n3️⃣ Attempting login (URLSearchParams)...');

    try {
      const response = await client.post('/login',
        new URLSearchParams(loginData).toString(),
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Referer': 'https://www.lakemacquarierowingclub.org.au/login',
            'Origin': 'https://www.lakemacquarierowingclub.org.au'
          },
          maxRedirects: 0,
          validateStatus: () => true // Accept all status codes to see what we get
        }
      );

      console.log(`   Response status: ${response.status}`);
      console.log(`   Response headers:`, response.headers);

      if (response.status === 422) {
        console.log('\n❌ Got 422 error. Response body:');
        console.log(response.data);

        // Check if there's a Laravel validation error
        if (typeof response.data === 'object' && response.data.errors) {
          console.log('\n🔍 Validation errors:');
          Object.entries(response.data.errors).forEach(([field, errors]) => {
            console.log(`   - ${field}: ${errors.join(', ')}`);
          });
        }
      } else if (response.status === 302 || response.status === 301) {
        console.log(`   ✓ Redirect to: ${response.headers.location}`);
      } else if (response.status === 500) {
        console.log('   ⚠️ Got 500 error (RevSport quirk - checking cookies...)');
      }

      // Check cookies
      const cookies = await jar.getCookies('https://www.lakemacquarierowingclub.org.au');
      console.log(`\n   Cookies received: ${cookies.length}`);
      cookies.forEach(cookie => {
        console.log(`     - ${cookie.key}: ${cookie.value.substring(0, 20)}...`);
      });

      if (cookies.length > 0) {
        console.log('\n4️⃣ Verifying authentication...');
        const verifyResponse = await client.get('/bookings');
        const $verify = cheerio.load(verifyResponse.data);

        const hasLogout = $verify('a[href*="/logout"]').length > 0 ||
                         $verify('form[action*="/logout"]').length > 0;

        if (hasLogout) {
          console.log('   ✅ SUCCESS! Login verified (found logout button)');
        } else {
          console.log('   ❌ FAILED! Not logged in (no logout button found)');

          // Check what we got instead
          const hasLoginForm = $verify('input[name="username"]').length > 0;
          if (hasLoginForm) {
            console.log('   Still on login page');
          }
        }
      }

    } catch (error) {
      console.error('❌ Login attempt failed:', error.message);
      if (error.response) {
        console.log('Response status:', error.response.status);
        console.log('Response data:', error.response.data);
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLogin();
