/**
 * TV Display Controller - SaaS Version
 * Fetches from generic /api/v1/boats and /api/v1/bookings endpoints
 * Transforms data client-side for the display renderer
 */

// Detect and apply display mode from query parameter
function applyDisplayMode() {
  const params = new URLSearchParams(window.location.search);
  const mode = params.get('mode');

  if (mode === 'tv' || mode === 'desktop' || mode === 'mobile') {
    document.body.classList.add(`mode-${mode}`);
    console.log(`[TV Display] Display mode forced to: ${mode}`);
  }
}

// Apply mode immediately on script load
applyDisplayMode();

class TVDisplayController {
  // Map API error codes to user-friendly messages
  // Technical details are logged to console, not shown to users
  static ERROR_MESSAGES = {
    'VALIDATION_ERROR': 'Unable to load booking data. Please refresh the page.',
    'NOT_FOUND': 'Booking data is temporarily unavailable.',
    'RATE_LIMITED': 'Too many requests. Please wait a moment.',
    'UPSTREAM_ERROR': 'The booking system is currently unavailable.',
    'UNAUTHORIZED': 'Access denied. Please contact support.',
    'FORBIDDEN': 'Access denied. Please contact support.',
    'INTERNAL_ERROR': 'A server error occurred. Please try again.',
    'NETWORK_ERROR': 'Unable to connect to the server. Please check your connection.',
    'default': 'Something went wrong. Please try again.'
  };

  constructor() {
    this.clockInterval = 1000; // 1 second
    this.retryDelay = 30000; // 30 seconds on error
    this.daysToDisplay = 7;
    this.refreshInterval = 300000; // 5 minutes default

    // Hardcoded session times for LMRC
    this.sessions = {
      morning1: { start: '06:30', end: '07:30' },
      morning2: { start: '07:30', end: '08:30' }
    };

    this.elements = {
      loadingScreen: document.getElementById('loadingScreen'),
      errorScreen: document.getElementById('errorScreen'),
      errorMessage: document.getElementById('errorMessage'),
      mainView: document.getElementById('mainView'),
      clubBoatsList: document.getElementById('clubBoatsList'),
      raceBoatsList: document.getElementById('raceBoatsList'),
      tinniesList: document.getElementById('tinniesList'),
      tinniesSection: document.getElementById('tinniesSection'),
      clubDayHeaders: document.getElementById('clubDayHeaders'),
      raceDayHeaders: document.getElementById('raceDayHeaders'),
      tinniesDayHeaders: document.getElementById('tinniesDayHeaders'),
      todayDateFooter: document.getElementById('todayDateFooter'),
      lastUpdated: document.getElementById('lastUpdated'),
      // Mobile portrait view elements
      mobilePortraitView: document.getElementById('mobilePortraitView'),
      dayNavTabs: document.getElementById('dayNavTabs'),
      dayNavPrev: document.getElementById('dayNavPrev'),
      dayNavNext: document.getElementById('dayNavNext'),
      mobileCardsContainer: document.getElementById('mobileCardsContainer'),
      // Font size controls
      fontSizeControls: document.getElementById('fontSizeControls'),
      fontDecrease: document.getElementById('fontDecrease'),
      fontIncrease: document.getElementById('fontIncrease'),
      fontReset: document.getElementById('fontReset'),
      fontSizePercent: document.getElementById('fontSizePercent'),
      // Mobile font size elements
      fontSizeFab: document.getElementById('fontSizeFab'),
      fontSizeSheet: document.getElementById('fontSizeSheet'),
      fontSizeSheetBackdrop: document.getElementById('fontSizeSheetBackdrop'),
      fontDecreaseSheet: document.getElementById('fontDecreaseSheet'),
      fontIncreaseSheet: document.getElementById('fontIncreaseSheet'),
      fontResetSheet: document.getElementById('fontResetSheet'),
      fontSizePercentSheet: document.getElementById('fontSizePercentSheet'),
    };

    this.bookingData = null;

    // Font size settings - separate scales for portrait and landscape views
    this.fontScales = {
      portrait: 1.0,
      landscape: 1.0,
    };
    this.fontScaleMin = 0.8;
    this.fontScaleMax = 1.5;
    this.fontScaleStep = 0.1;
    this.refreshTimer = null;
    this.isInitialLoad = true;
    this.selectedDayIndex = 0; // For mobile portrait view: 0 = today
    this.collapsedSections = new Set(); // Track collapsed sections in mobile view
  }

  /**
   * Initialize and start the display
   */
  async init() {
    console.log('[TV Display] Initializing SaaS version...');

    // Apply TV mode class to body if in TV mode (enables TV-specific CSS)
    if (this.isTvMode()) {
      document.body.classList.add('tv-mode');
      console.log('[TV Display] TV mode enabled - fixed wide layout, no controls');
    }

    // Apply CSS variables for layout
    document.documentElement.style.setProperty('--days-to-display', this.daysToDisplay);

    // Setup mobile view event listeners (interactive mode only)
    if (!this.isTvMode()) {
      this.setupMobileEventListeners();
    }

    // Setup desktop tooltip
    this.setupTooltip();

    // Setup font size controls (interactive mode only)
    this.setupFontSizeControls();

    // Listen for orientation changes (mobile device rotation)
    window.addEventListener('orientationchange', () => {
      console.log('[TV Display] Orientation changed, re-rendering...');
      setTimeout(() => {
        this.onViewModeChanged(); // Apply correct font scale for new orientation
        this.render();
      }, 350); // Longer delay for viewport dimensions to fully settle on mobile
    });

    // Listen for resize (for desktop browser testing and responsive layout)
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        this.onViewModeChanged(); // Apply correct font scale for new view
        this.render();
      }, 150);
    });

    // Start clock immediately
    this.updateClock();
    setInterval(() => this.updateClock(), this.clockInterval);

    // Load initial data
    await this.loadData();

    // Schedule periodic refresh
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
    }
    this.refreshTimer = setInterval(() => {
      console.log('[TV Display] Auto-refresh triggered');
      this.loadData();
    }, this.refreshInterval);
  }

  /**
   * Parse an API error response into a structured error object.
   * Returns { code, message, requestId } for logging and display.
   */
  async parseApiError(response) {
    const errorInfo = {
      code: 'UNKNOWN_ERROR',
      message: null,
      requestId: null,
      httpStatus: response.status
    };

    try {
      const errorBody = await response.json();
      if (errorBody.error) {
        errorInfo.code = errorBody.error.code || 'UNKNOWN_ERROR';
        errorInfo.message = errorBody.error.message || null;
        errorInfo.requestId = errorBody.error.requestId || null;
      }
    } catch {
      // Response body wasn't JSON, use HTTP status to infer error code
      if (response.status === 400) errorInfo.code = 'VALIDATION_ERROR';
      else if (response.status === 401) errorInfo.code = 'UNAUTHORIZED';
      else if (response.status === 403) errorInfo.code = 'FORBIDDEN';
      else if (response.status === 404) errorInfo.code = 'NOT_FOUND';
      else if (response.status === 429) errorInfo.code = 'RATE_LIMITED';
      else if (response.status >= 500) errorInfo.code = 'INTERNAL_ERROR';
    }

    return errorInfo;
  }

  /**
   * Get user-friendly error message from error code.
   * Optionally appends a short reference ID for support.
   */
  getUserFriendlyError(errorInfo) {
    const message = TVDisplayController.ERROR_MESSAGES[errorInfo.code]
      || TVDisplayController.ERROR_MESSAGES.default;

    // Append short reference ID if available (first 8 chars of requestId)
    if (errorInfo.requestId) {
      return `${message} (Ref: ${errorInfo.requestId.slice(0, 8)})`;
    }
    return message;
  }

  /**
   * Load data from the generic API endpoints
   * Fetches boats and bookings separately, then merges client-side
   */
  async loadData() {
    try {
      if (this.isInitialLoad) {
        console.log('[TV Display] Initial load - showing loading screen');
      } else {
        console.log('[TV Display] Background refresh - fetching new data silently...');
      }

      // Calculate date range (today + 7 days)
      const today = new Date();
      const endDate = new Date(today);
      endDate.setDate(today.getDate() + this.daysToDisplay);

      const fromDate = this.formatDate(today);
      const toDate = this.formatDate(endDate);

      // Fetch boats and bookings in parallel
      let boatsResponse, bookingsResponse;
      try {
        [boatsResponse, bookingsResponse] = await Promise.all([
          fetch('/api/v1/boats?limit=200'),
          fetch(`/api/v1/bookings?from=${fromDate}&to=${toDate}&limit=500`)
        ]);
      } catch (networkError) {
        // Network-level failure (no connection, DNS failure, etc.)
        console.error('[TV Display] Network error:', networkError.message);
        throw {
          code: 'NETWORK_ERROR',
          message: networkError.message,
          requestId: null,
          isNetworkError: true
        };
      }

      // Check for HTTP errors and parse error responses
      if (!boatsResponse.ok) {
        const errorInfo = await this.parseApiError(boatsResponse);
        console.error('[TV Display] Boats API error:', {
          code: errorInfo.code,
          httpStatus: errorInfo.httpStatus,
          requestId: errorInfo.requestId,
          technicalMessage: errorInfo.message
        });
        throw errorInfo;
      }

      if (!bookingsResponse.ok) {
        const errorInfo = await this.parseApiError(bookingsResponse);
        console.error('[TV Display] Bookings API error:', {
          code: errorInfo.code,
          httpStatus: errorInfo.httpStatus,
          requestId: errorInfo.requestId,
          technicalMessage: errorInfo.message
        });
        throw errorInfo;
      }

      const boatsResult = await boatsResponse.json();
      const bookingsResult = await bookingsResponse.json();

      // Check for API-level errors (success: false in response body)
      if (!boatsResult.success) {
        const errorInfo = {
          code: boatsResult.error?.code || 'UNKNOWN_ERROR',
          message: boatsResult.error?.message,
          requestId: boatsResult.error?.requestId
        };
        console.error('[TV Display] Boats API returned error:', errorInfo);
        throw errorInfo;
      }

      if (!bookingsResult.success) {
        const errorInfo = {
          code: bookingsResult.error?.code || 'UNKNOWN_ERROR',
          message: bookingsResult.error?.message,
          requestId: bookingsResult.error?.requestId
        };
        console.error('[TV Display] Bookings API returned error:', errorInfo);
        throw errorInfo;
      }

      // Transform data into the format the renderer expects
      this.bookingData = this.transformData(boatsResult.data, bookingsResult.data);

      console.log('[TV Display] Data loaded successfully', {
        totalBoats: this.bookingData.metadata.totalBoats,
        totalBookings: this.bookingData.metadata.totalBookings,
        backgroundUpdate: !this.isInitialLoad
      });

      // Render the display
      this.render();

      // Only show view transition on initial load
      if (this.isInitialLoad) {
        this.showView('main');
        this.isInitialLoad = false;
        console.log('[TV Display] Initial load complete - display is now visible');
      }

      // Update timestamp
      this.updateLastUpdated();

    } catch (errorInfo) {
      // errorInfo is either our structured error object or a native Error
      const structuredError = errorInfo.code ? errorInfo : {
        code: 'UNKNOWN_ERROR',
        message: errorInfo.message || 'Unknown error',
        requestId: null
      };

      // Log technical details for debugging (visible in dev tools)
      console.error('[TV Display] Error loading data:', {
        code: structuredError.code,
        requestId: structuredError.requestId,
        technicalMessage: structuredError.message
      });

      if (this.isInitialLoad) {
        // Show user-friendly error message
        const userMessage = this.getUserFriendlyError(structuredError);
        this.showError(userMessage);
      } else {
        console.warn('[TV Display] Background refresh failed - keeping existing data visible');
      }

      // Retry after delay
      setTimeout(() => this.loadData(), this.retryDelay);
    }
  }

  /**
   * Transform API data into the nested format expected by the renderer
   *
   * Input (boats): [{ id, sourceId, name, boatType, boatCategory, classification, weight, isDamaged, metadata }]
   * Input (bookings): [{ boatId, date, bookings: { startTime, endTime, memberName } }]
   *
   * Output: { boats: [{ id, displayName, type, bookings: [...] }], metadata: {...} }
   */
  transformData(boats, bookings) {
    // Build a map of boatId -> boat with empty bookings array
    const boatMap = new Map();

    for (const boat of boats) {
      // Extract nickname from metadata if available
      const nickname = boat.metadata?.nickname || null;
      const sweepCapable = boat.metadata?.sweepCapable || false;

      boatMap.set(boat.id, {
        id: boat.id,
        sourceId: boat.sourceId,
        displayName: boat.name,
        nickname: nickname,
        type: boat.boatType || 'Unknown',
        classification: boat.classification,
        category: boat.boatCategory || 'race',
        weight: boat.weight,
        sweepCapable: sweepCapable,
        isDamaged: boat.isDamaged || false,
        bookings: []
      });
    }

    // Add bookings to their respective boats
    let totalBookings = 0;
    for (const booking of bookings) {
      const boat = boatMap.get(booking.boatId);
      if (boat && booking.bookings) {
        // The bookings field contains the actual booking data
        const bookingData = booking.bookings;
        boat.bookings.push({
          date: booking.date,
          startTime: bookingData.startTime,
          endTime: bookingData.endTime,
          memberName: bookingData.memberName
        });
        totalBookings++;
      }
    }

    // Convert map to array
    const boatsArray = Array.from(boatMap.values());

    return {
      boats: boatsArray,
      metadata: {
        generatedAt: new Date().toISOString(),
        totalBoats: boatsArray.length,
        totalBookings: totalBookings
      }
    };
  }

  /**
   * Render the boat display (grid or mobile portrait depending on viewport)
   */
  render() {
    if (!this.bookingData) return;

    // Check if we're in mobile portrait mode
    if (this.isMobilePortrait()) {
      console.log('[TV Display] Rendering mobile portrait view');
      this.renderMobileView();
      return;
    }

    // Generate day headers for all columns
    this.renderDayHeaders();

    // Split boats into Club, Race, and Tinnies
    const { clubBoats, raceBoats, tinnies } = this.splitBoatsByClassification();

    console.log('[TV Display] Rendering boats:', {
      club: clubBoats.length,
      race: raceBoats.length,
      tinnies: tinnies.length,
      daysToDisplay: this.daysToDisplay
    });

    // Render club boats (left column)
    this.elements.clubBoatsList.innerHTML = '';
    let prevClubType = null;
    clubBoats.forEach(boat => {
      const entry = this.createBoatEntry(boat, prevClubType);
      this.elements.clubBoatsList.appendChild(entry);
      prevClubType = boat.type;
    });

    // Render race boats (right column, top section)
    this.elements.raceBoatsList.innerHTML = '';
    let prevRaceType = null;
    raceBoats.forEach(boat => {
      const entry = this.createBoatEntry(boat, prevRaceType);
      this.elements.raceBoatsList.appendChild(entry);
      prevRaceType = boat.type;
    });

    // Render tinnies (right column, bottom section)
    if (this.elements.tinniesList) {
      this.elements.tinniesList.innerHTML = '';
      tinnies.forEach(boat => {
        const entry = this.createBoatEntry(boat, null, true);
        this.elements.tinniesList.appendChild(entry);
      });

      // Show/hide tinnies section based on whether there are any
      if (this.elements.tinniesSection) {
        this.elements.tinniesSection.style.display = tinnies.length > 0 ? '' : 'none';
      }
    }
  }

  /**
   * Render day headers for multi-day view
   */
  renderDayHeaders() {
    const headers = this.generateDayHeaders();

    // Render for club column
    this.elements.clubDayHeaders.innerHTML = '';
    headers.forEach(header => {
      this.elements.clubDayHeaders.appendChild(header.cloneNode(true));
    });

    // Render for race column
    this.elements.raceDayHeaders.innerHTML = '';
    headers.forEach(header => {
      this.elements.raceDayHeaders.appendChild(header.cloneNode(true));
    });

    // Render for tinnies section
    if (this.elements.tinniesDayHeaders) {
      this.elements.tinniesDayHeaders.innerHTML = '';
      headers.forEach(header => {
        this.elements.tinniesDayHeaders.appendChild(header.cloneNode(true));
      });
    }
  }

  /**
   * Generate day header elements
   */
  generateDayHeaders() {
    const headers = [];

    // Add spacer for boat name column
    const boatSpacer = document.createElement('div');
    boatSpacer.className = 'day-header-spacer';
    headers.push(boatSpacer);

    // Add headers for each day
    const today = new Date();
    for (let i = 0; i < this.daysToDisplay; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const header = document.createElement('div');
      header.className = 'day-header';

      if (i === 0) {
        header.textContent = 'TODAY';
      } else {
        // Format: "WED 28"
        const dayName = date.toLocaleDateString('en-AU', { weekday: 'short' }).toUpperCase();
        const dayNum = date.getDate();
        header.textContent = `${dayName} ${dayNum}`;
      }

      headers.push(header);
    }

    return headers;
  }

  /**
   * Split boats by classification (Club vs Race) and category (Rowing vs Tinnie)
   */
  splitBoatsByClassification() {
    const clubBoats = [];
    const raceBoats = [];
    const tinnies = [];

    this.bookingData.boats.forEach(boat => {
      // Filter out boats with Unknown type (unless they're tinnies)
      if (boat.type === 'Unknown' && boat.category !== 'tinnie') {
        return;
      }

      // Tinnies go to their own section
      if (boat.category === 'tinnie') {
        tinnies.push(boat);
        return;
      }

      // Race boats: classification = 'R' (Racer)
      // Club boats: classification = 'T' (Training) or 'RT'
      if (boat.classification === 'R') {
        raceBoats.push(boat);
      } else {
        clubBoats.push(boat);
      }
    });

    // Sort by type (4X, 2X, 1X), then by nickname within type
    const typeOrder = { '4X': 1, '2X': 2, '1X': 3 };
    const getBoatName = (boat) => boat.nickname || boat.displayName;

    const sortBoats = (a, b) => {
      // Sort by type first
      const typeA = typeOrder[a.type] || 999;
      const typeB = typeOrder[b.type] || 999;
      if (typeA !== typeB) {
        return typeA - typeB;
      }
      // Then by name within same type
      return getBoatName(a).localeCompare(getBoatName(b));
    };

    clubBoats.sort(sortBoats);
    raceBoats.sort(sortBoats);

    // Sort tinnies by display name
    tinnies.sort((a, b) => getBoatName(a).localeCompare(getBoatName(b)));

    return { clubBoats, raceBoats, tinnies };
  }

  // ============================================================================
  // MOBILE PORTRAIT VIEW METHODS
  // ============================================================================

  /**
   * Setup event listeners for mobile portrait view
   */
  setupMobileEventListeners() {
    // Day navigation arrow buttons
    if (this.elements.dayNavPrev) {
      this.elements.dayNavPrev.addEventListener('click', () => {
        if (this.selectedDayIndex > 0) {
          this.selectedDayIndex--;
          this.renderMobileView();
        }
      });
    }

    if (this.elements.dayNavNext) {
      this.elements.dayNavNext.addEventListener('click', () => {
        if (this.selectedDayIndex < this.daysToDisplay - 1) {
          this.selectedDayIndex++;
          this.renderMobileView();
        }
      });
    }
  }

  /**
   * Setup tooltip for desktop hover on bookings
   */
  setupTooltip() {
    // Only setup on devices with hover capability
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      return;
    }

    // Create tooltip element
    this.tooltipElement = document.createElement('div');
    this.tooltipElement.className = 'booking-tooltip';
    this.tooltipElement.innerHTML = `
      <div class="tooltip-boat"></div>
      <div class="tooltip-member"></div>
      <div class="tooltip-time"></div>
    `;
    document.body.appendChild(this.tooltipElement);

    // Use event delegation on the main view container
    const container = this.elements.mainView;
    if (!container) return;

    container.addEventListener('mouseenter', (e) => {
      const target = e.target.closest('.session-item.has-booking');
      if (target) {
        this.showTooltip(target);
      }
    }, true);

    container.addEventListener('mouseleave', (e) => {
      const target = e.target.closest('.session-item.has-booking');
      if (target) {
        this.hideTooltip();
      }
    }, true);

    container.addEventListener('mousemove', (e) => {
      if (this.tooltipElement.classList.contains('visible')) {
        this.positionTooltip(e.clientX, e.clientY);
      }
    });
  }

  /**
   * Show tooltip with booking details
   */
  showTooltip(element) {
    const boat = element.getAttribute('data-tooltip-boat');
    const member = element.getAttribute('data-tooltip-member');
    const time = element.getAttribute('data-tooltip-time');

    this.tooltipElement.querySelector('.tooltip-boat').textContent = boat;
    this.tooltipElement.querySelector('.tooltip-member').textContent = member;
    this.tooltipElement.querySelector('.tooltip-time').textContent = time;

    this.tooltipElement.classList.add('visible');
  }

  /**
   * Hide tooltip
   */
  hideTooltip() {
    if (this.tooltipElement) {
      this.tooltipElement.classList.remove('visible');
    }
  }

  /**
   * Position tooltip near cursor
   */
  positionTooltip(x, y) {
    const tooltip = this.tooltipElement;
    const padding = 15;

    // Position above and to the right of cursor
    let left = x + padding;
    let top = y - tooltip.offsetHeight - padding;

    // Keep within viewport bounds
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Flip to left if too close to right edge
    if (left + tooltip.offsetWidth > viewportWidth - padding) {
      left = x - tooltip.offsetWidth - padding;
    }

    // Flip below if too close to top
    if (top < padding) {
      top = y + padding;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  /**
   * Check if current viewport is mobile portrait
   */
  isMobilePortrait() {
    // Check for forced mode first
    const params = new URLSearchParams(window.location.search);
    const mode = params.get('mode');
    if (mode === 'mobile-portrait') return true;
    if (mode === 'tv' || mode === 'desktop' || mode === 'mobile') return false;

    // Check viewport: width < 768px AND portrait orientation
    const isNarrow = window.innerWidth < 768;
    const isPortrait = window.innerHeight > window.innerWidth;

    return isNarrow && isPortrait;
  }

  /**
   * Render mobile portrait card view
   */
  renderMobileView() {
    if (!this.elements.mobileCardsContainer || !this.elements.dayNavTabs) return;

    // Render day navigation tabs
    this.renderDayNavTabs();

    // Update arrow button states
    this.updateDayNavArrows();

    // Get selected date string
    const today = new Date();
    const selectedDate = new Date(today);
    selectedDate.setDate(today.getDate() + this.selectedDayIndex);
    const selectedDateStr = this.formatDate(selectedDate);

    // Split boats into categories
    const { clubBoats, raceBoats, tinnies } = this.splitBoatsByClassification();

    // Clear and render cards container
    this.elements.mobileCardsContainer.innerHTML = '';

    // Render Club Boats section
    this.renderMobileSection('club', 'CLUB BOATS', clubBoats, selectedDateStr);

    // Render Race Boats section
    this.renderMobileSection('race', 'RACE BOATS', raceBoats, selectedDateStr);

    // Render Tinnies section (if any)
    if (tinnies.length > 0) {
      this.renderMobileSection('tinnies', 'TINNIES', tinnies, selectedDateStr);
    }
  }

  /**
   * Render day navigation tabs
   */
  renderDayNavTabs() {
    this.elements.dayNavTabs.innerHTML = '';

    const today = new Date();
    for (let i = 0; i < this.daysToDisplay; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);

      const tab = document.createElement('button');
      tab.className = 'day-tab' + (i === this.selectedDayIndex ? ' active' : '');
      tab.dataset.dayIndex = i;

      if (i === 0) {
        tab.textContent = 'TODAY';
      } else {
        const dayName = date.toLocaleDateString('en-AU', { weekday: 'short' }).toUpperCase();
        const dayNum = date.getDate();
        tab.textContent = `${dayName} ${dayNum}`;
      }

      // Click handler
      tab.addEventListener('click', () => {
        this.selectedDayIndex = i;
        this.renderMobileView();
      });

      this.elements.dayNavTabs.appendChild(tab);
    }

    // Scroll active tab into view
    const activeTab = this.elements.dayNavTabs.querySelector('.active');
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }
  }

  /**
   * Update day navigation arrow button states
   */
  updateDayNavArrows() {
    if (this.elements.dayNavPrev) {
      this.elements.dayNavPrev.disabled = this.selectedDayIndex === 0;
    }
    if (this.elements.dayNavNext) {
      this.elements.dayNavNext.disabled = this.selectedDayIndex >= this.daysToDisplay - 1;
    }
  }

  /**
   * Render a section of boat cards for mobile view
   */
  renderMobileSection(sectionId, title, boats, dateStr) {
    const container = this.elements.mobileCardsContainer;

    // Section header
    const header = document.createElement('div');
    header.className = 'mobile-section-header' + (this.collapsedSections.has(sectionId) ? ' collapsed' : '');
    header.innerHTML = `
      <span>${title} (${boats.length})</span>
      <span class="section-toggle">${this.collapsedSections.has(sectionId) ? '▶' : '▼'}</span>
    `;
    header.addEventListener('click', () => {
      if (this.collapsedSections.has(sectionId)) {
        this.collapsedSections.delete(sectionId);
      } else {
        this.collapsedSections.add(sectionId);
      }
      this.renderMobileView();
    });
    container.appendChild(header);

    // Section boats container
    const boatsContainer = document.createElement('div');
    boatsContainer.className = 'mobile-section-boats';

    if (!this.collapsedSections.has(sectionId)) {
      // Render boat cards
      boats.forEach(boat => {
        const card = this.createMobileBoatCard(boat, dateStr, sectionId === 'tinnies');
        boatsContainer.appendChild(card);
      });
    }

    container.appendChild(boatsContainer);
  }

  /**
   * Create a boat card for mobile view
   */
  createMobileBoatCard(boat, dateStr, isTinnie = false) {
    const card = document.createElement('div');
    card.className = 'mobile-boat-card';

    // Add boat type class
    const typeClass = isTinnie ? 'type-tinnie' : this.getBoatTypeClass(boat.type);
    card.classList.add(typeClass);

    // Check if damaged
    const isDamaged = this.isDamagedBoat(boat);
    if (isDamaged) {
      card.classList.add('damaged');
    }

    // Boat name
    const boatName = boat.nickname || boat.displayName;

    // Build header HTML
    let headerHTML = '';
    if (!isTinnie && boat.type) {
      headerHTML += `<span class="mobile-boat-badge">${boat.type}</span>`;
    }
    if (isDamaged) {
      headerHTML += '<span class="mobile-damaged-badge">DAMAGED</span>';
    }
    headerHTML += `<span class="mobile-boat-name" title="${this.escapeHtml(boatName)}">${this.escapeHtml(boatName)}</span>`;
    if (boat.weight) {
      headerHTML += `<span class="mobile-boat-weight">${boat.weight}kg</span>`;
    }

    // Header
    const header = document.createElement('div');
    header.className = 'mobile-boat-header';
    header.innerHTML = headerHTML;
    card.appendChild(header);

    // Sessions container
    const sessionsContainer = document.createElement('div');
    sessionsContainer.className = 'mobile-sessions';

    // Get bookings for selected date
    const bookings = this.getBookingsForDate(boat, dateStr);

    // AM1 session
    const am1Row = this.createMobileSessionRow('AM1', bookings.morning1);
    sessionsContainer.appendChild(am1Row);

    // AM2 session
    const am2Row = this.createMobileSessionRow('AM2', bookings.morning2);
    sessionsContainer.appendChild(am2Row);

    // Add damaged overlay if applicable
    if (isDamaged) {
      const overlay = document.createElement('div');
      overlay.className = 'mobile-damaged-overlay';
      overlay.textContent = 'DAMAGED';
      sessionsContainer.appendChild(overlay);
    }

    card.appendChild(sessionsContainer);

    return card;
  }

  /**
   * Create a session row for mobile view
   */
  createMobileSessionRow(label, booking) {
    const row = document.createElement('div');
    row.className = 'mobile-session-row';

    const labelSpan = document.createElement('span');
    labelSpan.className = 'mobile-session-label';
    labelSpan.textContent = label;
    row.appendChild(labelSpan);

    if (booking) {
      const timeSpan = document.createElement('span');
      timeSpan.className = 'mobile-session-time';
      timeSpan.textContent = booking.startTime;
      row.appendChild(timeSpan);

      const memberSpan = document.createElement('span');
      memberSpan.className = 'mobile-session-member';
      memberSpan.textContent = this.formatMemberName(booking.memberName);
      row.appendChild(memberSpan);
    } else {
      const timeSpan = document.createElement('span');
      timeSpan.className = 'mobile-session-time';
      timeSpan.textContent = '—';
      row.appendChild(timeSpan);

      const availableSpan = document.createElement('span');
      availableSpan.className = 'mobile-session-member mobile-session-available';
      availableSpan.textContent = 'available';
      row.appendChild(availableSpan);
    }

    return row;
  }

  /**
   * Create a boat entry element
   */
  createBoatEntry(boat, previousType = null, isTinnie = false) {
    const entry = document.createElement('div');
    entry.className = 'boat-entry';

    // Add boat type background color class
    const typeClass = isTinnie ? 'type-tinnie' : this.getBoatTypeClass(boat.type);
    entry.classList.add(typeClass);

    // Add separator class if boat type changed from previous
    if (previousType !== null && boat.type !== previousType) {
      entry.classList.add('type-separator');
    }

    // Use nickname if available, otherwise display name
    const boatName = boat.nickname || boat.displayName;

    // Check if boat is damaged
    const isDamaged = this.isDamagedBoat(boat);
    if (isDamaged) {
      entry.classList.add('damaged-boat');
    }

    // Build boat info HTML
    let boatInfoHTML = `
      ${isTinnie ? '' : `<span class="boat-type-badge">${boat.type}</span>`}
      ${isDamaged ? '<span class="damaged-icon" title="Boat is damaged">⚠️</span>' : ''}
      <span class="boat-name-text" title="${this.escapeHtml(boatName)}">${this.escapeHtml(boatName)}</span>
    `;

    // Add badges (weight and sweep) in vertical container if either exists
    if ((boat.weight && boat.weight !== 'null') || boat.sweepCapable) {
      boatInfoHTML += `<div class="boat-badges-vertical">`;

      if (boat.weight && boat.weight !== 'null') {
        boatInfoHTML += `<span class="boat-weight">${boat.weight}kg</span>`;
      }

      if (boat.sweepCapable) {
        boatInfoHTML += `<span class="boat-sweep-badge">SWEEP</span>`;
      }

      boatInfoHTML += `</div>`;
    }

    // Boat info (type badge + name + weight + sweep) on left
    const boatInfo = document.createElement('div');
    boatInfo.className = 'boat-info';
    boatInfo.innerHTML = boatInfoHTML;
    entry.appendChild(boatInfo);

    // Multi-day grid on right
    const daysGrid = document.createElement('div');
    daysGrid.className = 'boat-days-grid';

    // Create columns for each day
    const today = new Date();
    for (let i = 0; i < this.daysToDisplay; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = this.formatDate(date);

      const dayColumn = document.createElement('div');
      dayColumn.className = 'day-column';

      // Get bookings for this day
      const bookings = this.getBookingsForDate(boat, dateStr);

      // AM1 session for this day
      const am1 = this.createSessionItem(bookings.morning1, boatName);
      dayColumn.appendChild(am1);

      // AM2 session for this day
      const am2 = this.createSessionItem(bookings.morning2, boatName);
      dayColumn.appendChild(am2);

      daysGrid.appendChild(dayColumn);
    }

    entry.appendChild(daysGrid);

    // Add damaged overlay if boat is damaged
    if (isDamaged) {
      const damagedOverlay = document.createElement('div');
      damagedOverlay.className = 'damaged-overlay';
      damagedOverlay.textContent = 'DAMAGED';
      entry.appendChild(damagedOverlay);
    }

    return entry;
  }

  /**
   * Create a session item
   */
  createSessionItem(booking, boatName = '') {
    const item = document.createElement('div');
    item.className = 'session-item';

    if (booking) {
      // Format member name (first name + last initial)
      const formattedName = this.formatMemberName(booking.memberName);

      // Add tooltip data for desktop hover
      item.classList.add('has-booking');
      item.setAttribute('data-tooltip-boat', boatName);
      item.setAttribute('data-tooltip-member', booking.memberName);
      item.setAttribute('data-tooltip-time', `${booking.startTime} - ${booking.endTime}`);

      item.innerHTML = `
        <span class="booking-time">${booking.startTime}</span>
        <span class="booking-member">${this.escapeHtml(formattedName)}</span>
      `;
    } else {
      item.innerHTML = '';
    }

    return item;
  }

  /**
   * Format member name as first name + last initial
   */
  formatMemberName(fullName) {
    if (!fullName) return '';

    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0];
    }

    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
    return `${firstName} ${lastInitial}`;
  }

  /**
   * Get bookings for a specific date, determining session by time
   */
  getBookingsForDate(boat, dateStr) {
    const result = { morning1: null, morning2: null };

    // Check all bookings for this date
    boat.bookings.forEach(booking => {
      if (booking.date !== dateStr) return;

      // Parse booking times
      const [bookingStartHour, bookingStartMin] = booking.startTime.split(':').map(Number);
      const [bookingEndHour, bookingEndMin] = booking.endTime.split(':').map(Number);

      // Parse session times
      const [session1StartHour, session1StartMin] = this.sessions.morning1.start.split(':').map(Number);
      const [session1EndHour, session1EndMin] = this.sessions.morning1.end.split(':').map(Number);
      const [session2StartHour, session2StartMin] = this.sessions.morning2.start.split(':').map(Number);
      const [session2EndHour, session2EndMin] = this.sessions.morning2.end.split(':').map(Number);

      // Convert to minutes for easier comparison
      const bookingStart = bookingStartHour * 60 + bookingStartMin;
      const bookingEnd = bookingEndHour * 60 + bookingEndMin;
      const session1Start = session1StartHour * 60 + session1StartMin;
      const session1End = session1EndHour * 60 + session1EndMin;
      const session2Start = session2StartHour * 60 + session2StartMin;
      const session2End = session2EndHour * 60 + session2EndMin;

      // Check if booking overlaps with session 1
      if (bookingStart < session1End && bookingEnd > session1Start) {
        result.morning1 = booking;
      }

      // Check if booking overlaps with session 2
      if (bookingStart < session2End && bookingEnd > session2Start) {
        result.morning2 = booking;
      }
    });

    return result;
  }

  /**
   * Update the footer date display
   */
  updateClock() {
    const now = new Date();

    const footerStr = 'TODAY - ' + now.toLocaleDateString('en-AU', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
    this.elements.todayDateFooter.textContent = footerStr;
  }

  /**
   * Update last updated timestamp
   */
  updateLastUpdated() {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('en-AU', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    this.elements.lastUpdated.textContent = `Last updated: ${timeStr}`;
  }

  /**
   * Show a specific view
   */
  showView(view) {
    this.elements.loadingScreen.classList.add('hidden');
    this.elements.errorScreen.classList.add('hidden');
    this.elements.mainView.classList.add('hidden');

    switch (view) {
      case 'main':
        this.elements.mainView.classList.remove('hidden');
        break;
      case 'loading':
        this.elements.loadingScreen.classList.remove('hidden');
        break;
      case 'error':
        this.elements.errorScreen.classList.remove('hidden');
        break;
    }
  }

  /**
   * Show error message
   */
  showError(message) {
    this.elements.errorMessage.textContent = message;
    this.showView('error');
  }

  /**
   * Get CSS class for boat type
   */
  getBoatTypeClass(type) {
    switch (type) {
      case '1X': return 'type-1x';
      case '2X': return 'type-2x';
      case '4X': return 'type-4x';
      case '8X': return 'type-other';
      default: return 'type-other';
    }
  }

  /**
   * Format date as YYYY-MM-DD
   */
  formatDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Check if a boat is marked as damaged
   */
  isDamagedBoat(boat) {
    // Check the isDamaged flag from API
    if (boat.isDamaged === true) {
      return true;
    }

    // Also check nickname, displayName for "damaged" text (fallback)
    const nickname = (boat.nickname || '').toLowerCase();
    const displayName = (boat.displayName || '').toLowerCase();

    return nickname.includes('damaged') || displayName.includes('damaged');
  }

  // ============================================================================
  // FONT SIZE CONTROLS (Interactive Mode Only)
  // ============================================================================

  /**
   * Check if we're in TV mode (font controls should be hidden)
   */
  isTvMode() {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'tv';
  }

  /**
   * Get current view mode key for font scale storage
   * Portrait and landscape views need different scales due to different base typography
   */
  getFontScaleViewMode() {
    return this.isMobilePortrait() ? 'portrait' : 'landscape';
  }

  /**
   * Get current font scale for the active view mode
   */
  getCurrentFontScale() {
    const mode = this.getFontScaleViewMode();
    return this.fontScales[mode];
  }

  /**
   * Set font scale for the active view mode
   */
  setCurrentFontScale(scale) {
    const mode = this.getFontScaleViewMode();
    this.fontScales[mode] = scale;
  }

  /**
   * Setup font size controls for interactive mode
   */
  setupFontSizeControls() {
    // Don't setup controls in TV mode
    if (this.isTvMode()) {
      console.log('[TV Display] TV mode - font controls disabled');
      return;
    }

    // Load saved font scales from localStorage
    this.loadFontScales();

    // Show controls
    if (this.elements.fontSizeControls) {
      this.elements.fontSizeControls.classList.remove('hidden');
    }
    if (this.elements.fontSizeFab) {
      this.elements.fontSizeFab.classList.remove('hidden');
    }

    // Desktop controls
    if (this.elements.fontDecrease) {
      this.elements.fontDecrease.addEventListener('click', () => this.decreaseFontSize());
    }
    if (this.elements.fontIncrease) {
      this.elements.fontIncrease.addEventListener('click', () => this.increaseFontSize());
    }
    if (this.elements.fontReset) {
      this.elements.fontReset.addEventListener('click', () => this.resetFontSize());
    }

    // Mobile FAB - open sheet
    if (this.elements.fontSizeFab) {
      this.elements.fontSizeFab.addEventListener('click', () => this.openFontSizeSheet());
    }

    // Mobile sheet backdrop - close sheet
    if (this.elements.fontSizeSheetBackdrop) {
      this.elements.fontSizeSheetBackdrop.addEventListener('click', () => this.closeFontSizeSheet());
    }

    // Mobile sheet controls
    if (this.elements.fontDecreaseSheet) {
      this.elements.fontDecreaseSheet.addEventListener('click', () => this.decreaseFontSize());
    }
    if (this.elements.fontIncreaseSheet) {
      this.elements.fontIncreaseSheet.addEventListener('click', () => this.increaseFontSize());
    }
    if (this.elements.fontResetSheet) {
      this.elements.fontResetSheet.addEventListener('click', () => this.resetFontSize());
    }

    console.log('[TV Display] Font size controls initialized, scales:', this.fontScales);
  }

  /**
   * Load font scales from localStorage (separate for portrait and landscape)
   */
  loadFontScales() {
    // Load portrait scale
    const savedPortrait = localStorage.getItem('userPrefs.fontSize.portrait');
    if (savedPortrait) {
      const scale = parseFloat(savedPortrait);
      if (!isNaN(scale) && scale >= this.fontScaleMin && scale <= this.fontScaleMax) {
        this.fontScales.portrait = scale;
      }
    }

    // Load landscape scale
    const savedLandscape = localStorage.getItem('userPrefs.fontSize.landscape');
    if (savedLandscape) {
      const scale = parseFloat(savedLandscape);
      if (!isNaN(scale) && scale >= this.fontScaleMin && scale <= this.fontScaleMax) {
        this.fontScales.landscape = scale;
      }
    }

    // Migrate old single-value storage if exists (one-time migration)
    const oldSaved = localStorage.getItem('userPrefs.fontSize');
    if (oldSaved && !savedPortrait && !savedLandscape) {
      const scale = parseFloat(oldSaved);
      if (!isNaN(scale) && scale >= this.fontScaleMin && scale <= this.fontScaleMax) {
        // Apply old value to both (user can then adjust separately)
        this.fontScales.portrait = scale;
        this.fontScales.landscape = scale;
        this.saveFontScales();
      }
      localStorage.removeItem('userPrefs.fontSize'); // Clean up old key
    }

    this.applyFontScale();
  }

  /**
   * Save current font scales to localStorage
   */
  saveFontScales() {
    localStorage.setItem('userPrefs.fontSize.portrait', this.fontScales.portrait.toString());
    localStorage.setItem('userPrefs.fontSize.landscape', this.fontScales.landscape.toString());
  }

  /**
   * Apply current font scale to CSS variable (based on active view mode)
   */
  applyFontScale() {
    const scale = this.getCurrentFontScale();
    document.documentElement.style.setProperty('--user-font-scale', scale);
    this.updateFontSizeDisplay();
  }

  /**
   * Called when view mode changes (orientation/resize) to apply the appropriate scale
   */
  onViewModeChanged() {
    if (this.isTvMode()) return;
    this.applyFontScale();
    console.log('[TV Display] View mode changed, applied scale for:', this.getFontScaleViewMode());
  }

  /**
   * Update the font size percentage display
   */
  updateFontSizeDisplay() {
    const scale = this.getCurrentFontScale();
    const percent = Math.round(scale * 100) + '%';
    if (this.elements.fontSizePercent) {
      this.elements.fontSizePercent.textContent = percent;
    }
    if (this.elements.fontSizePercentSheet) {
      this.elements.fontSizePercentSheet.textContent = percent;
    }
  }

  /**
   * Increase font size for current view mode
   */
  increaseFontSize() {
    const currentScale = this.getCurrentFontScale();
    if (currentScale < this.fontScaleMax) {
      let newScale = Math.min(this.fontScaleMax, currentScale + this.fontScaleStep);
      newScale = Math.round(newScale * 10) / 10; // Round to 1 decimal
      this.setCurrentFontScale(newScale);
      this.applyFontScale();
      this.saveFontScales();
      console.log('[TV Display] Font size increased to', newScale, 'for', this.getFontScaleViewMode());
    }
  }

  /**
   * Decrease font size for current view mode
   */
  decreaseFontSize() {
    const currentScale = this.getCurrentFontScale();
    if (currentScale > this.fontScaleMin) {
      let newScale = Math.max(this.fontScaleMin, currentScale - this.fontScaleStep);
      newScale = Math.round(newScale * 10) / 10; // Round to 1 decimal
      this.setCurrentFontScale(newScale);
      this.applyFontScale();
      this.saveFontScales();
      console.log('[TV Display] Font size decreased to', newScale, 'for', this.getFontScaleViewMode());
    }
  }

  /**
   * Reset font size to default for current view mode
   */
  resetFontSize() {
    this.setCurrentFontScale(1.0);
    this.applyFontScale();
    this.saveFontScales();
    console.log('[TV Display] Font size reset to default for', this.getFontScaleViewMode());
  }

  /**
   * Open mobile font size bottom sheet
   */
  openFontSizeSheet() {
    if (this.elements.fontSizeSheet) {
      this.elements.fontSizeSheet.classList.remove('hidden');
    }
  }

  /**
   * Close mobile font size bottom sheet
   */
  closeFontSizeSheet() {
    if (this.elements.fontSizeSheet) {
      this.elements.fontSizeSheet.classList.add('hidden');
    }
  }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('[TV Display] DOM loaded, initializing controller...');
  const controller = new TVDisplayController();
  controller.init();
});
