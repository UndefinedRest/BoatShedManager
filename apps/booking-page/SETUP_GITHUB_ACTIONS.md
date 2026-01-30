# GitHub Actions Setup Guide

## Automated Daily Boat List Updates from RevSport

This guide will walk you through setting up automated daily updates of the boat list from RevSport using GitHub Actions.

**Time required:** 15-20 minutes
**Difficulty:** Beginner-friendly

---

## What This Does

Once set up, GitHub Actions will:
- ✅ Run automatically every day at 2am AEST
- ✅ Fetch the latest boat list from RevSport
- ✅ Update `boats.json` if boats have changed
- ✅ Commit the changes to your repository
- ✅ Trigger Netlify to redeploy automatically
- ✅ Send you an alert if something goes wrong

**Result:** Your boat list stays in sync with RevSport without manual work!

---

## Prerequisites

- [ ] GitHub account with repository access
- [ ] RevSport credentials (username and password)
- [ ] 15 minutes of time

---

## Step 1: Enable GitHub Actions

### Check if Actions are already enabled

1. Go to your GitHub repository
2. Click on the **"Actions"** tab at the top
3. If you see a list of workflows or a "Get started" page → **Actions are enabled** ✅
4. If you see "Workflows disabled" → Continue with enabling below

### Enable Actions (if disabled)

1. Go to **Settings** → **Actions** → **General**
2. Under "Actions permissions", select:
   - ✅ **Allow all actions and reusable workflows**
3. Under "Workflow permissions", select:
   - ✅ **Read and write permissions**
   - ✅ **Allow GitHub Actions to create and approve pull requests**
4. Click **Save**

![Example of Actions settings](https://docs.github.com/assets/cb-24535/images/help/settings/actions-general-permissions.png)

---

## Step 2: Add RevSport Credentials as Secrets

GitHub Secrets keep your credentials secure and hidden from public view.

### Add secrets

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**

3. **Add first secret:**
   - Name: `REVSPORT_USERNAME`
   - Secret: `your-revsport-username-here`
   - Click **Add secret**

4. **Add second secret:**
   - Name: `REVSPORT_PASSWORD`
   - Secret: `your-revsport-password-here`
   - Click **Add secret**

**Important:**
- Use the same credentials you use to log into RevSport
- **Special characters (`$`, `@`, etc.) work fine** - just paste them directly
- GitHub Secrets handle special characters correctly (no quotes or escaping needed)
- These are encrypted and only visible to GitHub Actions
- Never commit credentials directly to your code!

![Secrets page example](https://docs.github.com/assets/cb-46774/images/help/settings/actions-secrets-list.png)

---

## Step 3: Install Dependencies Locally (One-time)

This step prepares your local environment for testing.

### Install Node.js (if not already installed)

1. Download Node.js 18+ from https://nodejs.org/
2. Install with default options
3. Verify installation:
   ```bash
   node --version
   # Should show v18.x.x or higher
   ```

### Install project dependencies

Open terminal in your project directory and run:

```bash
npm install
```

This installs:
- `axios` - HTTP client
- `cheerio` - HTML parser
- `tough-cookie` - Cookie management
- `axios-cookiejar-support` - Cookie jar support

**Expected output:**
```
added 45 packages in 3s
```

---

## Step 4: Test Locally (Recommended)

Before relying on automation, test that the script works:

### Set environment variables

**Windows (PowerShell):**
```powershell
# IMPORTANT: Use SINGLE quotes for password (not double quotes)
# Single quotes prevent PowerShell from interpreting $ as variables
$env:REVSPORT_USERNAME = 'your-username'
$env:REVSPORT_PASSWORD = 'your-password-here'
```

**Note:** If your password contains special characters like `$`, `@`, or backticks, you **must** use single quotes `'...'` not double quotes `"..."`. Double quotes will cause PowerShell to interpret `$` as a variable.

**Windows (Command Prompt):**
```cmd
set REVSPORT_USERNAME=your-username
set REVSPORT_PASSWORD=your-password
```

**Note:** Command Prompt doesn't have the same special character issues as PowerShell, but it's still good practice to avoid spaces or quotes.

**Mac/Linux:**
```bash
# Use single quotes if password contains special characters
export REVSPORT_USERNAME='your-username'
export REVSPORT_PASSWORD='your-password-here'
```

**Note:** Like PowerShell, bash also interprets `$` as variables in double quotes. Always use single quotes for passwords with special characters.

### Run the fetch script

```bash
npm run fetch-boats
```

**Expected output:**
```
🚣 Starting boat data fetch from RevSport...

🔐 Authenticating with RevSport...
   Found CSRF token
   Cookies received
   Authentication verified
✅ Authentication successful

📋 Fetching boat list from /bookings page...
   ✓ 8584: The Rose (75kg)
   ✓ 6283: Jono Hunter (90kg)
   ✓ 7544: Ian Krix (70kg)
   ✓ 6306: Hunter Heron (70kg)
   ✓ 7540: Yvonne (65kg)
   ... and 37 more boats
✅ Found 42 boats

💾 Saving to boats.json...
   Wrote c:\dev\Projects\LMRC\BoatBooking\boats.json
   File size: 2345 bytes
✅ boats.json updated successfully

📊 Summary:
   Total boats: 42
   With weight info: 38
   File: c:\dev\Projects\LMRC\BoatBooking\boats.json

✨ Done!
```

### Check the updated boats.json

Open `boats.json` and verify:
- Boats are listed with correct names
- Weights are in format "Name (70kg)"
- `lastUpdated` timestamp is current

**If the script fails:**
- Check your credentials are correct
- Verify you can log into RevSport manually
- Check the error message for details

---

## Step 5: Commit and Push Files

The workflow file and script need to be in your repository.

```bash
git add .github/workflows/update-boats.yml
git add scripts/fetch-boats.js
git add scripts/test-parse.js
git add package.json
git add boats.json
git add .gitignore
git commit -m "feat: add automated boat list updates from RevSport"
git push
```

---

## Step 6: Verify GitHub Actions is Running

### Check the workflow

1. Go to your repository on GitHub
2. Click **Actions** tab
3. You should see **"Update Boat List from RevSport"** in the workflows list

### Run manually (first time)

1. Click on **"Update Boat List from RevSport"**
2. Click **"Run workflow"** dropdown (top right)
3. Click green **"Run workflow"** button
4. Watch it run in real-time!

**Expected workflow steps:**
```
✅ Checkout repository
✅ Setup Node.js
✅ Install dependencies
✅ Fetch boats from RevSport
✅ Check for changes
✅ Commit and push changes (if boats changed)
✅ Summary
```

### If the workflow succeeds

🎉 **Success!** Your automation is working.

- The workflow will now run daily at 2am AEST
- boats.json will update automatically when boats change
- Netlify will redeploy automatically on commit

### If the workflow fails

Check the error message in the workflow logs:

**Common issues:**

1. **"REVSPORT_USERNAME not found"**
   - Go back to Step 2 and verify secrets are added correctly
   - Secret names must be exact: `REVSPORT_USERNAME` and `REVSPORT_PASSWORD`

2. **"Authentication failed"**
   - Verify credentials work on RevSport website
   - Check for special characters in password (may need escaping)

3. **"Permission denied"**
   - Go to Settings → Actions → General
   - Enable "Read and write permissions"

---

## Step 7: Monitor and Maintain

### How to check if it's working

1. Go to **Actions** tab
2. See list of recent workflow runs
3. Green checkmark ✅ = success
4. Red X ❌ = failure (you'll get an email)

### Daily operation

- **No action required!** The workflow runs automatically.
- If boats change, you'll see a new commit from "GitHub Actions Bot"
- Netlify will automatically deploy the updated boats.json

### Manual trigger (when needed)

If you add a new boat to RevSport and want to update immediately:

1. Go to **Actions** → **Update Boat List from RevSport**
2. Click **Run workflow** → **Run workflow**
3. Wait ~30 seconds for it to complete
4. boats.json will be updated

### What to do if it fails

If the daily update fails:

1. You'll receive a GitHub notification email
2. An issue will be created automatically in your repository
3. The existing boats.json continues to work (graceful degradation)
4. Check the workflow logs for error details
5. Common fixes:
   - RevSport password changed → Update secret
   - RevSport website down → Will retry tomorrow
   - Network issue → Will retry tomorrow

---

## Frequently Asked Questions

### How often does it run?

Daily at 2am AEST (4pm UTC previous day). You can also trigger it manually anytime.

### Will it break my site if it fails?

No! If the update fails, the existing boats.json remains unchanged. Your site keeps working with the last known boat list.

### How do I change the schedule?

Edit `.github/workflows/update-boats.yml`:

```yaml
schedule:
  - cron: '0 16 * * *'  # 2am AEST
```

Use [crontab.guru](https://crontab.guru/) to generate different schedules.

### Can I run it more frequently?

Yes, but it's unnecessary. Boat lists rarely change multiple times per day. Daily updates are appropriate.

### What if a boat name is wrong?

The script fetches directly from RevSport. If a name is wrong:
1. Fix it in RevSport first
2. Wait for next automated run, OR
3. Trigger workflow manually for immediate update

### How do I disable automation?

1. Go to **Actions** → **Update Boat List from RevSport**
2. Click the **⋯** menu (top right)
3. Click **Disable workflow**

boats.json will no longer update automatically.

### Can I see what changed?

Yes! Each commit from the workflow shows exactly what changed:

1. Go to **Commits** in your repository
2. Find commit: "chore: update boat list from RevSport"
3. Click to see the diff

### What if I need help?

- Check the workflow logs in the Actions tab
- Review error messages in the logs
- Check that RevSport is accessible
- Verify your credentials are correct

---

## Testing Checklist

After setup, verify everything works:

- [ ] GitHub Actions is enabled
- [ ] Secrets are added (REVSPORT_USERNAME, REVSPORT_PASSWORD)
- [ ] Dependencies installed locally (`npm install`)
- [ ] Script works locally (`npm run fetch-boats`)
- [ ] Files committed and pushed
- [ ] Workflow appears in Actions tab
- [ ] Manual workflow run succeeds
- [ ] boats.json updated after workflow run
- [ ] Netlify deployed successfully

---

## What Files Were Created?

| File | Purpose |
|------|---------|
| `.github/workflows/update-boats.yml` | GitHub Actions workflow definition |
| `scripts/fetch-boats.js` | Main script to fetch boats from RevSport |
| `scripts/test-parse.js` | Test script for name parsing |
| `package.json` | Node.js dependencies |
| `.gitignore` | Prevents committing node_modules |

---

## Next Steps

Once automation is working:

1. ✅ **Mobile UX improvements** - Implement quick date buttons, better touch targets
2. ✅ **Configuration file** - Extract session times to config.json
3. ✅ **Analytics** - Track which boats are most popular

See [IMPROVEMENT_PROPOSAL.md](IMPROVEMENT_PROPOSAL.md) for details.

---

## Troubleshooting Guide

### Script runs but boats.json doesn't change

**Cause:** No boats were added/removed/renamed in RevSport

**Solution:** This is normal. The workflow only commits if data changed.

### "Invalid credentials: These credentials do not match our records"

**Cause:** Username or password is incorrect, OR special characters in password not handled correctly

**Solution:**
1. **Verify credentials** - Log into RevSport manually to confirm they work
2. **Check for special characters** in your password (especially `$`, `@`, backtick)
3. **Use single quotes** in PowerShell/bash:
   ```powershell
   # WRONG - $ treated as variable
   $env:REVSPORT_PASSWORD = "pass$word"

   # CORRECT - single quotes = literal
   $env:REVSPORT_PASSWORD = 'pass$word'
   ```
4. **GitHub Secrets** - Just paste the password directly (no quotes needed)

### "Error: Could not find CSRF token"

**Cause:** RevSport login page structure changed

**Solution:**
1. Verify RevSport is accessible
2. Check if login page looks normal
3. May need to update script to find new token location

### "Error: No boats found"

**Cause:** RevSport /bookings page structure changed

**Solution:**
1. Verify you can access /bookings page manually
2. Check if page looks normal
3. May need to update scraping selectors

### Workflow runs but doesn't commit

**Cause:** Workflow permissions not enabled

**Solution:**
1. Settings → Actions → General
2. Enable "Read and write permissions"

---

## Support

If you encounter issues not covered here:

1. Check workflow logs in Actions tab
2. Run script locally to see detailed error messages
3. Review [IMPROVEMENT_PROPOSAL.md](IMPROVEMENT_PROPOSAL.md) for context

---

**Setup complete!** 🎉

Your boat list will now stay automatically synchronized with RevSport.
