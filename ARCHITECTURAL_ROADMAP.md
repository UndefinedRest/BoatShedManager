# LMRC Architectural Roadmap for Multi-Club Product
## Strategic Technical Planning for Product Launch

**Document Type**: Architectural Roadmap & Technical Backlog
**Target Audience**: Product Management & Engineering Leadership
**Last Updated**: 2025-10-30
**Status**: Planning Phase

---

## Executive Summary

This document outlines the architectural changes required to transform the LMRC solution from a single-club deployment into a commercially viable product for distribution to rowing clubs worldwide. The roadmap is organized into four distinct releases, each building towards a turnkey solution that can be shipped as a pre-configured Raspberry Pi.

**Current State**: Production-ready single-club deployment at Lake Macquarie Rowing Club (LMRC)
**Target State**: Commercial product deployable to 100+ rowing clubs with minimal technical support
**Timeline**: 18-24 months across 4 major releases
**Primary Goal**: Enable non-technical club administrators to deploy and configure the system independently

### Key Business Outcomes

| Release | Business Value | Target Market |
|---------|---------------|---------------|
| **v1.5** (Foundation) | Simplified deployment for pilot customers | 5-10 early adopter clubs |
| **v2.0** (Self-Service) | Zero-touch setup, scalable onboarding | 20-50 clubs |
| **v3.0** (Enterprise) | Remote management, support at scale | 50-200 clubs |
| **v4.0** (Platform) | Multi-tenant SaaS option, recurring revenue | 200+ clubs |

---

## Current State Analysis

### Architectural Strengths ✅

1. **Production-Proven**: All four sub-projects running stably in production
2. **Well-Documented**: 100+ pages of technical documentation
3. **Modern Stack**: Node.js, TypeScript, React - maintainable technologies
4. **Resource Efficient**: Runs on affordable Raspberry Pi hardware
5. **Modular Design**: Four independent projects with clear boundaries
6. **Configuration-Driven**: Extensive use of JSON/environment configuration

### Critical Gaps for Multi-Club Deployment ❌

| Gap | Impact | Business Risk |
|-----|--------|---------------|
| **No Startup Wizard** | Requires SSH and command-line expertise | Blocks 80% of potential customers |
| **Plaintext Credentials** | Security liability | Reputation risk, compliance issues |
| **Fragmented Configuration** | Different config approaches per app | High support burden, poor UX |
| **Manual Deployment** | Requires technical expertise per install | Limits scalability, high cost per customer |
| **No Remote Management** | Can't support customers remotely | Unsustainable support model |
| **Single-Club Hardcoding** | Club-specific values scattered in code | Can't scale to multiple clubs |
| **No Update Mechanism** | Manual git pull per device | Security risk, feature adoption lag |
| **No Monitoring** | Can't detect failures proactively | Customer churn, support escalations |

### Technology Assessment

| Component | Technology | Maturity | Multi-Club Readiness | Action Required |
|-----------|-----------|----------|---------------------|-----------------|
| Booking Viewer | TypeScript/Express | ✅ Production | 🟡 Partial | Configuration standardization |
| Boat Booking | Static HTML/Netlify | ✅ Production | 🟡 Partial | Self-hosting option needed |
| Noticeboard | Node/React/Puppeteer | ✅ Production | 🟡 Partial | Configuration standardization |
| Pi Deployment | Bash/systemd | ✅ Production | 🔴 Single-Club | Complete redesign |
| Authentication | Per-app implementation | ✅ Works | 🔴 Duplicated | Shared library needed |
| Configuration | Mixed approaches | ✅ Works | 🔴 Inconsistent | Unified system required |

---

## Target Architecture Vision

### Architectural Principles

1. **Zero-Touch Deployment**: Customer plugs in Pi, completes web wizard, system is operational
2. **Configuration Over Customization**: No code changes needed per club
3. **Secure by Default**: Encrypted credentials, minimal attack surface
4. **Observable**: Built-in monitoring, logging, health checks
5. **Maintainable**: Remote updates, rollback capability
6. **Self-Service**: Web-based configuration, no SSH required
7. **Portable**: Same software runs at any club with minimal config

### Conceptual Target Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Management Portal (Cloud)                    │
│  - Customer provisioning      - Remote monitoring                │
│  - Update distribution        - Support dashboard                │
│  - License management         - Analytics                        │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTPS/API
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼─────────┐  ┌──────▼──────────┐  ┌─────▼──────────┐
│   Club A        │  │   Club B        │  │   Club C       │
│   Raspberry Pi  │  │   Raspberry Pi  │  │   Raspberry Pi │
│                 │  │                 │  │                │
│ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌────────────┐ │
│ │Setup Wizard │ │  │ │Setup Wizard │ │  │ │Setup Wizard│ │
│ │(First Boot) │ │  │ │(First Boot) │ │  │ │(First Boot)│ │
│ └─────────────┘ │  │ └─────────────┘ │  │ └───────────┘  │
│                 │  │                 │  │                │
│ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌────────────┐ │
│ │   Config    │ │  │ │   Config    │ │  │ │   Config   │ │
│ │  Management │ │  │ │  Management │ │  │ │ Management │ │
│ │   Service   │ │  │ │   Service   │ │  │ │  Service   │ │
│ └─────────────┘ │  │ └─────────────┘ │  │ └───────────┘  │
│                 │  │                 │  │                │
│ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌────────────┐ │
│ │Applications │ │  │ │Applications │ │  │ │Applications│ │
│ │  (1-3 apps) │ │  │ │  (1-3 apps) │ │  │ │ (1-3 apps) │ │
│ └─────────────┘ │  │ └─────────────┘ │  │ └───────────┘  │
└─────────────────┘  └─────────────────┘  └────────────────┘
```

---

## Release Roadmap

### Release 1.5: Foundation (3-4 months)
**Theme**: Make it deployable by moderately technical users
**Goal**: Deploy to 3-5 pilot clubs with hands-on support

**Key Deliverables**:
- Unified configuration system across all apps
- Shared authentication library
- Encrypted credential storage
- Improved deployment scripts
- Club profile abstraction

**Success Criteria**:
- Deploy to 3 pilot clubs with <4 hours onsite time each
- Zero SSH access needed after initial setup
- Same deployment process works at all clubs

---

### Release 2.0: Self-Service (6-8 months)
**Theme**: Enable non-technical deployment
**Goal**: Ship pre-configured hardware to clubs

**Key Deliverables**:
- Setup wizard (web-based, captive portal)
- SD card image builder
- Automated WiFi configuration
- Web-based configuration UI for all settings
- Health check dashboard

**Success Criteria**:
- Deploy to 10 clubs with ZERO onsite time
- 95% of customers complete setup without support ticket
- Average setup time <20 minutes

---

### Release 3.0: Enterprise (6-8 months)
**Theme**: Support at scale
**Goal**: Manage 50+ clubs efficiently

**Key Deliverables**:
- Remote management portal
- Automated update system with rollback
- Centralized monitoring and alerting
- Support ticketing integration
- Customer self-service portal
- Usage analytics

**Success Criteria**:
- Support 50+ clubs with <2 FTE support staff
- 99.5% uptime across fleet
- <1 hour mean time to resolution for issues
- 80% of issues resolved without customer contact

---

### Release 4.0: Platform (6-8 months)
**Theme**: Scalable recurring revenue
**Goal**: 200+ clubs with sustainable business model

**Key Deliverables**:
- Multi-tenant cloud architecture (optional)
- Plugin/extension system
- Subscription and license management
- Partner/reseller program
- Advanced analytics and reporting
- Mobile management app

**Success Criteria**:
- 200+ active clubs
- 85% annual retention rate
- <10% customer acquisition cost relative to LTV
- Profitable unit economics

---

## Prioritized Technical Backlog

Each item includes: **Priority** (P0-P3), **Effort** (S/M/L/XL), **Risk** (Low/Med/High), **Dependencies**, and **Business Reasoning**.

---

### Release 1.5: Foundation Layer

#### [P0] #001: Create Shared Configuration Library

**Effort**: L (4-6 weeks)
**Risk**: Medium
**Dependencies**: None
**Target Release**: v1.5

**Problem**: Each application has its own configuration approach:
- Booking Viewer: `.env` + `tv-display.json` + Zod validation
- Noticeboard: `.env` + `config.json`
- Boat Booking: `.env` only
- Different schemas, no validation consistency

**Proposed Solution**:
Create `@lmrc/config` NPM package (or monorepo workspace) with:

1. **Unified Club Profile Schema**
   ```typescript
   interface ClubProfile {
     id: string;                      // Unique identifier
     name: string;                    // "Lake Macquarie Rowing Club"
     shortName: string;               // "LMRC"
     branding: {
       logoUrl: string;
       primaryColor: string;          // Hex color
       secondaryColor: string;
       customCSS?: string;            // Optional advanced styling
     };
     revSport: {
       baseUrl: string;
       credentialRef: string;         // Reference to credential vault
     };
     sessions: {
       morning: { start: string; end: string; };
       evening: { start: string; end: string; };
       // Extensible for other sessions
     };
     timezone: string;                // "Australia/Sydney"
     locale: string;                  // "en-AU"
   }
   ```

2. **Configuration Manager Class**
   - Loads configuration from file system
   - Validates against Zod schemas
   - Provides getters for all config values
   - Emits events on config changes
   - Supports hot-reload without restart

3. **Migration Utilities**
   - Converts existing `.env` → Club Profile
   - Validates existing configs
   - Reports missing required fields

**Benefits**:
- **Consistency**: One configuration approach for all apps
- **Validation**: Type-safe configuration across solution
- **Maintainability**: Single source of truth for club data
- **Portability**: Easy to migrate club to new device
- **Testing**: Mock configurations for testing

**Implementation Plan**:
1. Week 1-2: Design schema, create package structure
2. Week 3: Implement configuration manager
3. Week 4: Migrate Booking Viewer to use shared config
4. Week 5: Migrate Noticeboard to use shared config
5. Week 6: Migrate Boat Booking, testing, documentation

**Risks & Mitigation**:
- **Risk**: Breaking changes to existing deployments
  - **Mitigation**: Maintain backward compatibility, provide migration tool
- **Risk**: Over-engineering configuration system
  - **Mitigation**: Start simple, iterate based on actual needs

---

#### [P0] #002: Implement Secure Credential Vault

**Effort**: M (3-4 weeks)
**Risk**: High
**Dependencies**: #001
**Target Release**: v1.5

**Problem**: RevSport credentials stored in plaintext `.env` files
- Security liability
- Fails compliance audits
- Can't safely share configuration
- Risk of accidental git commits

**Proposed Solution**:
Implement secure credential storage using **systemd credentials** (native Linux approach) or **encrypted JSON files**.

**Option A: systemd Credentials** (Recommended for v1.5)
```bash
# Store credential securely
systemd-creds encrypt - /etc/lmrc/credentials/revsport.cred

# Service accesses via environment
[Service]
LoadCredential=revsport:/etc/lmrc/credentials/revsport.cred
Environment=REVSPORT_PASSWORD_FILE=/run/credentials/lmrc-booking-viewer.service/revsport
```

**Option B: Encrypted Configuration File** (Better for v2.0+)
```typescript
interface CredentialVault {
  version: string;
  encryption: "AES-256-GCM";
  credentials: {
    [key: string]: {
      encrypted: string;      // Base64 encrypted value
      iv: string;             // Initialization vector
      authTag: string;        // Authentication tag
      metadata: {
        createdAt: string;
        expiresAt?: string;
        lastRotated?: string;
      };
    };
  };
}
```

**Implementation**:
1. **Credential Service** (`@lmrc/credentials`)
   - Encryption/decryption utilities
   - Key derivation from device-specific seed
   - Secure key storage in systemd
   - Credential rotation API

2. **Migration Tool**
   - Scans for `.env` files
   - Encrypts credentials
   - Updates service configurations
   - Removes plaintext credentials

3. **Setup Wizard Integration**
   - Collects credentials via secure form
   - Never logs credentials
   - Stores encrypted immediately
   - Validates credentials before storing

**Benefits**:
- **Security**: Industry-standard encryption
- **Compliance**: Meets enterprise security requirements
- **Auditability**: Track credential access
- **Rotation**: Easy to rotate compromised credentials
- **Distribution**: Can ship devices without credentials pre-loaded

**Implementation Plan**:
1. Week 1: Research systemd credentials, design vault schema
2. Week 2: Implement credential service library
3. Week 3: Integrate with all applications
4. Week 4: Build migration tool, test thoroughly

**Risks & Mitigation**:
- **Risk**: Key management complexity
  - **Mitigation**: Use device-specific keys, document recovery process
- **Risk**: Locked out if encryption fails
  - **Mitigation**: Provide emergency recovery mechanism
- **Risk**: Performance overhead
  - **Mitigation**: Cache decrypted credentials in memory

---

#### [P0] #003: Standardize Authentication Across Applications

**Effort**: M (2-3 weeks)
**Risk**: Medium
**Dependencies**: #001, #002
**Target Release**: v1.5

**Problem**: Each application implements its own RevSport authentication
- Booking Viewer: Sophisticated auth with login mutex, retries, batching
- Noticeboard: Puppeteer-based auth
- Boat Booking: GitHub Actions auth (separate)
- Code duplication: ~500 lines duplicated across projects
- Bug fixes must be applied 3 times
- Inconsistent error handling

**Proposed Solution**:
Create `@lmrc/auth` shared authentication library.

**API Design**:
```typescript
class RevSportAuthClient {
  constructor(config: {
    baseUrl: string;
    credentials: CredentialProvider;
    options?: {
      maxRetries?: number;
      retryDelay?: number;
      timeout?: number;
      enableBatching?: boolean;
      batchSize?: number;
      batchDelay?: number;
    };
  });

  // Core methods
  async login(): Promise<Session>;
  async logout(): Promise<void>;
  async isAuthenticated(): Promise<boolean>;
  async refreshSession(): Promise<Session>;

  // HTTP methods with automatic re-auth on 403
  async get(url: string, options?: RequestOptions): Promise<Response>;
  async post(url: string, data: any, options?: RequestOptions): Promise<Response>;

  // Batch operations (for Booking Viewer use case)
  async batchGet(urls: string[], options?: BatchOptions): Promise<Response[]>;
}
```

**Features**:
1. **Login Mutex**: Prevents concurrent authentication attempts
2. **Automatic Re-auth**: Detects 403, re-authenticates transparently
3. **Retry Logic**: Exponential backoff for transient failures
4. **Rate Limiting**: Respects Cloudflare limits
5. **Session Management**: Cookie jar, session persistence
6. **Request Batching**: For efficient multi-request operations
7. **Observability**: Structured logging, metrics

**Benefits**:
- **Maintainability**: Fix bugs once, benefit all apps
- **Consistency**: Same authentication behavior everywhere
- **Reliability**: Proven patterns (from Booking Viewer v1.0)
- **Performance**: Optimized batching prevents rate limiting
- **Testing**: Easy to mock for unit tests

**Implementation Plan**:
1. Week 1: Extract Booking Viewer auth code into library
2. Week 2: Generalize for all use cases, add tests
3. Week 3: Integrate into all applications, remove duplicate code

**Risks & Mitigation**:
- **Risk**: Library doesn't cover edge cases for specific apps
  - **Mitigation**: Design with extension points, maintain app-specific layers
- **Risk**: Breaking existing functionality
  - **Mitigation**: Extensive integration testing before migration

---

#### [P0] #004: Club Profile Abstraction

**Effort**: S (1-2 weeks)
**Risk**: Low
**Dependencies**: #001
**Target Release**: v1.5

**Problem**: Club-specific values scattered throughout codebase
- Club name in HTML templates
- Logo URLs hardcoded
- Colors in CSS files
- Session times in multiple places
- Must edit code to change club

**Proposed Solution**:
Centralize all club-specific values in Club Profile (from #001).

**Implementation**:
1. **Template Engine Integration**
   - Replace hardcoded values with template variables
   - Use EJS, Handlebars, or similar for HTML templates
   - CSS variables for colors (already partially done)

2. **Build-Time Substitution**
   - For Boat Booking static site
   - Replace placeholders during build
   - Generate club-specific HTML

3. **Runtime Configuration**
   - For server-rendered apps
   - Load club profile at startup
   - Pass to templates

**Example**:
```html
<!-- Before -->
<h1>Lake Macquarie Rowing Club</h1>
<img src="/images/lmrc-logo.png" />

<!-- After -->
<h1><%= club.name %></h1>
<img src="<%= club.branding.logoUrl %>" />
```

```css
/* Before */
:root {
  --primary-color: #1e40af;
}

/* After (generated) */
:root {
  --primary-color: <%= club.branding.primaryColor %>;
}
```

**Benefits**:
- **Portability**: Same code for all clubs
- **Maintainability**: Change club info without code changes
- **Demo-ability**: Easy to demo with different club profiles
- **Testing**: Test with various club configurations

**Implementation Plan**:
1. Week 1: Audit all hardcoded club values, create migration checklist
2. Week 2: Replace with template variables, test with LMRC and mock club

**Risks & Mitigation**:
- **Risk**: Missing some hardcoded values
  - **Mitigation**: Comprehensive grep search, peer review

---

#### [P1] #005: Improve Deployment Scripts for Multi-Club

**Effort**: M (2-3 weeks)
**Risk**: Low
**Dependencies**: #001, #002, #004
**Target Release**: v1.5

**Problem**: Current deployment scripts assume single club (LMRC)
- Credentials template has LMRC-specific values
- No club profile prompt during install
- Can't easily deploy to second club

**Proposed Solution**:
Enhanced installation script with club profile generation.

**New Installation Flow**:
```bash
sudo ./install.sh

┌─────────────────────────────────────────────┐
│  LMRC Solution Installer v1.5               │
└─────────────────────────────────────────────┘

Step 1: Club Information
─────────────────────────
Club Name: [Sydney Rowing Club          ]
Short Name: [SRC   ]
RevSport URL: [https://sydneyrowingclub.org.au]

Step 2: Credentials
───────────────────
RevSport Username: [admin@src.com.au]
RevSport Password: [●●●●●●●●●●●●]
Confirm Password: [●●●●●●●●●●●●]

Step 3: Branding
────────────────
Logo URL: [https://src.com.au/logo.png]
Primary Color: [#1e3a8a] 🎨
Secondary Color: [#3b82f6] 🎨

Step 4: Application Selection
──────────────────────────────
Which applications to install?
[X] Booking Viewer
[X] Noticeboard
[ ] Boat Booking Page

Installing...
✓ Dependencies installed
✓ Applications deployed
✓ Configuration generated
✓ Credentials encrypted
✓ Services configured
✓ System ready!

Access configuration: http://raspberrypi.local:8080
```

**Benefits**:
- **User-Friendly**: No file editing required
- **Validated**: Check credentials work before proceeding
- **Secure**: Never stores plaintext credentials
- **Repeatable**: Can install at multiple clubs easily

**Implementation Plan**:
1. Week 1: Design interactive prompts, create mockups
2. Week 2: Implement interactive installer
3. Week 3: Testing with different club profiles, documentation

---

### Release 2.0: Self-Service Layer

#### [P0] #006: Setup Wizard (Web-Based)

**Effort**: XL (8-10 weeks)
**Risk**: High
**Dependencies**: #001, #002, #004
**Target Release**: v2.0

**Problem**: Non-technical users cannot configure Raspberry Pi
- Requires SSH access
- Requires command-line expertise
- Blocks 80% of potential customers

**Proposed Solution**:
Web-based setup wizard accessible via captive portal on first boot.

**Architecture**:
```
First Boot Detection → Setup Wizard Service → Captive Portal → Configuration → Normal Operation
```

**Setup Wizard Service**:
- Lightweight Node.js web server
- Starts automatically if no configuration exists
- Runs on port 80 (captive portal detection)
- Creates WiFi access point if no network available
- Shuts down after successful configuration

**User Flow**:
1. **Plug in Pi** → Boots, detects no configuration
2. **Create WiFi Hotspot** → "LMRC-Setup-XXXX"
3. **User Connects** → Captive portal redirects to wizard
4. **Step 1: Welcome** → Introduction, what to expect
5. **Step 2: WiFi** → Select network, enter password
6. **Step 3: Club Profile** → Name, URL, branding
7. **Step 4: Credentials** → RevSport username/password
8. **Step 5: Applications** → Select which apps to install
9. **Step 6: Verify** → Test RevSport connection, validate credentials
10. **Step 7: Complete** → Device reboots, starts applications

**Technical Components**:

1. **Captive Portal**
   ```typescript
   // Setup wizard server
   class SetupWizardServer {
     // Detect first boot
     isFirstBoot(): boolean;

     // Create AP if needed
     async createAccessPoint(ssid: string): Promise<void>;

     // Serve wizard UI
     async startWebServer(port: number): Promise<void>;

     // Apply configuration
     async applyConfiguration(config: ClubProfile): Promise<void>;

     // Validate and test
     async validateConfiguration(config: ClubProfile): Promise<ValidationResult>;

     // Finalize setup
     async finalizeSetup(): Promise<void>;
   }
   ```

2. **WiFi Configuration Module**
   - Scans for available networks
   - Generates wpa_supplicant configuration
   - Tests connectivity before proceeding

3. **Credential Validation**
   - Tests RevSport login before saving
   - Clear error messages if credentials fail
   - Option to retry without restarting wizard

4. **Progress Tracking**
   - Save wizard progress to temp storage
   - Resume if browser closes
   - Clear on successful completion

**UI Design**:
- Responsive (mobile-friendly)
- Simple, wizard-style navigation
- Visual progress indicator
- Validation feedback in real-time
- Accessibility compliant (WCAG 2.1 AA)

**Benefits**:
- **Market Expansion**: Unlocks non-technical customer segment
- **Reduced Support**: 90% reduction in setup support tickets
- **Faster Onboarding**: Setup time <20 minutes vs 2+ hours
- **Better UX**: Professional setup experience
- **Quality Control**: Validation ensures correct configuration

**Implementation Plan**:
1. Week 1-2: Architecture design, prototype captive portal
2. Week 3-4: Implement WiFi configuration module
3. Week 5-6: Build wizard UI (React/Vue)
4. Week 7-8: Integrate with credential vault, club profile
5. Week 9: Testing with various WiFi environments
6. Week 10: Documentation, polish, final testing

**Risks & Mitigation**:
- **Risk**: Captive portal detection varies by device/OS
  - **Mitigation**: Test on iOS, Android, Windows, macOS
- **Risk**: WiFi configuration fails
  - **Mitigation**: Provide fallback: connect to Ethernet, access via IP
- **Risk**: Wizard crashes mid-setup
  - **Mitigation**: Save progress, resume capability
- **Risk**: Complex networking environments (enterprise WiFi)
  - **Mitigation**: Advanced mode with manual configuration

---

#### [P0] #007: SD Card Image Builder

**Effort**: L (4-6 weeks)
**Risk**: Medium
**Dependencies**: #001, #002, #004, #006
**Target Release**: v2.0

**Problem**: Manual installation on every Raspberry Pi
- Time-consuming (1-2 hours per device)
- Error-prone
- Requires technical knowledge
- Doesn't scale

**Proposed Solution**:
Automated SD card image creation pipeline.

**Architecture**:
```
Base Raspberry Pi OS Image → Customize → Inject LMRC Software → Test → Distribute
```

**Image Builder Pipeline**:

1. **Base Image Selection**
   - Raspberry Pi OS Lite (64-bit)
   - Minimal footprint
   - Latest security patches

2. **Customization Layer**
   - Pre-install Node.js 20+
   - Install system dependencies (chromium, jq, etc.)
   - Configure systemd services
   - Install LMRC applications
   - Add setup wizard
   - Remove unnecessary packages

3. **First-Boot Configuration**
   - Expand filesystem
   - Generate unique device ID
   - Start setup wizard service
   - Create setup WiFi AP (if no network)

4. **Security Hardening**
   - Disable default passwords
   - Configure firewall
   - Enable automatic security updates
   - Harden SSH (disable password auth, key-only)
   - Set up audit logging

**Implementation**:

```bash
# Image builder script
./build-image.sh --version 2.0.0 --output lmrc-v2.0.0.img

# Automated process:
# 1. Download base OS
# 2. Mount image
# 3. Chroot and customize
# 4. Install LMRC software
# 5. Configure first-boot scripts
# 6. Compress and checksum
# 7. Upload to distribution server
```

**CI/CD Integration**:
```yaml
# GitHub Actions workflow
name: Build SD Card Image
on:
  push:
    tags:
      - 'v*'
jobs:
  build-image:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build image
        run: ./build-image.sh
      - name: Test image
        run: ./test-image.sh
      - name: Upload artifact
        uses: actions/upload-artifact@v3
```

**Distribution**:
1. **Download Portal**
   - Secure download area
   - Version selection
   - Checksums for verification
   - Installation instructions

2. **Imaging Tool**
   - Custom tool (or recommend Etcher)
   - Verifies image integrity
   - Writes to SD card
   - Validates write

**Benefits**:
- **Consistency**: Every device identical
- **Speed**: From 2 hours → 20 minutes (flash time)
- **Quality**: Pre-tested, known-good configuration
- **Scalability**: Produce 100s of devices easily
- **Version Control**: Track exact software versions

**Implementation Plan**:
1. Week 1-2: Research imaging tools, design pipeline
2. Week 3-4: Build initial image builder script
3. Week 5: Implement first-boot configuration
4. Week 6: CI/CD integration, automated testing

**Risks & Mitigation**:
- **Risk**: Image size too large for SD cards
  - **Mitigation**: Use compression, remove unnecessary packages
- **Risk**: First-boot script failures
  - **Mitigation**: Extensive testing, recovery mode
- **Risk**: Licensing issues with pre-installed software
  - **Mitigation**: Legal review, only include open-source components

---

#### [P0] #008: Configuration Web UI

**Effort**: L (5-6 weeks)
**Risk**: Low
**Dependencies**: #001
**Target Release**: v2.0

**Problem**: Post-setup configuration requires SSH and file editing
- Users want to change display settings, colors, timing
- Current: Edit JSON files via command line
- Blocks iterative refinement by customers

**Proposed Solution**:
Unified web-based configuration interface for all applications.

**Features**:

1. **Dashboard**
   - System status overview
   - Running applications
   - Resource usage (CPU, memory, disk)
   - Recent errors/warnings
   - Quick actions (restart, refresh, update)

2. **Club Profile Editor**
   - All club profile fields editable
   - Logo upload
   - Color picker
   - Preview before saving

3. **Application Configuration**
   - Booking Viewer settings (layout, colors, timing)
   - Noticeboard settings (scraper schedule, content rotation)
   - Boat Booking settings (if self-hosted)

4. **Credentials Management**
   - Change RevSport password
   - Test credentials
   - View credential metadata (last changed, expires)
   - Rotate credentials

5. **Network Configuration**
   - Change WiFi network
   - Configure static IP
   - Test connectivity

6. **System Management**
   - View logs
   - Restart services
   - Reboot device
   - Factory reset
   - Backup/restore configuration

7. **Updates**
   - Check for updates
   - View changelog
   - Apply updates
   - Rollback to previous version

**Technical Stack**:
- **Frontend**: React + TypeScript
- **UI Library**: Shadcn/UI or Material-UI
- **Backend**: Express API
- **Authentication**: Simple password (default: wizard-set password)
- **Port**: 8080 (non-standard to avoid conflicts)

**API Design**:
```typescript
// Configuration API
GET  /api/config/club-profile
PUT  /api/config/club-profile
GET  /api/config/applications
PUT  /api/config/applications/:app
POST /api/config/validate

// System API
GET  /api/system/status
GET  /api/system/logs
POST /api/system/restart
POST /api/system/reboot
GET  /api/system/updates
POST /api/system/update

// Credentials API
POST /api/credentials/test
PUT  /api/credentials/revsport
```

**Benefits**:
- **Self-Service**: Customers configure without support
- **Reduced Support**: 70% reduction in configuration support tickets
- **Experimentation**: Customers can try different settings easily
- **Validation**: Prevent invalid configurations
- **Observability**: See system status at a glance

**Implementation Plan**:
1. Week 1-2: Design UI/UX, create mockups
2. Week 3-4: Build API backend
3. Week 5-6: Build React frontend
4. Week 7: Integration testing, polish

---

### Release 3.0: Enterprise Management

#### [P0] #009: Remote Management Portal

**Effort**: XL (10-12 weeks)
**Risk**: High
**Dependencies**: #008
**Target Release**: v3.0

**Problem**: Can't manage 50+ devices efficiently
- No visibility into device status
- Can't troubleshoot remotely
- Must SSH to each device individually
- Can't push updates centrally

**Proposed Solution**:
Cloud-based management portal with device agent.

**Architecture**:
```
Cloud Portal (AWS/GCP) ←→ Device Agent (on each Pi) ←→ Local Services
```

**Cloud Portal Features**:

1. **Fleet Dashboard**
   - Map view of all devices
   - Status indicators (online/offline/error)
   - Key metrics (uptime, version, last check-in)
   - Filtering and search

2. **Device Management**
   - View device details
   - Remote configuration changes
   - View real-time logs
   - Restart services remotely
   - Force update

3. **Monitoring & Alerting**
   - Health checks (HTTP endpoints)
   - Resource monitoring (CPU, memory, disk, network)
   - Custom alerts (email, SMS, Slack)
   - Alert escalation
   - Incident tracking

4. **Update Management**
   - Push updates to specific devices/groups
   - Staged rollouts (10% → 50% → 100%)
   - Rollback capability
   - Update scheduling
   - Update success tracking

5. **Support Tools**
   - Remote log access
   - Remote shell (with permissions)
   - Configuration diff viewer
   - Diagnostic report generation
   - Support ticket integration

6. **Analytics**
   - Uptime statistics
   - Update adoption rate
   - Feature usage
   - Performance trends
   - Customer health scores

**Device Agent**:
```typescript
class DeviceAgent {
  // Heartbeat every 60 seconds
  async sendHeartbeat(): Promise<void>;

  // Report status
  async reportStatus(): Promise<DeviceStatus>;

  // Receive commands from portal
  async handleCommand(command: Command): Promise<CommandResult>;

  // Push logs
  async pushLogs(level: string): Promise<void>;

  // Apply configuration
  async applyConfig(config: Configuration): Promise<void>;

  // Update software
  async updateSoftware(version: string): Promise<UpdateResult>;
}
```

**Communication Protocol**:
- WebSocket for real-time commands
- HTTPS REST API for queries
- TLS encryption
- JWT authentication
- Device certificates for identity

**Security**:
- Mutual TLS authentication
- Device registration workflow
- Scoped permissions per device
- Audit logging of all remote actions
- Customer opt-in for remote access
- Data encryption at rest and in transit

**Benefits**:
- **Scalability**: Manage 100s of devices from one interface
- **Proactive Support**: Detect issues before customers notice
- **Faster Resolution**: Troubleshoot without customer involvement
- **Better Product**: Data-driven feature decisions
- **Cost Efficiency**: Reduce support staff needed

**Implementation Plan**:
1. Week 1-3: Design portal architecture, create mockups
2. Week 4-6: Build device agent, communication protocol
3. Week 7-9: Build cloud portal backend (AWS Lambda + RDS)
4. Week 10-12: Build portal frontend (React)
5. Week 13-14: Security review, penetration testing
6. Week 15-16: Beta testing with pilot customers

**Risks & Mitigation**:
- **Risk**: Privacy concerns about remote access
  - **Mitigation**: Opt-in, clear policies, audit logs, certifications
- **Risk**: Security vulnerabilities in device agent
  - **Mitigation**: Security review, penetration testing, bug bounty
- **Risk**: Cloud costs at scale
  - **Mitigation**: Efficient architecture, caching, cost monitoring
- **Risk**: Device offline, can't reach
  - **Mitigation**: Store commands, apply when device reconnects

---

#### [P0] #010: Automated Update System

**Effort**: L (4-6 weeks)
**Risk**: High
**Dependencies**: #009
**Target Release**: v3.0

**Problem**: Manual updates don't scale
- Security patches delayed
- Feature adoption slow
- Can't push critical fixes
- Customer effort required

**Proposed Solution**:
Automatic update system with rollback capability.

**Update Flow**:
```
Update Server → Device Checks for Updates → Download → Verify → Apply → Rollback if Failed
```

**Features**:

1. **Version Management**
   - Semantic versioning
   - Release channels (stable, beta, dev)
   - Version manifest with checksums
   - Incremental updates

2. **Update Strategy**
   ```typescript
   interface UpdateStrategy {
     channel: 'stable' | 'beta' | 'dev';
     autoUpdate: boolean;
     schedule?: CronExpression;    // e.g., "0 3 * * *" (3 AM daily)
     maintenanceWindow?: TimeRange;
     retryAttempts: number;
     rollbackOnFailure: boolean;
   }
   ```

3. **Staged Rollouts**
   - Update 10% of devices first
   - Monitor for 24 hours
   - Proceed to 50%, then 100%
   - Abort if error rate >5%

4. **Rollback Mechanism**
   - Keep previous version
   - Automatic rollback on critical failure
   - Manual rollback from portal
   - Rollback time <5 minutes

5. **Update Verification**
   - Health check after update
   - Functional tests
   - Rollback if verification fails

**Implementation**:

```typescript
class UpdateManager {
  // Check for updates
  async checkForUpdates(): Promise<UpdateInfo | null>;

  // Download update package
  async downloadUpdate(version: string): Promise<UpdatePackage>;

  // Verify package integrity
  async verifyUpdate(package: UpdatePackage): Promise<boolean>;

  // Apply update
  async applyUpdate(package: UpdatePackage): Promise<UpdateResult>;

  // Run post-update verification
  async verifyInstallation(): Promise<boolean>;

  // Rollback to previous version
  async rollback(): Promise<RollbackResult>;
}
```

**Update Package Format**:
```json
{
  "version": "3.0.1",
  "releaseDate": "2025-10-30T00:00:00Z",
  "channel": "stable",
  "components": [
    {
      "name": "booking-viewer",
      "version": "3.1.0",
      "checksum": "sha256:abc123...",
      "size": 5242880,
      "url": "https://updates.lmrc.io/v3.0.1/booking-viewer.tar.gz"
    }
  ],
  "migrations": [
    {
      "name": "migrate-config-v3",
      "script": "migrations/config-v3.sh"
    }
  ],
  "rollbackSupported": true,
  "criticalUpdate": false
}
```

**Benefits**:
- **Security**: Fast deployment of security patches
- **Features**: Faster feature adoption
- **Reliability**: Rollback prevents prolonged outages
- **Efficiency**: No manual intervention needed
- **Compliance**: Enforce minimum versions

**Implementation Plan**:
1. Week 1-2: Design update architecture, package format
2. Week 3-4: Implement update manager, download/verify
3. Week 5: Implement rollback mechanism
4. Week 6: Implement staged rollout logic
5. Week 7: Testing with various failure scenarios

**Risks & Mitigation**:
- **Risk**: Update breaks device
  - **Mitigation**: Automatic rollback, verification tests
- **Risk**: Network failure during update
  - **Mitigation**: Resume capability, retry logic
- **Risk**: Disk space issues
  - **Mitigation**: Check space before update, cleanup old versions

---

#### [P1] #011: Centralized Monitoring & Alerting

**Effort**: L (4-6 weeks)
**Risk**: Medium
**Dependencies**: #009
**Target Release**: v3.0

**Problem**: Reactive support model doesn't scale
- Don't know device is down until customer calls
- Can't proactively address issues
- No visibility into performance trends
- Miss subtle degradation

**Proposed Solution**:
Comprehensive monitoring with intelligent alerting.

**Monitoring Dimensions**:

1. **Infrastructure Metrics**
   - CPU usage, load average
   - Memory usage (total, available, cached)
   - Disk usage, I/O wait
   - Network throughput, packet loss
   - Temperature (critical for Raspberry Pi)
   - Uptime

2. **Application Metrics**
   - HTTP response times (p50, p95, p99)
   - Error rates (by type)
   - Request rates
   - Active connections
   - Cache hit rates
   - API call latency

3. **Business Metrics**
   - Display uptime (is content showing?)
   - Content freshness (last update timestamp)
   - Booking data staleness
   - Scraper success rate
   - User interactions (if tracked)

4. **Health Checks**
   - RevSport API connectivity
   - Database availability (if applicable)
   - Disk space >10% free
   - All services running
   - No critical errors in logs

**Alerting Rules**:

| Condition | Severity | Action |
|-----------|----------|--------|
| Device offline >10 min | Critical | SMS + email to support |
| CPU >90% for 5 min | Warning | Email to support |
| Memory >95% | Critical | Auto-restart service, alert |
| Disk >90% full | Warning | Email to customer + support |
| API errors >10% | Critical | Alert support immediately |
| Scraper failures >3 | Warning | Email to support |
| Temperature >75°C | Critical | Alert, recommend shutdown |
| No content updates >24h | Warning | Email to support |

**Alert Management**:
- Deduplication (don't send same alert repeatedly)
- Alert escalation (if unacknowledged)
- Scheduled maintenance windows (suppress alerts)
- Alert grouping (by device, by type)
- Integration with PagerDuty, Opsgenie, etc.

**Monitoring Stack**:

**Option A: Prometheus + Grafana** (Self-Hosted)
- Device agent exports Prometheus metrics
- Central Prometheus server scrapes all devices
- Grafana for visualization
- Alertmanager for alerts

**Option B: Cloud Monitoring** (Managed)
- AWS CloudWatch
- DataDog
- New Relic
- Lower operational burden, higher cost

**Implementation**:
```typescript
// Metrics exporter on device
class MetricsExporter {
  // Export system metrics
  exportSystemMetrics(): Metrics;

  // Export application metrics
  exportAppMetrics(app: string): Metrics;

  // Custom metrics
  recordMetric(name: string, value: number, labels?: Labels): void;
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const checks = await Promise.all([
    checkDiskSpace(),
    checkRevSportConnectivity(),
    checkServicesRunning(),
    checkContentFreshness()
  ]);

  const healthy = checks.every(c => c.healthy);
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    checks
  });
});
```

**Benefits**:
- **Proactive Support**: Fix issues before customer notices
- **SLA Tracking**: Measure and prove uptime
- **Capacity Planning**: Identify devices needing hardware upgrades
- **Trend Analysis**: Spot issues developing over time
- **Customer Trust**: Show commitment to reliability

**Implementation Plan**:
1. Week 1-2: Select monitoring stack, design architecture
2. Week 3-4: Implement metrics exporter on device agent
3. Week 5: Set up central monitoring server
4. Week 6: Configure alerting rules, integrations

---

### Release 4.0: Platform & Scale

#### [P1] #012: Multi-Tenant Cloud Architecture (Optional)

**Effort**: XL (12-16 weeks)
**Risk**: High
**Dependencies**: All previous items
**Target Release**: v4.0

**Problem**: Raspberry Pi hardware has limitations
- Clubs want access from anywhere
- Mobile access desired
- Shared hosting more cost-effective at scale
- Hardware support burden

**Proposed Solution**:
Offer optional cloud-hosted alternative to Raspberry Pi deployment.

**Hybrid Architecture**:
- **Option A**: Raspberry Pi (on-premises) → Current model
- **Option B**: Cloud SaaS (multi-tenant) → New offering
- **Option C**: Hybrid (Pi + Cloud sync) → Best of both

**Cloud Architecture**:
```
┌─────────────────────────────────────────────────────────────┐
│                    Cloud Platform (AWS)                      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   API        │  │  Background  │  │   Database   │     │
│  │   Gateway    │  │   Workers    │  │   (RDS)      │     │
│  │  (Lambda)    │  │  (Lambda)    │  │              │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         └──────────────────┴──────────────────┘             │
│                            │                                │
│         ┌──────────────────┴──────────────────┐            │
│         │                                       │            │
│  ┌──────▼──────┐  ┌────────────────┐  ┌───────▼──────┐   │
│  │  S3 Storage │  │  CloudFront    │  │   ElastiCache│   │
│  │  (Static)   │  │  (CDN)         │  │   (Redis)    │   │
│  └─────────────┘  └────────────────┘  └──────────────┘   │
└─────────────────────────────────────────────────────────────┘
                           │
                ┌──────────┴──────────┬───────────┐
                │                     │           │
          ┌─────▼─────┐        ┌─────▼─────┐ ┌──▼────┐
          │  Club A   │        │  Club B   │ │Club C │
          │  Browser  │        │  Browser  │ │Browser│
          └───────────┘        └───────────┘ └───────┘
```

**Multi-Tenancy Design**:

1. **Data Isolation**
   ```typescript
   interface TenantContext {
     tenantId: string;
     clubProfile: ClubProfile;
     permissions: Permission[];
     subscription: SubscriptionTier;
   }

   // All queries scoped by tenant
   SELECT * FROM bookings WHERE tenant_id = ?
   ```

2. **Resource Quotas**
   ```typescript
   interface SubscriptionTier {
     name: 'basic' | 'pro' | 'enterprise';
     limits: {
       boats: number;
       members: number;
       apiCallsPerMonth: number;
       storageGB: number;
       displays: number;
     };
   }
   ```

3. **Custom Domains**
   - clubs.lmrc.io/sydney-rowing-club
   - Or custom: bookings.sydneyrowingclub.com

**Benefits**:
- **Accessibility**: Access from anywhere, any device
- **Scalability**: Serve 1000s of clubs without hardware logistics
- **Maintenance**: No hardware support burden
- **Revenue**: Subscription model, predictable recurring revenue
- **Features**: Can offer advanced features (analytics, integrations)

**Challenges**:
- **Complexity**: Significantly more complex than Pi deployment
- **Cost**: Cloud infrastructure costs
- **RevSport Integration**: May face rate limiting with centralized scraping
- **Data Sovereignty**: Some clubs may require on-premises
- **Initial Investment**: Large engineering effort

**Implementation Plan**:
1. Month 1-2: Architecture design, tech stack selection
2. Month 3-4: Build core multi-tenant platform
3. Month 5-6: Migrate applications to cloud architecture
4. Month 7-8: Authentication, subscription management
5. Month 9-10: Testing, security review
6. Month 11-12: Beta launch, customer onboarding

**Recommendation**:
Only pursue if:
- 50+ clubs on Raspberry Pi model first (prove demand)
- Revenue projections justify investment
- Hardware support becomes unsustainable
- Customer demand for cloud option strong

---

#### [P2] #013: Plugin/Extension System

**Effort**: L (6-8 weeks)
**Risk**: Medium
**Dependencies**: #001, #008
**Target Release**: v4.0

**Problem**: Customers want custom features
- Different clubs have unique needs
- Can't build everything for everyone
- Customization creates support burden
- Need extensibility without forking

**Proposed Solution**:
Plugin system for custom extensions.

**Plugin Architecture**:
```typescript
interface Plugin {
  id: string;
  name: string;
  version: string;
  author: string;

  // Lifecycle hooks
  onLoad?(context: PluginContext): Promise<void>;
  onUnload?(): Promise<void>;

  // Extension points
  registerRoutes?(router: Router): void;
  registerUIComponents?(registry: ComponentRegistry): void;
  registerConfigSchema?(schema: Schema): void;

  // Data transformers
  transformBookingData?(data: BookingData): BookingData;
  transformDisplayData?(data: DisplayData): DisplayData;
}
```

**Example Plugins**:

1. **Weather Integration**
   - Adds weather widget to Noticeboard
   - Configuration: API key, location
   - Installation: Drop plugin folder, enable in UI

2. **Custom Branding**
   - Adds sponsor logos
   - Custom CSS themes
   - Additional branding options

3. **Analytics**
   - Track boat utilization
   - Generate reports
   - Export data

4. **Notifications**
   - Email/SMS notifications for bookings
   - Reminders
   - Cancellation alerts

**Plugin Marketplace**:
- Browse available plugins
- One-click installation
- Ratings and reviews
- Version compatibility checking
- Automatic updates

**Security**:
- Plugins run in sandbox
- Permission system (what API access needed)
- Code signing for verified plugins
- Security review for official plugins

**Benefits**:
- **Flexibility**: Customers can customize without forking
- **Ecosystem**: Third-party developers can contribute
- **Revenue**: Potential marketplace fees
- **Maintenance**: Community maintains plugins
- **Innovation**: Faster feature development

**Implementation Plan**:
1. Week 1-3: Design plugin system architecture
2. Week 4-6: Implement plugin loader, sandbox
3. Week 7-8: Build plugin marketplace
4. Week 9-12: Develop 3-5 example plugins

---

### Near-Term: Current Deployment Enhancements

These items address immediate needs for the current LMRC single-club deployment and do not depend on the multi-club architecture work above.

#### [P2] #014: Cloud-Hosted Booking Board (Remote Access)

**Effort**: S (1-2 weeks)
**Risk**: Low
**Dependencies**: None (uses existing codebase as-is)
**Target Release**: Pre-v1.5 (can be done independently)

**Problem**: The booking board is only accessible locally at the boatshed on the Raspberry Pi. The Pi is powered down when the shed is not in use, so members cannot check boat availability remotely. While the Pi is reachable via Tailscale at `100.101.107.30:3000`, this requires the device to be powered on.

**Proposed Solution**:
Deploy the existing Express application to **Render** (free tier) as a read-only cloud instance at `bookings.lakemacrowing.au`. Both the Pi (local boatshed display) and cloud (remote member access) deployments coexist independently.

**Architecture**:
```
Club Members (browser)
    │
    v
bookings.lakemacrowing.au (CNAME → Render)
    │
    v
Render Free Tier (Express, US-Oregon)
    ├─ Static: index.html, CSS, JS
    ├─ GET /api/v1/bookings   → in-memory cache (10 min TTL)
    ├─ GET /api/v1/config     → club config from env vars
    ├─ GET /api/v1/health     → pinged by UptimeRobot
    └─ POST endpoints         → disabled (read-only mode)
    │
    │ (on cache miss, every ~10 min)
    v
RevSport API (lakemacquarierowingclub.org.au)

UptimeRobot (free) → pings /health every 5 min (prevents spin-down)
```

**Platform Decision: Render Free Tier**
- Deploys directly from GitHub (auto-deploy on push to main)
- 750 hours/month free (sufficient for always-on with keep-alive)
- Built-in SSL and custom domain support
- Node.js buildpack auto-detects package.json
- UptimeRobot (free) pings health endpoint every 5 minutes to prevent spin-down

**Alternatives Evaluated**:
| Platform | Verdict | Reason |
|----------|---------|--------|
| Fly.io | Eliminated | No real free tier; requires credit card; usage-based billing risk |
| Koyeb | Not recommended | No Australian region (high latency); scales to zero after 1 hour |
| Netlify Functions | Not feasible | 10-second timeout on free tier; RevSport scraping takes 10-20+ seconds |
| GitHub Actions cron | Over budget | Every 15 min = ~4,300 runs/month; exceeds 2,000 min/month free tier |

**Code Changes Required**:

1. **Read-only guard middleware** (`src/server/routes/api.ts`)
   - Add `READONLY_MODE` env var check
   - Return 403 for POST endpoints: `/cache/clear`, `/config/tv-display`, `/config/tv-display/reset`

2. **Disable /config page** (`src/server/app.ts`)
   - Skip `/config` route when `READONLY_MODE=true`, redirect to `/`

3. **Handle ephemeral filesystem** (`src/services/tvDisplayConfigService.ts`)
   - In read-only mode, always return `DEFAULT_TV_DISPLAY_CONFIG`
   - Skip filesystem reads/writes (Render has ephemeral disk)

4. **Enable HTTPS upgrade in production** (`src/server/app.ts`)
   - Change `upgradeInsecureRequests` from `null` to `[]` when `NODE_ENV=production`

5. **Startup cache warming** (`src/server/index.ts`)
   - Trigger background data fetch on startup so first user request is served from cache

6. **Render blueprint** (new file: `render.yaml`)
   - Defines web service config: Node runtime, build/start commands, env vars, free plan

**DNS Configuration**:
- Add CNAME record in CrazyDomains (or Netlify DNS if that manages the zone):
  `bookings` → `lmrc-booking-viewer.onrender.com`
- Render auto-provisions SSL certificate for the custom domain

**Trade-offs**:
- US-Oregon region (free tier limitation) adds ~150-200ms latency for Australian users on cached responses
- First request after cache expiry takes 15-30s (RevSport scraping from US-based server)
- If Render removes free tier in future, migrate to Railway ($5/month) or a VPS

**Relationship to Multi-Club Roadmap**: This is a tactical solution for LMRC's immediate need. The v3.0 Remote Management Portal (#009) would supersede this with a proper cloud architecture supporting multiple clubs.

---

## Dependencies and Critical Path

### Dependency Graph

```
#001 Config Library ─────────┬──────────────────────────────────┐
         │                    │                                  │
         ├──> #002 Credentials Vault                            │
         │           │                                           │
         ├──> #004 Club Abstraction                             │
         │           │                                           │
         └──────────┬┴────> #003 Auth Library                   │
                    │              │                             │
                    └──────────────┴─> #005 Deployment Scripts  │
                                       │                         │
                                       ├──> v1.5 Release ────────┘
                                       │
                                       │
#006 Setup Wizard ──────────────────────┤
         │                              │
         ├──> #007 SD Card Builder      │
         │                              │
         └──────────> #008 Config UI ───┴──> v2.0 Release
                              │
                              │
                        #009 Remote Portal
                              │
                              ├──> #010 Auto Updates
                              │
                              └──> #011 Monitoring ──> v3.0 Release
                                         │
                                         │
                              #012 Cloud Platform ───┐
                                         │           │
                              #013 Plugin System ────┴──> v4.0 Release
```

### Critical Path (Longest Dependency Chain)

1. **#001** Config Library (4-6 weeks) → **Blocks everything**
2. **#002** Credentials Vault (3-4 weeks) → **Blocks #006**
3. **#006** Setup Wizard (8-10 weeks) → **Longest single item**
4. **#009** Remote Portal (10-12 weeks) → **v3.0 bottleneck**
5. **#012** Cloud Platform (12-16 weeks) → **v4.0 bottleneck**

**Total Critical Path**: ~44-58 weeks (11-14.5 months)

### Parallelization Opportunities

**During v1.5**:
- #001, #004 can start immediately
- #002, #003, #005 can run in parallel after #001

**During v2.0**:
- #006, #007, #008 can partially overlap
- #008 can start while #006 is in progress

**During v3.0**:
- #010, #011 can run in parallel with #009
- Test #010, #011 against #009 as it develops

---

## Success Metrics

### Release 1.5 Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Pilot Deployments | 3-5 clubs | Count |
| Setup Time per Club | <4 hours | Timer |
| Configuration Changes Required | <5 per club | Count |
| Codebase Changes for New Club | 0 lines | LOC |
| Shared Code Adoption | >60% | Percentage |
| Security Audit Score | Pass | External audit |

### Release 2.0 Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Clubs Deployed | 10+ | Count |
| Setup Time (Average) | <20 minutes | Timer |
| Support Tickets (Setup) | <0.5 per club | Count |
| Wizard Completion Rate | >95% | Analytics |
| SSH Access Required | 0% | Count |
| Customer Satisfaction (Setup) | >4.5/5 | Survey |

### Release 3.0 Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Clubs Managed | 50+ | Count |
| Support Staff Required | <2 FTE | Headcount |
| Mean Time to Resolution | <1 hour | Average |
| System Uptime (Monitored) | >99.5% | Monitoring |
| Update Adoption (30 days) | >90% | Analytics |
| Proactive Issue Detection | >70% | Before customer reports |

### Release 4.0 Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Total Clubs | 200+ | Count |
| Annual Retention | >85% | Churn rate |
| CAC:LTV Ratio | <10% | Financial |
| Profitable Unit Economics | Yes | Financial |
| NPS Score | >50 | Survey |
| Active Plugins | >10 | Marketplace |

---

## Risk Assessment

### High-Risk Items

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Setup Wizard Complexity** | High - Blocks non-technical users | Medium | Extensive UX testing, pilot program |
| **Credential Vault Security** | Critical - Data breach | Low | Security audit, penetration testing |
| **Remote Portal Security** | Critical - Fleet compromise | Low | Mutual TLS, audit logging, opt-in |
| **Cloud Platform Costs** | High - Profitability | Medium | Cost modeling, efficient architecture |
| **RevSport API Changes** | High - System breaks | Medium | Version detection, graceful degradation |
| **Hardware Supply Chain** | Medium - Can't deliver | Medium | Multiple suppliers, buffer stock |

### Medium-Risk Items

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Plugin Security** | Medium - Sandbox escape | Low | Code signing, security review |
| **SD Card Reliability** | Medium - Device failure | Medium | High-quality cards, warranty |
| **WiFi Configuration Failures** | Medium - Setup blocked | Medium | Fallback to Ethernet, support docs |
| **Update Failures** | Medium - Device broken | Low | Rollback capability, testing |

---

## Effort Summary

### Total Effort by Release

| Release | Total Effort | Duration | Team Size Estimate |
|---------|--------------|----------|-------------------|
| **v1.5** | 14-20 weeks | 3-4 months | 2-3 engineers |
| **v2.0** | 18-24 weeks | 6-8 months | 2-3 engineers |
| **v3.0** | 20-26 weeks | 6-8 months | 3-4 engineers |
| **v4.0** | 26-36 weeks | 6-8 months | 3-5 engineers |

**Total**: 78-106 weeks (18-24 months) with 2-5 engineers

### Total Effort by Priority

- **P0 (Must Have)**: 62-84 weeks
- **P1 (Should Have)**: 12-16 weeks
- **P2 (Nice to Have)**: 6-8 weeks

---

## Recommendations for Product Management

### Immediate Actions (Next 30 Days)

1. **Validate Market Demand**
   - Survey 20-30 rowing clubs about interest
   - Identify 5 clubs willing to be pilot customers
   - Understand willingness to pay

2. **Secure Pilot Commitments**
   - 3-5 clubs for v1.5 pilot (willing to accept technical setup)
   - Offer discounted pricing for feedback
   - Establish success criteria with pilots

3. **Resource Planning**
   - Hire/allocate 2 senior engineers for v1.5
   - Budget for infrastructure (cloud hosting, monitoring tools)
   - Plan for part-time DevOps support

4. **Legal & Compliance**
   - Review privacy requirements (GDPR, etc.)
   - Draft terms of service, privacy policy
   - Intellectual property review

### Phasing Strategy

**Phase 1 (v1.5)**: Prove the Model
- Goal: Validate that the solution works for other clubs
- Investment: Low (2-3 engineers, 3-4 months)
- Go/No-Go Decision: After 3 pilot deployments

**Phase 2 (v2.0)**: Scale Customer Acquisition
- Goal: Onboard 10-20 clubs efficiently
- Investment: Medium (2-3 engineers, 6-8 months)
- Go/No-Go Decision: After 10 deployments with <0.5 support tickets each

**Phase 3 (v3.0)**: Operational Efficiency
- Goal: Manage 50+ clubs profitably
- Investment: Medium-High (3-4 engineers, 6-8 months)
- Go/No-Go Decision: Support costs <20% of revenue

**Phase 4 (v4.0)**: Platform Play
- Goal: 200+ clubs, ecosystem
- Investment: High (3-5 engineers, 6-8 months)
- Decision: Only if v3.0 demonstrates strong unit economics

### Go-to-Market Considerations

**Pricing Model** (TBD based on market research):
- Hardware: $200-400 per Pi (one-time)
- Software License: $500-1500/year per club (subscription)
- Setup Service: $500 (optional, for v1.5)
- Support Tiers: Basic (included), Premium ($100/month)

**Target Customer Segments**:
1. **Primary**: Rowing clubs using RevSport (500+ globally)
2. **Secondary**: Other rowing clubs (requires RevSport integration)
3. **Tertiary**: Other sports clubs (requires additional work)

**Competitive Advantages**:
1. Turnkey solution (hardware + software)
2. Native RevSport integration
3. Rowing-specific features
4. Affordable (Raspberry Pi vs expensive displays)
5. Self-hosted (data privacy)

### Key Decision Points

| Milestone | Decision | Criteria |
|-----------|----------|----------|
| After v1.5 Pilot | Continue to v2.0? | 3+ successful pilots, positive feedback |
| After v2.0 Launch | Scale go-to-market? | 10+ clubs, <0.5 support tickets per club |
| After v3.0 Launch | Build v4.0 cloud? | 50+ clubs, profitable unit economics |
| Ongoing | Build feature X? | Customer demand >50%, reasonable effort |

---

## Appendix A: Existing Documentation

Reference documents already in the solution:

- [PRODUCT_ROADMAP.md](PRODUCT_ROADMAP.md) - Vision and market strategy
- [ARCHITECTURE.md](ARCHITECTURE.md) - Current system architecture
- [README.md](README.md) - Solution overview
- [lmrc-booking-system/SESSION_NOTES.md](lmrc-booking-system/SESSION_NOTES.md) - Booking Viewer technical details
- [lmrc-booking-system/CONFIG_PROPOSAL.md](lmrc-booking-system/CONFIG_PROPOSAL.md) - Configuration UI proposal
- [lmrc-pi-deployment/PROJECT_CONTEXT.md](lmrc-pi-deployment/PROJECT_CONTEXT.md) - Deployment system details

---

## Appendix B: Technology Choices Rationale

### Why Node.js/TypeScript?
- Already used across all projects
- Large ecosystem for integrations
- Good performance for I/O-heavy workloads
- Strong typing with TypeScript reduces bugs

### Why Raspberry Pi?
- Affordable ($50-100 per device)
- Sufficient performance for workload
- Standard Linux, easy to develop for
- Large community, good support

### Why Systemd (not Docker)?
- Native to Raspberry Pi OS
- Lower resource overhead
- Simpler for non-technical users
- Sufficient for single-device deployment

### Why Captive Portal Setup?
- Works on all devices (phone, laptop, tablet)
- Familiar UX (like WiFi routers)
- No app installation required
- Discoverable (device creates WiFi network)

### Why Remote Portal (not SSH)?
- Non-technical users can't use SSH
- Enables proactive support
- Better security (controlled access)
- Richer UI for management

---

## Document History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-10-30 | Initial creation - comprehensive architectural roadmap |
| 1.1 | 2026-01-27 | Added #014: Cloud-hosted booking board (Render free tier) for remote member access |

---

**END OF DOCUMENT**
