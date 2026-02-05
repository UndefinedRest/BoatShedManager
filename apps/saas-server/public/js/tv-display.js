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
    };

    this.bookingData = null;
    this.refreshTimer = null;
    this.countdownTimer = null;
    this.countdownSeconds = 0;
    this.isInitialLoad = true;
  }

  /**
   * Initialize and start the display
   */
  async init() {
    console.log('[TV Display] Initializing SaaS version...');

    // Apply CSS variables for layout
    document.documentElement.style.setProperty('--days-to-display', this.daysToDisplay);

    // Start clock immediately
    this.updateClock();
    setInterval(() => this.updateClock(), this.clockInterval);

    // Load initial data
    await this.loadData();

    // Schedule periodic refresh
    this.refreshTimer = setInterval(() => {
      console.log('[TV Display] Auto-refresh triggered');
      this.loadData();
    }, this.refreshInterval);
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
      const [boatsResponse, bookingsResponse] = await Promise.all([
        fetch('/api/v1/boats?limit=200'),
        fetch(`/api/v1/bookings?from=${fromDate}&to=${toDate}&limit=1000`)
      ]);

      if (!boatsResponse.ok || !bookingsResponse.ok) {
        throw new Error('Failed to fetch data from server');
      }

      const boatsResult = await boatsResponse.json();
      const bookingsResult = await bookingsResponse.json();

      if (!boatsResult.success || !bookingsResult.success) {
        throw new Error('API returned error status');
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

      // Update timestamps and countdown
      this.updateLastUpdated();
      this.startCountdown();

    } catch (error) {
      console.error('[TV Display] Error loading data:', error);

      if (this.isInitialLoad) {
        this.showError(error.message);
      } else {
        console.error('[TV Display] Background refresh failed - keeping existing data visible');
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
   * Render the two-column boat display
   */
  render() {
    if (!this.bookingData) return;

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
    const isDamaged = boat.isDamaged;
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
      const am1 = this.createSessionItem(bookings.morning1);
      dayColumn.appendChild(am1);

      // AM2 session for this day
      const am2 = this.createSessionItem(bookings.morning2);
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
  createSessionItem(booking) {
    const item = document.createElement('div');
    item.className = 'session-item';

    if (booking) {
      // Format member name (first name + last initial)
      const formattedName = this.formatMemberName(booking.memberName);

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
   * Start countdown timer to next refresh
   */
  startCountdown() {
    if (this.countdownTimer) {
      clearInterval(this.countdownTimer);
    }

    this.countdownSeconds = Math.round(this.refreshInterval / 1000);

    const autoRefreshDisplay = document.getElementById('autoRefreshDisplay');
    if (!autoRefreshDisplay) return;

    this.updateCountdownDisplay(autoRefreshDisplay);

    this.countdownTimer = setInterval(() => {
      this.countdownSeconds--;
      if (this.countdownSeconds <= 0) {
        this.countdownSeconds = 0;
      }
      this.updateCountdownDisplay(autoRefreshDisplay);
    }, 1000);
  }

  /**
   * Update countdown display
   */
  updateCountdownDisplay(element) {
    const minutes = Math.floor(this.countdownSeconds / 60);
    const seconds = this.countdownSeconds % 60;
    const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
    element.textContent = `• Next update: ${timeStr}`;
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
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  console.log('[TV Display] DOM loaded, initializing controller...');
  const controller = new TVDisplayController();
  controller.init();
});
