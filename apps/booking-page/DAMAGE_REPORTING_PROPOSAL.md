# Boat Damage Reporting Feature - Proposal

**Version**: 1.0
**Date**: 2025-11-23
**Status**: Proposed (Awaiting Approval)

---

## User Story

**As a** rowing club member
**I want to** easily report damage to a boat
**So that** the right people are notified to fix the damage

---

## Acceptance Criteria

1. ✅ The bottom of the BoatBooking page has the ability for a member to report damage to a boat
2. ✅ The following common types of damage can be selected by the member:
   - Hull damage
   - Rigger damage
   - Seat
   - Seat wheels
   - Fin or steering
   - Other
3. ✅ The member may optionally add text to describe the damage
   - **Note**: If "Other" is selected, the member MUST add text to describe the damage
4. ✅ When the member submits the damage report, an email is sent to a configurable email address
   - **4a.** The email address is set to `boatcaptain@lakemacquarierowingclub.org.au` by default

---

## Current Architecture Analysis

### BoatBooking Project Characteristics

- ✅ **Pure static HTML/JavaScript site** - No backend server
- ✅ **Hosted on GitHub Pages** (or planned for Firebase Hosting)
- ✅ **No email sending capability** - Browser-based only
- ✅ **Uses GitHub Actions** for automated boat data scraping
- ✅ **QR code-based navigation** - Users scan codes on boats

### Key Constraint

**No backend means no direct email sending capability** from the static site.

---

## Proposed Solutions

Three options analyzed, ranked by recommendation.

---

## ⭐ Option 1: EmailJS Integration (RECOMMENDED)

### Overview

Use [EmailJS](https://www.emailjs.com/) - a client-side email service that works without a backend server.

### Architecture

```
book-a-boat.html (Browser)
    ↓ HTTPS POST
EmailJS API (Third-party service)
    ↓ SMTP
boatcaptain@lakemacquarierowingclub.org.au
```

### Implementation Details

#### Configuration Constants

```javascript
// Email configuration
const BOAT_CAPTAIN_EMAIL = 'boatcaptain@lakemacquarierowingclub.org.au';
const EMAILJS_SERVICE_ID = 'service_xxxxxxx';  // From EmailJS dashboard
const EMAILJS_TEMPLATE_ID = 'template_xxxxxxx'; // From EmailJS dashboard
const EMAILJS_PUBLIC_KEY = 'xxxxxxxxxxxxxxxxx'; // From EmailJS dashboard
```

#### UI Components

1. **Collapsible "Report Damage" section** at bottom of page
2. **Radio buttons** for damage type selection
3. **Textarea** for damage description (required if "Other" selected)
4. **Submit button** with loading states
5. **Success/error messaging** for user feedback

#### HTML Structure

```html
<!-- Add to bottom of book-a-boat.html, before footer -->
<section class="damage-report" id="damageReport">
    <button type="button" class="damage-toggle" id="damageToggle">
        ⚠️ Report Boat Damage
    </button>

    <form class="damage-form" id="damageForm" style="display: none;">
        <h3>Report Damage for <span id="damageBoatName"></span></h3>

        <div class="form-group">
            <label>Type of Damage *</label>
            <div class="damage-types">
                <label><input type="radio" name="damageType" value="Hull damage" required> Hull damage</label>
                <label><input type="radio" name="damageType" value="Rigger damage"> Rigger damage</label>
                <label><input type="radio" name="damageType" value="Seat"> Seat</label>
                <label><input type="radio" name="damageType" value="Seat wheels"> Seat wheels</label>
                <label><input type="radio" name="damageType" value="Fin or steering"> Fin or steering</label>
                <label><input type="radio" name="damageType" value="Other"> Other</label>
            </div>
        </div>

        <div class="form-group">
            <label for="damageDescription">
                Description <span id="requiredLabel">(required if "Other" selected)</span>
            </label>
            <textarea id="damageDescription" name="description" rows="4"
                      placeholder="Please describe the damage..."></textarea>
        </div>

        <button type="submit" class="btn-submit">Submit Damage Report</button>
        <div class="status-message" id="damageStatus"></div>
    </form>
</section>

<!-- EmailJS SDK -->
<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
```

#### JavaScript Implementation

```javascript
// Configuration
const BOAT_CAPTAIN_EMAIL = 'boatcaptain@lakemacquarierowingclub.org.au';
const EMAILJS_SERVICE_ID = 'service_xxxxxxx';
const EMAILJS_TEMPLATE_ID = 'template_xxxxxxx';
const EMAILJS_PUBLIC_KEY = 'xxxxxxxxxxxxxxxxx';

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

// Toggle damage form
document.getElementById('damageToggle').addEventListener('click', () => {
    const form = document.getElementById('damageForm');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
});

// Form validation and submission
document.getElementById('damageForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const damageType = document.querySelector('input[name="damageType"]:checked')?.value;
    const description = document.getElementById('damageDescription').value.trim();

    // Validation
    if (!damageType) {
        showStatus('error', 'Please select a damage type');
        return;
    }

    if (damageType === 'Other' && !description) {
        showStatus('error', 'Description is required when "Other" is selected');
        return;
    }

    // Send email via EmailJS
    try {
        const boat = boatData?.boats[BOAT_ID];
        const boatName = boat?.name || `Boat ID ${BOAT_ID}`;

        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
            to_email: BOAT_CAPTAIN_EMAIL,
            boat_id: BOAT_ID,
            boat_name: boatName,
            damage_type: damageType,
            description: description || 'No additional description provided',
            report_date: new Date().toLocaleString(),
            report_url: window.location.href
        });

        showStatus('success', 'Damage report submitted successfully! The boat captain has been notified.');
        document.getElementById('damageForm').reset();

    } catch (error) {
        console.error('Failed to send damage report:', error);
        showStatus('error', 'Failed to send damage report. Please try again or contact the boat captain directly.');
    }
});

function showStatus(type, message) {
    const status = document.getElementById('damageStatus');
    status.textContent = message;
    status.className = `status-message ${type}`;
}
```

#### EmailJS Email Template

Create in EmailJS dashboard:

```
Subject: Boat Damage Report - {{boat_name}}

Boat Damage Report

Boat: {{boat_name}} (ID: {{boat_id}})
Damage Type: {{damage_type}}
Description: {{description}}

Reported: {{report_date}}
Booking Page: {{report_url}}

Please investigate and update the boat status in RevSport if necessary.
```

### ✅ Advantages

1. ✅ **No backend required** - Works with static site
2. ✅ **Free tier** - 200 emails/month free (sufficient for damage reports)
3. ✅ **Quick setup** - ~30 minutes including EmailJS account creation
4. ✅ **Reliable** - Dedicated email delivery service
5. ✅ **Mobile-friendly** - Works on all devices
6. ✅ **No infrastructure** - No server to maintain
7. ✅ **Configurable** - Easy to change recipient email
8. ✅ **User confirmation** - Success/error feedback
9. ✅ **Spam prevention** - Built-in rate limiting

### ❌ Disadvantages

1. ⚠️ **Third-party dependency** - Relies on EmailJS service
2. ⚠️ **API keys in client code** - Public key visible (but safe, designed for this)
3. ⚠️ **Rate limiting** - 200 emails/month on free tier (upgradeable to $7/month for 1,000)
4. ⚠️ **No database** - No record of reports (only emails)

### 🔒 Security Considerations

- ✅ EmailJS public key is safe to expose (designed for client-side use)
- ✅ Rate limiting prevents spam abuse
- ⚠️ Could add basic CAPTCHA if spam becomes an issue
- ✅ No sensitive data collected (boat ID + damage description only)

### 💰 Cost

- **Free tier:** 200 emails/month
- **Paid tier ($7/month):** 1,000 emails/month
- **Expected usage:** 5-20 damage reports/month

**Verdict:** Free tier is sufficient

### ⚙️ Setup Steps

1. Create EmailJS account at https://www.emailjs.com/
2. Add email service (Gmail, Outlook, or club's SMTP)
3. Create email template
4. Get Service ID, Template ID, Public Key
5. Add code to `book-a-boat.html`
6. Test with real damage report

### 🎯 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| EmailJS service down | Low | Medium | Fallback to `mailto:` link |
| Rate limit exceeded | Very Low | Low | Monitor usage, upgrade if needed |
| Spam abuse | Low | Low | Add CAPTCHA if needed |
| API key exposure | N/A | None | Public key is designed to be exposed |

**Overall Risk:** ✅ **LOW**

### 📅 Implementation Timeline

| Phase | Duration | Tasks |
|-------|----------|-------|
| **Phase 1: EmailJS Setup** | 15 min | Create account, configure email service, create template |
| **Phase 2: Code Implementation** | 30 min | Add HTML, CSS, JavaScript to book-a-boat.html |
| **Phase 3: Testing** | 15 min | Test validation, email delivery, mobile compatibility |
| **Phase 4: Deployment** | 5 min | Commit, push, deploy |
| **TOTAL** | **~1 hour** | |

---

## Option 2: Add Backend to lmrc-booking-system

### Overview

Add a damage report API endpoint to the existing `lmrc-booking-system` backend, use Nodemailer for email sending.

### Architecture

```
book-a-boat.html (Browser)
    ↓ HTTPS POST
lmrc-booking-system API (/api/v1/damage-report)
    ↓ Nodemailer SMTP
boatcaptain@lakemacquarierowingclub.org.au
```

### Implementation Details

#### New Files

- `lmrc-booking-system/src/server/routes/damage-reports.ts`
- `lmrc-booking-system/src/services/email.service.ts`

#### Modified Files

- `lmrc-booking-system/src/server/app.ts` - Add route
- `lmrc-booking-system/package.json` - Add nodemailer dependency
- `lmrc-booking-system/.env` - Add SMTP configuration
- `BoatBooking/book-a-boat.html` - Add form + fetch call

#### Backend Code (TypeScript)

```typescript
// lmrc-booking-system/src/services/email.service.ts
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendDamageReport(data: {
  boatId: string;
  boatName: string;
  damageType: string;
  description: string;
}) {
  await transporter.sendMail({
    from: process.env.SMTP_USER,
    to: process.env.BOAT_CAPTAIN_EMAIL || 'boatcaptain@lakemacquarierowingclub.org.au',
    subject: `Boat Damage Report - ${data.boatName}`,
    html: `
      <h2>Boat Damage Report</h2>
      <p><strong>Boat:</strong> ${data.boatName} (ID: ${data.boatId})</p>
      <p><strong>Damage Type:</strong> ${data.damageType}</p>
      <p><strong>Description:</strong> ${data.description}</p>
      <p><strong>Reported:</strong> ${new Date().toLocaleString()}</p>
    `,
  });
}
```

```typescript
// lmrc-booking-system/src/server/routes/damage-reports.ts
import { Router } from 'express';
import { z } from 'zod';
import { sendDamageReport } from '../services/email.service.js';

const router = Router();

const damageReportSchema = z.object({
  boatId: z.string(),
  boatName: z.string(),
  damageType: z.enum(['Hull damage', 'Rigger damage', 'Seat', 'Seat wheels', 'Fin or steering', 'Other']),
  description: z.string().optional(),
}).refine(data => {
  if (data.damageType === 'Other' && !data.description) {
    return false;
  }
  return true;
}, {
  message: 'Description is required when damage type is "Other"',
});

router.post('/damage-report', async (req, res) => {
  try {
    const data = damageReportSchema.parse(req.body);

    await sendDamageReport(data);

    res.json({ success: true, message: 'Damage report sent successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ success: false, message: error.errors[0].message });
    } else {
      console.error('Failed to send damage report:', error);
      res.status(500).json({ success: false, message: 'Failed to send damage report' });
    }
  }
});

export default router;
```

#### Frontend Code (JavaScript)

```javascript
// BoatBooking/book-a-boat.html - form submission
async function submitDamageReport(damageType, description) {
  const boat = boatData?.boats[BOAT_ID];
  const boatName = boat?.name || `Boat ID ${BOAT_ID}`;

  const response = await fetch('https://your-lmrc-booking-system-url.com/api/v1/damage-report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      boatId: BOAT_ID,
      boatName: boatName,
      damageType: damageType,
      description: description || 'No additional description provided',
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to submit damage report');
  }

  const result = await response.json();
  return result;
}
```

### ✅ Advantages

1. ✅ **No third-party dependency** - Self-hosted solution
2. ✅ **Full control** - Complete control over email delivery
3. ✅ **No rate limits** - Send unlimited emails
4. ✅ **Could add database** - Store damage reports for tracking
5. ✅ **Consistent stack** - Uses existing lmrc-booking-system infrastructure
6. ✅ **TypeScript + Zod** - Type-safe validation

### ❌ Disadvantages

1. ❌ **Backend required** - lmrc-booking-system must be deployed and accessible
2. ❌ **CORS configuration** - Need to allow cross-origin requests from BoatBooking domain
3. ❌ **SMTP credentials** - Need to configure and secure SMTP settings
4. ❌ **Dependency coupling** - BoatBooking depends on lmrc-booking-system availability
5. ❌ **More complex** - Additional backend code to maintain
6. ❌ **Deployment** - Both projects must be deployed correctly

### 🔒 Security Considerations

- ✅ SMTP credentials secured in environment variables
- ✅ Zod validation prevents injection attacks
- ⚠️ Need CORS configuration (security risk if misconfigured)
- ⚠️ Need rate limiting to prevent spam abuse
- ✅ TypeScript provides type safety

### 💰 Cost

- **lmrc-booking-system hosting:** Already deployed (assume $0 if on Raspberry Pi)
- **SMTP service:** Use Gmail free tier or club's email server ($0)
- **Additional maintenance:** ~1 hour/month

### 🎯 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| lmrc-booking-system down | Medium | High | Monitor uptime, add fallback |
| CORS misconfiguration | Medium | High | Test thoroughly, document |
| SMTP credentials leaked | Low | High | Environment variables, never commit .env |
| Cross-project coupling | High | Medium | Document dependency clearly |

**Overall Risk:** ⚠️ **MEDIUM** (due to cross-project dependency)

---

## Option 3: Simple `mailto:` Link (FALLBACK)

### Overview

Use a `mailto:` link that opens the user's email client with pre-filled information.

### Implementation

```html
<section class="damage-report">
    <h3>Report Boat Damage</h3>
    <form id="damageForm">
        <!-- Same form fields as Option 1 -->

        <button type="button" id="emailDamageBtn">Email Damage Report</button>
    </form>
</section>

<script>
document.getElementById('emailDamageBtn').addEventListener('click', () => {
    const damageType = document.querySelector('input[name="damageType"]:checked')?.value;
    const description = document.getElementById('damageDescription').value.trim();

    if (!damageType) {
        alert('Please select a damage type');
        return;
    }

    if (damageType === 'Other' && !description) {
        alert('Description is required for "Other" damage type');
        return;
    }

    const boat = boatData?.boats[BOAT_ID];
    const boatName = boat?.name || `Boat ID ${BOAT_ID}`;

    const subject = encodeURIComponent(`Boat Damage Report - ${boatName}`);
    const body = encodeURIComponent(`
Boat Damage Report

Boat: ${boatName} (ID: ${BOAT_ID})
Damage Type: ${damageType}
Description: ${description || 'No additional description provided'}

Reported: ${new Date().toLocaleString()}
    `.trim());

    window.location.href = `mailto:${BOAT_CAPTAIN_EMAIL}?subject=${subject}&body=${body}`;
});
</script>
```

### ✅ Advantages

1. ✅ **Zero dependencies** - No third-party services
2. ✅ **Zero cost** - Completely free
3. ✅ **Simple implementation** - ~50 lines of code
4. ✅ **No backend** - Works with static site
5. ✅ **Zero maintenance** - Nothing to maintain

### ❌ Disadvantages

1. ❌ **Unreliable** - User can cancel or modify email
2. ❌ **Poor UX** - Opens email client (might not be configured)
3. ❌ **No confirmation** - Can't confirm email was sent
4. ❌ **Mobile issues** - Email clients vary on mobile devices
5. ❌ **No tracking** - No way to know if report was sent
6. ❌ **User friction** - Extra steps for user

### 🎯 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| User doesn't have email client | High | High | Provide phone number alternative |
| User cancels email | Medium | Medium | Clear instructions to send |
| Email not received | Medium | High | Ask users to confirm submission |

**Overall Risk:** ❌ **HIGH** (unreliable)

---

## 📊 Comparison Matrix

| Criteria | Option 1: EmailJS | Option 2: Backend API | Option 3: mailto: |
|----------|-------------------|----------------------|-------------------|
| **No backend required** | ✅ Yes | ❌ No | ✅ Yes |
| **Reliability** | ✅ High | ✅ High | ❌ Low |
| **Cost** | ✅ Free | ✅ Free | ✅ Free |
| **Setup time** | 30 minutes | 4 hours | 15 minutes |
| **Maintenance** | Zero | Medium | Zero |
| **User experience** | ✅ Excellent | ✅ Excellent | ❌ Poor |
| **Mobile friendly** | ✅ Yes | ✅ Yes | ⚠️ Varies |
| **Confirmation** | ✅ Yes | ✅ Yes | ❌ No |
| **Third-party dependency** | ⚠️ EmailJS | ✅ None | ✅ None |
| **Cross-project coupling** | ✅ None | ❌ High | ✅ None |
| **Security** | ✅ Good | ✅ Excellent | ✅ Good |
| **Spam prevention** | ✅ Built-in | ⚠️ Must implement | ❌ None |
| **Scalability** | ✅ Automatic | ✅ Good | ✅ N/A |

---

## 🎯 Final Recommendation

### ⭐ Choose Option 1: EmailJS ✅

#### Reasoning

1. ✅ **Perfect fit for static site** - No backend required
2. ✅ **Quick implementation** - Can be done in ~1 hour
3. ✅ **Excellent UX** - Seamless form submission with confirmation
4. ✅ **Zero maintenance** - No infrastructure to manage
5. ✅ **Free for your use case** - 200 emails/month is plenty for damage reports
6. ✅ **Low risk** - No cross-project dependencies
7. ✅ **Reliable** - Dedicated email delivery service
8. ✅ **Follows static site architecture** - Consistent with BoatBooking design

#### Why not Option 2?

- Creates tight coupling between BoatBooking and lmrc-booking-system
- Much more complex (4 hours vs 30 minutes setup)
- Requires CORS configuration (security risk if misconfigured)
- Higher maintenance burden

#### Why not Option 3?

- Poor user experience
- Unreliable (no confirmation email was sent)
- High risk of reports not being sent

---

## 📋 Acceptance Criteria Verification

| AC | Implementation | Status |
|----|----------------|--------|
| **AC 1:** Bottom of page has damage reporting | Collapsible section at bottom before footer | ✅ Met |
| **AC 2:** Common damage types selectable | Radio buttons for all 6 types | ✅ Met |
| **AC 3:** Optional text description | Textarea, required if "Other" selected | ✅ Met |
| **AC 4:** Email sent to configurable address | `BOAT_CAPTAIN_EMAIL` constant | ✅ Met |
| **AC 4a:** Default: boatcaptain@... | Set in constant | ✅ Met |

---

## ⚠️ Significant Architectural Risks & Mitigations

### Option 1 (EmailJS) - Recommended ✅

**Risk Level: LOW**

#### Risk 1: Third-party dependency
- **Description:** If EmailJS service shuts down, feature breaks
- **Likelihood:** Low (EmailJS is established, 5+ years in operation)
- **Impact:** Medium (feature stops working)
- **Mitigation:** Can migrate to Option 2 if needed (backend API)

#### Risk 2: API key visibility
- **Description:** Public API key visible in browser source code
- **Likelihood:** N/A (by design)
- **Impact:** None (public key is safe to expose)
- **Mitigation:** This is the intended use case for EmailJS

#### Risk 3: Rate limiting
- **Description:** Could hit 200 email/month limit
- **Likelihood:** Very Low (would need 6+ damage reports/day)
- **Impact:** Low (reports temporarily fail until next month)
- **Mitigation:** Monitor usage, easy upgrade to $7/month for 1,000 emails

### Option 2 (Backend API) - Alternative ⚠️

**Risk Level: MEDIUM**

#### Risk 1: Cross-project coupling
- **Description:** BoatBooking depends on lmrc-booking-system availability
- **Likelihood:** Medium (dependent on deployment stability)
- **Impact:** High (damage reports fail if backend down)
- **Mitigation:** Add fallback to `mailto:` link, monitor uptime

#### Risk 2: CORS security
- **Description:** Must allow cross-origin requests from BoatBooking domain
- **Likelihood:** Medium (configuration error)
- **Impact:** High (could allow unauthorized access)
- **Mitigation:** Whitelist specific domains only, thorough testing

#### Risk 3: Deployment complexity
- **Description:** Both projects must be correctly deployed and configured
- **Likelihood:** High (more moving parts)
- **Impact:** Medium (harder to troubleshoot issues)
- **Mitigation:** Comprehensive deployment documentation, health checks

### Option 3 (mailto) - Not Recommended ❌

**Risk Level: HIGH**

#### Risk 1: Unreliable delivery
- **Description:** No guarantee email is actually sent by user
- **Likelihood:** High (user can cancel, modify, or not send)
- **Impact:** High (damage reports could be lost)
- **Mitigation:** None - inherent limitation of approach

---

## 💬 Questions for Approval

Before proceeding with implementation, please confirm:

1. **Do you approve Option 1 (EmailJS)?** Or would you prefer Option 2 (Backend API)?

2. **Is `boatcaptain@lakemacquarierowingclub.org.au` the correct default email address?**

3. **Do you have access to an email account for EmailJS SMTP configuration?**
   (Gmail, Outlook, or club email server)

4. **Should damage reports be stored in a database?**
   (Option 1 only sends email, no database storage)

5. **UI placement:** Collapsible section at bottom of booking page - is this acceptable?

6. **Any additional damage types** beyond the 6 specified in acceptance criteria?

---

## 📅 Next Steps (If Approved)

### Phase 1: EmailJS Account Setup
- [ ] Create EmailJS account at https://www.emailjs.com/
- [ ] Configure email service (Gmail/Outlook/SMTP)
- [ ] Create email template
- [ ] Obtain Service ID, Template ID, Public Key

### Phase 2: Implementation
- [ ] Add damage report form HTML to `book-a-boat.html`
- [ ] Add CSS styling for form (matching existing design system)
- [ ] Add JavaScript for form validation and EmailJS integration
- [ ] Add EmailJS SDK script tag

### Phase 3: Testing
- [ ] Test all damage type selections
- [ ] Test "Other" validation (requires description)
- [ ] Test email delivery to boat captain address
- [ ] Test on mobile devices (iOS and Android)
- [ ] Test error handling (network failures)

### Phase 4: Deployment
- [ ] Commit changes to git repository
- [ ] Push to GitHub
- [ ] Deploy to production (GitHub Pages/Firebase)
- [ ] Verify production functionality
- [ ] Update documentation

### Phase 5: Documentation
- [ ] Update README with damage reporting feature
- [ ] Document EmailJS configuration process
- [ ] Add troubleshooting guide for common issues

---

## 📚 References

- **EmailJS Documentation:** https://www.emailjs.com/docs/
- **EmailJS Pricing:** https://www.emailjs.com/pricing/
- **LMRC Conventions:** See `CONVENTIONS.md`
- **BoatBooking Architecture:** See `PROPOSAL.md`

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2025-11-23 | Claude AI | Initial proposal created |

---

**Status:** 🟡 **Awaiting user approval to proceed with implementation**
