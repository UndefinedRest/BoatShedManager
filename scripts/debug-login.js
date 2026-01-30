/**
 * Debug script to inspect RevSport login form
 *
 * This helps us see what fields the login form actually expects
 */

const axios = require('axios');
const cheerio = require('cheerio');

async function inspectLoginForm() {
  console.log('🔍 Inspecting RevSport login form...\n');

  try {
    const response = await axios.get('https://www.lakemacquarierowingclub.org.au/login');
    const $ = cheerio.load(response.data);

    console.log('📋 Form Details:');
    console.log('================\n');

    // Find the login form
    const form = $('form').first();
    const formAction = form.attr('action');
    const formMethod = form.attr('method');

    console.log(`Form action: ${formAction || '(not specified)'}`);
    console.log(`Form method: ${formMethod || '(not specified)'}\n`);

    // Find all input fields
    console.log('Input fields found:');
    form.find('input').each((i, elem) => {
      const name = $(elem).attr('name');
      const type = $(elem).attr('type');
      const value = $(elem).attr('value');
      const placeholder = $(elem).attr('placeholder');

      console.log(`  ${i + 1}. name="${name}" type="${type}"${value ? ` value="${value}"` : ''}${placeholder ? ` placeholder="${placeholder}"` : ''}`);
    });

    // Find CSRF token locations
    console.log('\n🔐 CSRF Token locations:');

    const csrfInput = $('input[name="_token"]').val();
    if (csrfInput) {
      console.log(`  ✓ Input field: ${csrfInput.substring(0, 20)}...`);
    }

    const csrfMeta = $('meta[name="csrf-token"]').attr('content');
    if (csrfMeta) {
      console.log(`  ✓ Meta tag: ${csrfMeta.substring(0, 20)}...`);
    }

    const csrfMetaToken = $('meta[name="_token"]').attr('content');
    if (csrfMetaToken) {
      console.log(`  ✓ Meta _token: ${csrfMetaToken.substring(0, 20)}...`);
    }

    if (!csrfInput && !csrfMeta && !csrfMetaToken) {
      console.log('  ⚠️  No CSRF token found!');
    }

    // Check for any hidden fields
    console.log('\n🔒 Hidden fields:');
    form.find('input[type="hidden"]').each((i, elem) => {
      const name = $(elem).attr('name');
      const value = $(elem).attr('value');
      console.log(`  ${name}: ${value ? value.substring(0, 20) + '...' : '(empty)'}`);
    });

    // Look for username field variations
    console.log('\n👤 Username field analysis:');
    const usernameField = form.find('input[name="username"]');
    const emailField = form.find('input[name="email"]');
    const loginField = form.find('input[name="login"]');

    if (usernameField.length > 0) {
      console.log('  ✓ Found "username" field');
    }
    if (emailField.length > 0) {
      console.log('  ✓ Found "email" field');
    }
    if (loginField.length > 0) {
      console.log('  ✓ Found "login" field');
    }
    if (usernameField.length === 0 && emailField.length === 0 && loginField.length === 0) {
      console.log('  ⚠️  No standard username/email/login field found!');
      console.log('  Looking for any text input...');
      form.find('input[type="text"], input[type="email"]').each((i, elem) => {
        const name = $(elem).attr('name');
        const placeholder = $(elem).attr('placeholder');
        console.log(`    - ${name}${placeholder ? ` (${placeholder})` : ''}`);
      });
    }

    console.log('\n✅ Inspection complete\n');

  } catch (error) {
    console.error('❌ Error inspecting form:', error.message);
  }
}

inspectLoginForm();
