# Google Analytics 4 Setup Guide

**Status**: Ready to configure
**Effort**: ~30-60 minutes (one-time setup)
**Cost**: $0 (Google Analytics 4 free tier)

---

## Overview

Google Analytics 4 (GA4) has been integrated into the BoatBooking application to track key metrics that will inform future feature development decisions.

**Key Tracking Capabilities**:
- ✅ Page views per boat (with boat_id and boat_name)
- ✅ Booking button clicks (by session)
- ✅ "View boat availability" link clicks
- ✅ "Manage my bookings" link clicks
- ✅ Date selection changes
- ✅ Damaged boat warnings shown
- ✅ Error tracking

---

## Step 1: Create Google Analytics 4 Property

### 1.1 Sign in to Google Analytics
1. Go to [https://analytics.google.com/](https://analytics.google.com/)
2. Sign in with your Google account (or create one if needed)
3. If you don't have an account, click "Start measuring" to create one

### 1.2 Create a GA4 Property
1. Click **Admin** (gear icon in bottom-left corner)
2. In the **Account** column, select or create an account:
   - Click "Create Account"
   - Account name: `LMRC` (or your club name)
   - Configure account settings
   - Click **Next**

3. In the **Property** column, create a property:
   - Property name: `BoatBooking` (or `LMRC BoatBooking`)
   - Reporting time zone: Select your timezone (e.g., `Australia/Sydney`)
   - Currency: `Australian Dollar (AUD)`
   - Click **Next**

4. Configure business details:
   - Industry category: `Sports & Fitness` or `Sports & Recreation`
   - Business size: Select appropriate size
   - Intended use: `Get insights on customer behavior`
   - Click **Create**

5. Accept Terms of Service

### 1.3 Set Up Data Stream
1. Select platform: **Web**
2. Website URL: `https://lakemacrowing.au` (or your actual domain)
3. Stream name: `BoatBooking Website`
4. Click **Create stream**

### 1.4 Get Your Measurement ID
After creating the data stream, you'll see:
- **Measurement ID**: `G-XXXXXXXXXX` (starts with "G-")

**IMPORTANT**: Copy this Measurement ID - you'll need it in Step 2.

---

## Step 2: Add Measurement ID to BoatBooking

### 2.1 Update book-a-boat.html
1. Open `BoatBooking/book-a-boat.html` in a text editor
2. Find **two places** with `G-XXXXXXXXXX`:
   - Line ~15: `<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>`
   - Line ~22: `gtag('config', 'G-XXXXXXXXXX', {`

3. Replace **both** `G-XXXXXXXXXX` with your actual Measurement ID

**Example**:
```html
<!-- Before -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
    gtag('config', 'G-XXXXXXXXXX', {

<!-- After (with your actual ID) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-ABC1234DEF"></script>
<script>
    gtag('config', 'G-ABC1234DEF', {
```

### 2.2 Deploy to Netlify
1. Commit changes to git:
   ```bash
   git add BoatBooking/book-a-boat.html
   git commit -m "feat: Add Google Analytics 4 tracking"
   git push
   ```

2. Netlify will automatically deploy the changes (usually within 1-2 minutes)

3. Verify deployment at: https://lakemacrowing.au

---

## Step 3: Verify Tracking is Working

### 3.1 Real-Time Reporting
1. Go to [Google Analytics](https://analytics.google.com/)
2. Navigate to: **Reports** → **Realtime**
3. Open your BoatBooking site in another tab: `https://lakemacrowing.au?boat_id=6283`
4. You should see:
   - **1 user** in the real-time view
   - Page views incrementing
   - Location data

**Note**: Real-time data appears within 10-30 seconds

### 3.2 Test Custom Events
While on the BoatBooking page, perform these actions and verify they appear in real-time:

1. **View Boat Availability** - Click the "📅 View boat availability" link
   - Should track: `view_availability` event

2. **Manage Bookings** - Click the "📋 Manage my bookings" link
   - Should track: `manage_bookings_click` event

3. **Date Selection** - Change the date in the date picker
   - Should track: `date_selection` event

4. **Booking Click** - Click a session button (Morning Session 1 or 2)
   - Should track: `booking_click` event

### 3.3 Check Event Details
In GA4 Real-time view:
1. Click on **Event count by Event name**
2. You should see custom events like:
   - `booking_click`
   - `view_availability`
   - `manage_bookings_click`
   - `date_selection`
   - `page_view`

---

## Step 4: Configure Custom Dimensions (Optional but Recommended)

To make the most of boat-specific data:

### 4.1 Create Custom Dimensions
1. In GA4, go to: **Admin** → **Custom definitions** → **Create custom dimensions**

2. Create dimension for **Boat ID**:
   - Dimension name: `Boat ID`
   - Scope: `Event`
   - Event parameter: `boat_id`
   - Click **Save**

3. Create dimension for **Boat Name**:
   - Dimension name: `Boat Name`
   - Scope: `Event`
   - Event parameter: `boat_name`
   - Click **Save**

4. Create dimension for **Session Type**:
   - Dimension name: `Session Type`
   - Scope: `Event`
   - Event parameter: `event_label`
   - Click **Save**

**Benefits**: These dimensions allow you to filter reports by specific boats and session types.

---

## Step 5: Set Up Key Reports and Dashboards

### 5.1 Create Custom Explorations
1. Go to: **Explore** → **Create new exploration**
2. Template: **Free form**

#### Report 1: Boat Popularity
- **Dimensions**: Add `Boat ID`, `Boat Name`
- **Metrics**: Add `Event count` (filter by `page_view` events)
- **Visualization**: Table or Bar chart
- **Purpose**: Identify which boats are viewed most frequently

#### Report 2: Booking Funnel
- **Segments**: Create segments for:
  - Users who view the page
  - Users who click booking buttons
- **Metrics**: Conversion rate
- **Purpose**: Understand how many visitors actually attempt bookings

#### Report 3: Manage Bookings Usage
- **Dimensions**: `Event name`
- **Metrics**: Event count
- **Filter**: `manage_bookings_click`
- **Purpose**: Track usage of v1.0 booking management link (critical for v2.0 decision)

### 5.2 Set Up Conversion Events
Mark key events as conversions:
1. Go to: **Admin** → **Events** → **Manage conversion events**
2. Mark these events as conversions:
   - `booking_click` (primary conversion)
   - `manage_bookings_click` (important for roadmap decisions)

---

## Step 6: Privacy Policy Update (If Required)

### 6.1 Check Current Privacy Policy
Review your existing privacy policy at: `https://lakemacquarierowingclub.org.au/privacy`

### 6.2 Add Google Analytics Disclosure (If Needed)
If not already mentioned, add a section about analytics:

```
## Website Analytics

We use Google Analytics to understand how visitors use our website. Google Analytics
collects information such as:
- Pages viewed
- Time spent on the site
- Browser and device information
- General location (city/region level)

No personally identifiable information is collected. You can opt-out of Google Analytics
by installing the Google Analytics Opt-out Browser Add-on:
https://tools.google.com/dlpage/gaoptout
```

**Note**: Check with your club's legal requirements for privacy disclosures.

---

## What Data Will You See?

### Immediate Insights (Week 1)
- **Page views per boat**: Which boats are getting the most attention?
- **Session preferences**: Do members prefer Morning Session 1 or 2?
- **Device usage**: Mobile vs desktop (validates mobile-first design)
- **Link clicks**: "Manage my bookings" usage (critical for v2.0 decision)

### Strategic Insights (Month 1-3)
- **Popular boats**: Prioritize QR code placement and maintenance
- **Booking patterns**: Time of day, day of week trends
- **Manage bookings demand**: Validates need for v2.0 booking manager
- **Damaged boat frequency**: How often are boats marked as damaged?

### Decision-Making Insights (3+ months)
- **v2.0 Booking Manager**: If "Manage my bookings" clicks >20/month → Build v2.0
- **QR Code ROI**: Which boats generate most bookings → prioritize QR code quality
- **Session time optimization**: Data-driven session time adjustments
- **Feature prioritization**: Which features matter most to members

---

## Troubleshooting

### "No data is showing in GA4"
**Check**:
1. ✅ Measurement ID is correct in `book-a-boat.html` (both places)
2. ✅ Changes are deployed to Netlify (check deployment status)
3. ✅ Ad blockers are disabled (test in incognito mode)
4. ✅ Real-time view is selected (data appears within 30 seconds)
5. ✅ Correct GA4 property is selected (check property dropdown)

### "Events are not appearing"
**Check**:
1. ✅ Open browser console (F12) and check for JavaScript errors
2. ✅ Verify `gtag` function exists: type `gtag` in console
3. ✅ Check Network tab for requests to `google-analytics.com`

### "Real-time works but reports are empty"
**Wait**: Standard reports take 24-48 hours to populate. Check again tomorrow.

### "Custom dimensions are not showing data"
**Wait**: Custom dimensions take 24-48 hours to start collecting data after creation.

---

## Monitoring and Maintenance

### Weekly (Optional)
- Review Real-time reports during peak booking times
- Check for any unusual activity or errors

### Monthly (Recommended)
- Review key metrics:
  - Total page views
  - Booking button clicks
  - "Manage my bookings" clicks
  - Most popular boats
- Export report for committee meetings

### Quarterly (Strategic)
- Analyze trends over 3-month period
- Make roadmap decisions based on data:
  - Is v2.0 booking manager justified?
  - Which boats need priority maintenance?
  - Should session times be adjusted?
- Update roadmap priorities based on insights

---

## Cost Breakdown

| Item | Cost | Notes |
|------|------|-------|
| Google Analytics 4 | **$0** | Free tier (10 million events/month) |
| Implementation | **$0** | Already integrated |
| Maintenance | **$0** | No ongoing costs |
| **Total** | **$0** | Completely free |

**Current BoatBooking Usage**: Estimated <10,000 events/month (well within free tier)

---

## Next Steps

### Immediate (Next 1 hour)
1. ✅ Create GA4 property (Step 1)
2. ✅ Add Measurement ID to book-a-boat.html (Step 2)
3. ✅ Deploy to Netlify
4. ✅ Verify tracking works (Step 3)

### Short-term (Next 1 week)
1. ✅ Create custom dimensions (Step 4)
2. ✅ Set up key reports (Step 5)
3. ✅ Monitor initial data collection
4. ✅ Fix any tracking issues

### Long-term (Next 3 months)
1. ✅ Collect baseline data
2. ✅ Review monthly reports
3. ✅ Make data-driven roadmap decisions (especially v2.0 booking manager)
4. ✅ Optimize based on insights

---

## Questions or Issues?

**Common Resources**:
- [Google Analytics Help Center](https://support.google.com/analytics/)
- [GA4 Setup Guide](https://support.google.com/analytics/answer/9304153)
- [GA4 Event Tracking](https://developers.google.com/analytics/devguides/collection/ga4/events)

**Implementation Support**:
- Review this documentation
- Check browser console for errors
- Test in incognito mode (to avoid ad blockers)

---

**Last Updated**: 2025-12-14
**Implementation**: Complete (pending Measurement ID)
**Status**: ⏳ Awaiting configuration

**Related Documentation**:
- [docs/planning/roadmap.md](../docs/planning/roadmap.md#google-analytics-integration) - Roadmap item
- [BoatBooking/book-a-boat.html](book-a-boat.html) - Implementation
