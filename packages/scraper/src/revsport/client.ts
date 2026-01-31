/**
 * RevSport HTTP client with authentication
 *
 * Handles cookie-based session management, CSRF token extraction,
 * and automatic re-authentication on session expiry.
 */

import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';
import * as cheerio from 'cheerio';

export interface RevSportClientConfig {
  baseUrl: string;
  username: string;
  password: string;
  debug?: boolean;
}

export class RevSportClient {
  private client: ReturnType<typeof axios.create>;
  private cookieJar: CookieJar;
  private isAuthenticated: boolean = false;
  private csrfToken: string | null = null;
  private loginPromise: Promise<void> | null = null;
  private debug: boolean;

  constructor(private config: RevSportClientConfig) {
    this.debug = config.debug ?? false;

    if (!config.username || !config.password) {
      throw new Error('Missing username or password in configuration');
    }

    this.cookieJar = new CookieJar();

    // Create base axios instance
    const instance = axios.create({
      baseURL: config.baseUrl,
      withCredentials: true,
      maxRedirects: 5,
      validateStatus: (status: number) => status >= 200 && status < 400,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
      },
    });

    // Wrap with cookie jar support
    // @ts-expect-error - axios-cookiejar-support has type resolution conflicts with axios
    wrapper(instance);

    // Set cookie jar on the instance
    (instance.defaults as any).jar = this.cookieJar;
    this.client = instance;
  }

  private log(message: string, data?: unknown): void {
    if (this.debug) {
      console.log(`[RevSportClient] ${message}`, data ?? '');
    }
  }

  /**
   * Perform login with mutex to prevent concurrent logins
   */
  async login(): Promise<void> {
    if (this.loginPromise) {
      this.log('Login already in progress, waiting...');
      return this.loginPromise;
    }

    if (this.isAuthenticated) {
      this.log('Already authenticated, skipping login');
      return;
    }

    this.loginPromise = this._doLogin();

    try {
      await this.loginPromise;
    } finally {
      this.loginPromise = null;
    }
  }

  private async _doLogin(): Promise<void> {
    this.log('Starting authentication...');

    // Step 1: Fetch login page and extract CSRF token
    await this.fetchLoginPage();

    // Step 2: Submit login credentials
    await this.submitLogin();

    // Step 3: Verify authentication
    await this.delay(1000);
    await this.verifyAuthentication();

    this.log('Authentication successful');
  }

  private async fetchLoginPage(): Promise<void> {
    this.log('Fetching login page...');

    const response = await this.client.get('/login');
    const $ = cheerio.load(response.data);

    this.csrfToken =
      ($('input[name="_token"]').val() as string) ||
      $('meta[name="csrf-token"]').attr('content') ||
      $('meta[name="X-CSRF-TOKEN"]').attr('content') ||
      null;

    if (!this.csrfToken) {
      throw new Error('Could not extract CSRF token from login page');
    }

    this.log('CSRF token extracted');
  }

  private async submitLogin(): Promise<void> {
    this.log('Submitting login credentials...');

    const loginData = new URLSearchParams();
    loginData.append('_token', this.csrfToken!);
    loginData.append('username', this.config.username);
    loginData.append('password', this.config.password);
    loginData.append('remember', 'on');

    const response = await this.client.post('/login', loginData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Referer': `${this.config.baseUrl}/login`,
        'Origin': this.config.baseUrl,
      },
      validateStatus: () => true,
    });

    const cookieCount = this.cookieJar.getCookiesSync(this.config.baseUrl).length;

    if (response.status === 403) {
      throw new Error('403 Forbidden - possible Cloudflare block');
    }

    if (response.status === 429) {
      throw new Error('429 Too Many Requests - rate limited');
    }

    if (response.status >= 400 && cookieCount === 0) {
      if (typeof response.data === 'string') {
        const $ = cheerio.load(response.data);
        const errorMsg = $('.alert-danger').text().trim() || $('.error').text().trim();
        throw new Error(errorMsg || `Login failed with status ${response.status}`);
      }
      throw new Error(`Login failed with status ${response.status}`);
    }

    this.log('Login submitted');
  }

  private async verifyAuthentication(): Promise<void> {
    this.log('Verifying authentication...');

    const response = await this.client.get('/bookings');
    const $ = cheerio.load(response.data);

    const hasLogoutButton =
      $('a[href*="logout"]').length > 0 || $('form[action*="logout"]').length > 0;
    const hasLoginForm =
      $('form[action*="login"]').length > 0 || $('input[name="password"]').length > 0;

    this.isAuthenticated = hasLogoutButton && !hasLoginForm;

    if (!this.isAuthenticated) {
      throw new Error('Authentication verification failed - not logged in');
    }
  }

  /**
   * Make authenticated GET request with auto-retry on session expiry
   */
  async get<T = string>(url: string, retryCount: number = 0): Promise<T> {
    if (!this.isAuthenticated) {
      throw new Error('Not authenticated. Call login() first.');
    }

    try {
      const response = await this.client.get(url);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.status === 403) {
        if (retryCount >= 2) {
          throw new Error('Authentication failed after multiple retries');
        }

        this.log(`Session expired (retry ${retryCount + 1}/2), re-authenticating...`);
        this.isAuthenticated = false;

        const backoffMs = Math.pow(2, retryCount) * 1000;
        await this.delay(backoffMs);

        await this.login();
        return this.get<T>(url, retryCount + 1);
      }

      throw error;
    }
  }

  isLoggedIn(): boolean {
    return this.isAuthenticated;
  }

  /**
   * Reset authentication state (for cleanup)
   */
  reset(): void {
    this.isAuthenticated = false;
    this.csrfToken = null;
    this.cookieJar = new CookieJar();
    (this.client.defaults as any).jar = this.cookieJar;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
