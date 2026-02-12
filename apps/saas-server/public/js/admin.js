/**
 * Admin Configuration Page Controller
 *
 * Manages login, config loading/saving, and tab navigation.
 * Calls existing admin API endpoints + new GET /admin/config.
 */

class AdminController {
  constructor() {
    /** @type {string|null} */
    this.token = sessionStorage.getItem('admin_token');
    /** @type {object|null} */
    this.user = JSON.parse(sessionStorage.getItem('admin_user') || 'null');
    /** @type {number|null} */
    this.tokenExp = parseInt(sessionStorage.getItem('admin_token_exp') || '0', 10) || null;
    /** @type {object|null} */
    this.config = null;
    /** @type {number|null} */
    this.expiryTimer = null;

    this.bindEvents();

    if (this.token && this.tokenExp && Date.now() / 1000 < this.tokenExp) {
      this.showApp();
      this.loadAll();
    } else {
      this.logout(true);
    }
  }

  // ── API Helper ──────────────────────────────────────────────

  /**
   * @param {string} path
   * @param {object} [options]
   * @returns {Promise<object>}
   */
  async api(path, options = {}) {
    const headers = { 'Content-Type': 'application/json' };
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`/api/v1${path}`, {
      ...options,
      headers: { ...headers, ...options.headers },
    });

    if (res.status === 401) {
      this.logout();
      throw new Error('Session expired. Please log in again.');
    }

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error?.message || 'Request failed');
    }
    return json.data;
  }

  // ── Auth ────────────────────────────────────────────────────

  async login(email, password) {
    const res = await fetch('/api/v1/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.error?.message || 'Login failed');
    }

    this.token = json.data.token;
    this.user = json.data.user;
    this.tokenExp = Math.floor(Date.now() / 1000) + json.data.expiresIn;

    sessionStorage.setItem('admin_token', this.token);
    sessionStorage.setItem('admin_user', JSON.stringify(this.user));
    sessionStorage.setItem('admin_token_exp', String(this.tokenExp));

    this.startExpiryTimer();
    this.showApp();
    this.loadAll();
  }

  logout(silent = false) {
    this.token = null;
    this.user = null;
    this.tokenExp = null;
    this.config = null;
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_user');
    sessionStorage.removeItem('admin_token_exp');
    if (this.expiryTimer) clearTimeout(this.expiryTimer);

    document.getElementById('loginScreen').style.display = '';
    document.getElementById('adminApp').classList.remove('visible');

    if (!silent) {
      this.showToast('Logged out', 'info');
    }
  }

  startExpiryTimer() {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    if (!this.tokenExp) return;

    const msUntilExpiry = (this.tokenExp - Math.floor(Date.now() / 1000)) * 1000;
    if (msUntilExpiry <= 0) {
      this.logout();
      return;
    }

    // Warn 60s before expiry
    const warnAt = msUntilExpiry - 60000;
    if (warnAt > 0) {
      this.expiryTimer = setTimeout(() => {
        this.showToast('Session expiring soon. Save your work.', 'info');
        // Auto-logout at actual expiry
        this.expiryTimer = setTimeout(() => this.logout(), 60000);
      }, warnAt);
    } else {
      this.expiryTimer = setTimeout(() => this.logout(), msUntilExpiry);
    }
  }

  // ── UI State ────────────────────────────────────────────────

  showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminApp').classList.add('visible');

    if (this.user) {
      document.getElementById('userEmail').textContent = this.user.email || '';
    }

    this.startExpiryTimer();
  }

  showLoading(show) {
    document.getElementById('loadingOverlay').classList.toggle('visible', show);
  }

  showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });
    // Update panels
    document.querySelectorAll('.tab-panel').forEach(panel => {
      panel.classList.toggle('active', panel.id === `panel-${tabName}`);
    });
  }

  // ── Data Loading ────────────────────────────────────────────

  async loadAll() {
    this.showLoading(true);
    try {
      await Promise.all([
        this.loadConfig(),
        this.loadStatus(),
      ]);
    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async loadConfig() {
    this.config = await this.api('/admin/config');
    this.populateConfigForms();
  }

  async loadStatus() {
    try {
      const status = await this.api('/admin/status');
      this.populateDashboard(status);
    } catch (err) {
      // Status may fail if no scrapes have run yet — that's OK
      console.warn('Failed to load status:', err.message);
    }
  }

  // ── Dashboard ───────────────────────────────────────────────

  populateDashboard(status) {
    if (status.lastScrape) {
      const ts = status.lastScrape.completedAt;
      document.getElementById('statLastScrape').textContent = ts
        ? this.formatTimeAgo(new Date(ts))
        : 'Never';
      document.getElementById('statBoats').textContent = status.lastScrape.boatsCount;
      document.getElementById('statBookings').textContent = status.lastScrape.bookingsCount;
    } else {
      document.getElementById('statLastScrape').textContent = 'Never';
      document.getElementById('statBoats').textContent = '0';
      document.getElementById('statBookings').textContent = '0';
    }

    document.getElementById('stat24hSuccess').textContent = status.scrapeStats?.last24h?.success ?? 0;
    document.getElementById('stat24hFailed').textContent = status.scrapeStats?.last24h?.failed ?? 0;

    const avgMs = status.scrapeStats?.avgDurationMs ?? 0;
    document.getElementById('statAvgDuration').textContent = avgMs > 0
      ? `${(avgMs / 1000).toFixed(1)}s`
      : '--';

    // Recent jobs table
    const tbody = document.getElementById('recentJobsBody');
    if (!status.recentJobs || status.recentJobs.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3">No scrape jobs recorded yet</td></tr>';
      return;
    }

    tbody.innerHTML = status.recentJobs.map(job => {
      const time = job.completedAt ? this.formatTimeAgo(new Date(job.completedAt)) : '--';
      const badgeClass = job.status === 'completed' ? 'success' : (job.status === 'failed' ? 'error' : 'neutral');
      const error = job.error ? this.escapeHtml(job.error) : '--';
      return `<tr>
        <td>${this.escapeHtml(time)}</td>
        <td><span class="status-badge ${badgeClass}">${this.escapeHtml(job.status)}</span></td>
        <td>${error}</td>
      </tr>`;
    }).join('');
  }

  async triggerSync() {
    const btn = document.getElementById('triggerSyncBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Syncing...';

    try {
      await this.api('/admin/sync', { method: 'POST' });
      this.showToast('Sync completed successfully');
      await this.loadStatus();
    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Trigger Sync';
    }
  }

  // ── Config Form Population ──────────────────────────────────

  populateConfigForms() {
    if (!this.config) return;

    // Club badge
    document.getElementById('clubBadge').textContent = this.config.club?.shortName || this.config.club?.name || '';

    // Branding
    const b = this.config.branding || {};
    document.getElementById('brandLogoUrl').value = b.logoUrl || '';
    this.updateLogoPreview(b.logoUrl);
    this.setColour('brandPrimaryColour', 'brandPrimaryHex', b.primaryColor || '#1e3a5f');
    this.setColour('brandSecondaryColour', 'brandSecondaryHex', b.secondaryColor || '#c9a227');
    // Sessions
    const dc = this.config.displayConfig || {};
    this.renderSessionList(dc.sessions || this.getDefaultSessions());

    // Display settings
    document.getElementById('cfgDaysToDisplay').value = dc.daysToDisplay || 7;
    document.getElementById('cfgRefreshInterval').value = dc.refreshInterval || 300000;

    // Boat groups
    this.populateBoatGroups(dc.boatGroups || this.getDefaultBoatGroups());

    // Sort order
    this.renderSortOrder(dc.boatTypeSortOrder || this.getDefaultSortOrder());

    // URLs
    document.getElementById('urlBookingPage').value = dc.bookingPageUrl || '';
    document.getElementById('urlBookingBase').value = dc.bookingBaseUrl || '';

    // Data source
    const ds = this.config.dataSource || {};
    document.getElementById('dsUrl').value = ds.url || '';
    const credStatus = document.getElementById('credentialStatus');
    if (ds.hasCredentials) {
      credStatus.innerHTML = '<span class="status-badge success">Credentials configured</span>';
    } else {
      credStatus.innerHTML = '<span class="status-badge warning">No credentials set</span>';
    }
  }

  // ── Branding ────────────────────────────────────────────────

  setColour(pickerId, hexId, value) {
    // Ensure valid hex for colour picker
    const hex = /^#[0-9a-fA-F]{6}$/.test(value) ? value : '#000000';
    document.getElementById(pickerId).value = hex;
    document.getElementById(hexId).value = value;
  }

  syncColour(pickerId, hexId) {
    const picker = document.getElementById(pickerId);
    const hex = document.getElementById(hexId);
    picker.addEventListener('input', () => { hex.value = picker.value; });
    hex.addEventListener('input', () => {
      if (/^#[0-9a-fA-F]{6}$/.test(hex.value)) {
        picker.value = hex.value;
      }
    });
  }

  updateLogoPreview(url) {
    const preview = document.getElementById('logoPreview');
    if (url) {
      const img = document.createElement('img');
      img.src = url;
      img.alt = 'Club logo preview';
      img.onerror = () => {
        preview.innerHTML = '<span class="no-logo">Failed to load image</span>';
      };
      preview.innerHTML = '';
      preview.appendChild(img);
    } else {
      preview.innerHTML = '<span class="no-logo">No logo set</span>';
    }
  }

  async saveBranding() {
    const data = {
      branding: {
        logoUrl: document.getElementById('brandLogoUrl').value.trim() || null,
        primaryColor: document.getElementById('brandPrimaryHex').value.trim(),
        secondaryColor: document.getElementById('brandSecondaryHex').value.trim(),
      },
    };

    await this.saveDisplay(data, 'Branding saved');
  }

  // ── Sessions ────────────────────────────────────────────────

  getDefaultSessions() {
    return [
      { id: 's1', label: 'Morning Session 1', shortLabel: 'AM1', startTime: '06:30', endTime: '07:30' },
      { id: 's2', label: 'Morning Session 2', shortLabel: 'AM2', startTime: '07:30', endTime: '08:30' },
    ];
  }

  renderSessionList(sessions) {
    const container = document.getElementById('sessionList');
    container.innerHTML = '';

    sessions.forEach((s, i) => {
      const row = document.createElement('div');
      row.className = 'session-row';
      row.dataset.sessionId = s.id || `s${i + 1}`;
      row.innerHTML = `
        <input type="text" class="sess-label" value="${this.escapeAttr(s.label)}" placeholder="Session name">
        <input type="text" class="sess-short" value="${this.escapeAttr(s.shortLabel)}" placeholder="Short" maxlength="5">
        <input type="time" class="sess-start" value="${this.escapeAttr(s.startTime)}">
        <input type="time" class="sess-end" value="${this.escapeAttr(s.endTime)}">
        <button class="btn btn-danger btn-sm sess-delete" title="Remove session">X</button>
      `;
      row.querySelector('.sess-delete').addEventListener('click', () => row.remove());
      container.appendChild(row);
    });
  }

  addSession() {
    const container = document.getElementById('sessionList');
    const count = container.children.length;
    const newSession = {
      id: `s${count + 1}`,
      label: '',
      shortLabel: '',
      startTime: '06:00',
      endTime: '07:00',
    };
    // Re-use renderSessionList by appending
    const row = document.createElement('div');
    row.className = 'session-row';
    row.dataset.sessionId = newSession.id;
    row.innerHTML = `
      <input type="text" class="sess-label" value="" placeholder="Session name">
      <input type="text" class="sess-short" value="" placeholder="Short" maxlength="5">
      <input type="time" class="sess-start" value="06:00">
      <input type="time" class="sess-end" value="07:00">
      <button class="btn btn-danger btn-sm sess-delete" title="Remove session">X</button>
    `;
    row.querySelector('.sess-delete').addEventListener('click', () => row.remove());
    container.appendChild(row);
  }

  collectSessions() {
    const rows = document.querySelectorAll('#sessionList .session-row');
    const sessions = [];
    for (const row of rows) {
      sessions.push({
        id: row.dataset.sessionId,
        label: row.querySelector('.sess-label').value.trim(),
        shortLabel: row.querySelector('.sess-short').value.trim(),
        startTime: row.querySelector('.sess-start').value,
        endTime: row.querySelector('.sess-end').value,
      });
    }
    return sessions;
  }

  validateSessions(sessions) {
    if (sessions.length === 0) {
      throw new Error('At least one session is required');
    }

    const shortLabels = new Set();
    for (const s of sessions) {
      if (!s.label) throw new Error('All sessions need a name');
      if (!s.shortLabel) throw new Error(`Session "${s.label}" needs a short label`);
      if (!s.startTime || !s.endTime) throw new Error(`Session "${s.label}" needs start and end times`);
      if (s.startTime >= s.endTime) throw new Error(`Session "${s.label}": start time must be before end time`);
      if (shortLabels.has(s.shortLabel)) throw new Error(`Duplicate short label: "${s.shortLabel}"`);
      shortLabels.add(s.shortLabel);
    }
  }

  async saveSessions() {
    const sessions = this.collectSessions();
    this.validateSessions(sessions);

    const data = {
      displayConfig: {
        sessions,
        daysToDisplay: parseInt(document.getElementById('cfgDaysToDisplay').value, 10),
        refreshInterval: parseInt(document.getElementById('cfgRefreshInterval').value, 10),
      },
    };

    await this.saveDisplay(data, 'Sessions saved');
  }

  // ── Boat Display ────────────────────────────────────────────

  getDefaultBoatGroups() {
    return [
      { id: 'col1', name: 'CLUB BOATS', classifications: ['T', 'RT'], category: 'race', position: 'column1' },
      { id: 'col2', name: 'RACE BOATS', classifications: ['R'], category: 'race', position: 'column2' },
      { id: 'sub', name: 'TINNIES', classifications: [], category: 'tinnie', position: 'column2-sub' },
    ];
  }

  getDefaultSortOrder() {
    return [
      { type: '4X', order: 1 },
      { type: '2X', order: 2 },
      { type: '1X', order: 3 },
    ];
  }

  populateBoatGroups(groups) {
    // Populate Column 1
    const col1 = groups.find(g => g.position === 'column1');
    if (col1) {
      document.getElementById('col1Name').value = col1.name;
      document.querySelectorAll('.col1-class').forEach(cb => {
        cb.checked = (col1.classifications || []).includes(cb.value);
      });
    }

    // Populate Column 2
    const col2 = groups.find(g => g.position === 'column2');
    if (col2) {
      document.getElementById('col2Name').value = col2.name;
      document.querySelectorAll('.col2-class').forEach(cb => {
        cb.checked = (col2.classifications || []).includes(cb.value);
      });
    }

    // Populate Tinnies section name
    const sub = groups.find(g => g.position === 'column2-sub' || g.category === 'tinnie');
    if (sub) {
      document.getElementById('tinnieName').value = sub.name;
    }
  }

  collectBoatGroups() {
    const col1Classes = Array.from(document.querySelectorAll('.col1-class:checked')).map(cb => cb.value);
    const col2Classes = Array.from(document.querySelectorAll('.col2-class:checked')).map(cb => cb.value);

    return [
      { id: 'col1', name: document.getElementById('col1Name').value.trim(), classifications: col1Classes, category: 'race', position: 'column1' },
      { id: 'col2', name: document.getElementById('col2Name').value.trim(), classifications: col2Classes, category: 'race', position: 'column2' },
      { id: 'sub', name: document.getElementById('tinnieName').value.trim(), classifications: [], category: 'tinnie', position: 'column2-sub' },
    ];
  }

  renderSortOrder(sortOrder) {
    const container = document.getElementById('sortOrderList');

    // Always show common boat types, merge with configured values
    const defaultTypes = ['8+', '4X', '4-', '2X', '2-', '1X'];
    const orderMap = {};
    sortOrder.forEach(s => { orderMap[s.type] = s.order; });

    // Add any custom types from config that aren't in defaults
    sortOrder.forEach(s => {
      if (!defaultTypes.includes(s.type)) {
        defaultTypes.push(s.type);
      }
    });

    // Sort by configured order, then by default list position
    const sorted = defaultTypes
      .map((type, i) => ({ type, order: orderMap[type] ?? (i + 1) }))
      .sort((a, b) => a.order - b.order);

    this._renderSortItems(container, sorted.map(s => s.type));
  }

  /** Build the drag-and-drop list DOM for the given ordered types */
  _renderSortItems(container, types) {
    container.innerHTML = '';
    types.forEach((type, i) => {
      const item = document.createElement('div');
      item.className = 'sort-order-item';
      item.draggable = true;
      item.dataset.type = type;

      item.innerHTML = `
        <span class="sort-order-drag-handle" aria-hidden="true">&#x2630;</span>
        <span class="sort-order-rank">${i + 1}</span>
        <span class="sort-order-label">${this.escapeHtml(type)}</span>
        <span class="sort-order-arrows">
          <button type="button" class="sort-up" aria-label="Move up" ${i === 0 ? 'disabled' : ''}>&#x25B2;</button>
          <button type="button" class="sort-down" aria-label="Move down" ${i === types.length - 1 ? 'disabled' : ''}>&#x25BC;</button>
        </span>
      `;

      // Arrow button handlers
      item.querySelector('.sort-up').addEventListener('click', () => this._moveSortItem(container, item, -1));
      item.querySelector('.sort-down').addEventListener('click', () => this._moveSortItem(container, item, 1));

      // Drag events
      item.addEventListener('dragstart', (e) => {
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', type);
      });
      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        this._updateSortRanks(container);
      });
      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        const dragging = container.querySelector('.dragging');
        if (dragging && dragging !== item) {
          // Insert before or after based on cursor position within the item
          const rect = item.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          if (e.clientY < midY) {
            container.insertBefore(dragging, item);
          } else {
            container.insertBefore(dragging, item.nextSibling);
          }
        }
      });
      item.addEventListener('dragenter', (e) => {
        e.preventDefault();
        item.classList.add('drag-over');
      });
      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
      });
      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
      });

      container.appendChild(item);
    });
  }

  /** Move a sort item up (-1) or down (+1) and refresh ranks/buttons */
  _moveSortItem(container, item, direction) {
    const sibling = direction === -1 ? item.previousElementSibling : item.nextElementSibling;
    if (!sibling) return;
    if (direction === -1) {
      container.insertBefore(item, sibling);
    } else {
      container.insertBefore(item, sibling.nextSibling);
    }
    this._updateSortRanks(container);
  }

  /** Refresh rank badges and enable/disable arrow buttons after reorder */
  _updateSortRanks(container) {
    const items = container.querySelectorAll('.sort-order-item');
    items.forEach((item, i) => {
      item.querySelector('.sort-order-rank').textContent = i + 1;
      item.querySelector('.sort-up').disabled = i === 0;
      item.querySelector('.sort-down').disabled = i === items.length - 1;
      item.classList.remove('drag-over');
    });
  }

  collectSortOrder() {
    const items = document.querySelectorAll('#sortOrderList .sort-order-item');
    const order = [];
    items.forEach((item, i) => {
      order.push({
        type: item.dataset.type,
        order: i + 1,
      });
    });
    return order;
  }

  async saveBoatDisplay() {
    const data = {
      displayConfig: {
        boatGroups: this.collectBoatGroups(),
        boatTypeSortOrder: this.collectSortOrder(),
      },
    };

    await this.saveDisplay(data, 'Boat display settings saved');
  }

  // ── Booking URLs ────────────────────────────────────────────

  async saveUrls() {
    const data = {
      displayConfig: {
        bookingPageUrl: document.getElementById('urlBookingPage').value.trim() || null,
        bookingBaseUrl: document.getElementById('urlBookingBase').value.trim() || null,
      },
    };

    await this.saveDisplay(data, 'Booking URLs saved');
  }

  // ── Data Source ─────────────────────────────────────────────

  async saveCredentials() {
    const url = document.getElementById('dsUrl').value.trim();
    const username = document.getElementById('dsUsername').value.trim();
    const password = document.getElementById('dsPassword').value;

    if (!url) throw new Error('RevSport URL is required');
    if (!username) throw new Error('Username is required');

    const body = { url, username };
    if (password) {
      body.password = password;
    }

    const btn = document.getElementById('saveDatasourceBtn');
    btn.disabled = true;
    try {
      await this.api('/admin/credentials', {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      this.showToast('Credentials saved');
      document.getElementById('dsPassword').value = '';
      // Update credential status indicator
      document.getElementById('credentialStatus').innerHTML =
        '<span class="status-badge success">Credentials configured</span>';
    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  }

  async testConnection() {
    const btn = document.getElementById('testConnectionBtn');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Testing...';

    try {
      await this.api('/admin/sync', { method: 'POST' });
      this.showToast('Connection test successful — sync completed');
      await this.loadStatus();
    } catch (err) {
      this.showToast(`Connection test failed: ${err.message}`, 'error');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Test Connection';
    }
  }

  // ── Generic Save Helper ─────────────────────────────────────

  async saveDisplay(data, successMessage) {
    this.showLoading(true);
    try {
      await this.api('/admin/display', {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      this.showToast(successMessage);
      // Reload config to get server-merged state
      await this.loadConfig();
    } catch (err) {
      this.showToast(err.message, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  // ── Utilities ───────────────────────────────────────────────

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  escapeAttr(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  formatTimeAgo(date) {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  }

  // ── Event Binding ───────────────────────────────────────────

  bindEvents() {
    // Login form
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail').value;
      const password = document.getElementById('loginPassword').value;
      const errorEl = document.getElementById('loginError');
      const btn = document.getElementById('loginBtn');

      btn.disabled = true;
      errorEl.classList.remove('visible');

      try {
        await this.login(email, password);
      } catch (err) {
        errorEl.textContent = err.message;
        errorEl.classList.add('visible');
      } finally {
        btn.disabled = false;
      }
    });

    // Logout
    document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

    // Tab navigation
    document.getElementById('tabNav').addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (btn) this.switchTab(btn.dataset.tab);
    });

    // Dashboard
    document.getElementById('triggerSyncBtn').addEventListener('click', () => this.triggerSync());

    // Branding
    this.syncColour('brandPrimaryColour', 'brandPrimaryHex');
    this.syncColour('brandSecondaryColour', 'brandSecondaryHex');
    document.getElementById('brandLogoUrl').addEventListener('change', (e) => {
      this.updateLogoPreview(e.target.value);
    });
    document.getElementById('saveBrandingBtn').addEventListener('click', () => this.saveBranding());

    // Sessions
    document.getElementById('addSessionBtn').addEventListener('click', () => this.addSession());
    document.getElementById('saveSessionsBtn').addEventListener('click', () => this.saveSessions());

    // Boat Display
    document.getElementById('saveBoatsBtn').addEventListener('click', () => this.saveBoatDisplay());

    // Booking URLs
    document.getElementById('saveUrlsBtn').addEventListener('click', () => this.saveUrls());

    // Data Source
    document.getElementById('saveDatasourceBtn').addEventListener('click', () => this.saveCredentials());
    document.getElementById('testConnectionBtn').addEventListener('click', () => this.testConnection());
  }
}

// ── Init ────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  window.adminController = new AdminController();
});
