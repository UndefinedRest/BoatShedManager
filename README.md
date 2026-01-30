# LMRC Boat Booking System

QR Code-based boat booking system for Lake Macquarie Rowing Club.

## Overview

This application provides a mobile-optimized interface for booking boats via QR codes. Members scan a QR code attached to a boat, which opens a booking page pre-filled with that boat's information. The system enforces standardized session times and redirects to RevSport for authentication and final booking.

## Features

- 📱 **Mobile-first design** - Optimized for phone screens
- 🔍 **QR code integration** - Scan boat QR codes to pre-fill booking
- ⏰ **Standardized sessions** - Club-approved time slots only
- 🔄 **Auto-updating boat list** - Daily sync with RevSport via GitHub Actions
- 🚀 **Fast and simple** - Static HTML, minimal dependencies

## How It Works

```
Member scans QR code
    ↓
Opens booking page with boat_id parameter
    ↓
Shows boat name + weight (confirmation)
    ↓
Member selects date and session
    ↓
Redirects to RevSport with pre-filled form
    ↓
Member logs in and completes booking in RevSport
```

## Project Structure

```
BoatBooking/
├── book-a-boat.html          # Main booking page
├── index.html                # Redirect page
├── boats.json                # Boat data (auto-updated daily)
├── scripts/
│   ├── fetch-boats.js        # Fetch boats from RevSport
│   └── test-parse.js         # Test parsing logic
├── .github/workflows/
│   └── update-boats.yml      # GitHub Actions workflow
└── docs/
    ├── SETUP_GITHUB_ACTIONS.md   # Setup instructions
    ├── IMPROVEMENT_PROPOSAL.md   # Technical proposals
    └── MOBILE_UX_IMPROVEMENTS.md # UX enhancement ideas
```

## Quick Start

### For Users

Visit: `https://your-domain.netlify.app/book-a-boat.html?boat_id=8584`

Replace `8584` with the actual boat ID from the QR code.

### For Developers

**Requirements:**
- Node.js 20+ (required for cheerio dependencies)
- npm

See [SETUP_GITHUB_ACTIONS.md](SETUP_GITHUB_ACTIONS.md) for complete setup instructions.

**Quick setup:**

```bash
# Install dependencies
npm install

# Test boat fetching locally
export REVSPORT_USERNAME="your-username"
export REVSPORT_PASSWORD="your-password"
npm run fetch-boats

# Test parsing logic
npm run test-parse
```

## Automation

The boat list automatically updates daily at 2am AEST via GitHub Actions:

1. Fetches all boats from RevSport `/bookings` page
2. Parses boat names, weights, types
3. Updates `boats.json` if changed
4. Commits and triggers Netlify redeploy

**Manual trigger:** Actions tab → "Update Boat List from RevSport" → Run workflow

## Boat Data Format

```json
{
  "boats": {
    "8584": {
      "name": "The Rose (75kg)",
      "weight": "75kg",
      "type": "Double",
      "category": "Club Boat"
    }
  },
  "lastUpdated": "2025-10-28T02:00:00.000Z",
  "source": "RevSport (automated)",
  "totalBoats": 42
}
```

## Session Times

Currently hardcoded in `book-a-boat.html`:

- **Morning Session 1:** 6:30 AM - 7:30 AM
- **Morning Session 2:** 7:30 AM - 8:30 AM

**Future:** Extract to `config.json` for easier updates.

## Deployment

**Hosting:** Netlify
**Auto-deploy:** Push to main branch

Netlify automatically redeploys when:
- Code changes are pushed
- boats.json is updated by GitHub Actions

## Maintenance

### Adding a New Boat

Boats are automatically discovered from RevSport. No manual action needed.

### Updating Session Times

Edit `book-a-boat.html` lines 297-310 (SESSIONS array).

**Future:** Move to config.json.

### Checking Automation Status

1. Go to GitHub repository
2. Click **Actions** tab
3. View recent workflow runs

## Troubleshooting

### Boat name not showing

- Check `boat_id` parameter in URL
- Verify boat exists in boats.json
- Check browser console for errors

### boats.json not updating

- Check GitHub Actions workflow status
- Verify RevSport credentials in GitHub Secrets
- Check workflow logs for errors

### Script fails locally

- Verify RevSport credentials
- Check you can log into RevSport manually
- Ensure dependencies installed: `npm install`

## Documentation

- **[SETUP_GITHUB_ACTIONS.md](SETUP_GITHUB_ACTIONS.md)** - Complete automation setup guide
- **[IMPROVEMENT_PROPOSAL.md](IMPROVEMENT_PROPOSAL.md)** - Technical review and recommendations
- **[MOBILE_UX_IMPROVEMENTS.md](MOBILE_UX_IMPROVEMENTS.md)** - UX enhancement proposals
- **[PROJECT_STATUS.md](PROJECT_STATUS.md)** - Previous Firebase proposal (archived)

## Technology Stack

- **Frontend:** Vanilla HTML/CSS/JavaScript
- **Automation:** Node.js, GitHub Actions
- **Hosting:** Netlify
- **Data Source:** RevSport (via scraping)

## Dependencies

```json
{
  "axios": "^1.6.0",
  "axios-cookiejar-support": "^5.0.0",
  "cheerio": "^1.0.0-rc.12",
  "tough-cookie": "^4.1.0"
}
```

## License

MIT

## Support

For issues or questions:
- Check documentation in `docs/` folder
- Review GitHub Actions workflow logs
- Contact club developer

---

**Last Updated:** 2025-10-28
**Version:** 2.0 (Automated boat updates implemented)
