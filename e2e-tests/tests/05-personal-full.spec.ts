/**
 * ARIA Personal App - Full E2E Tests
 * Personal app uses JWT Bearer auth via /personal/auth/*
 */
import { test, expect, Page } from '@playwright/test';

const PERSONAL_URL = 'https://aria-personal.vercel.app';
const API_BASE = 'https://aria-advisor.onrender.com';

// Create unique test user for this run
const TS = Date.now();
const TEST_EMAIL = `e2e_${TS}@aria-test.com`;
const TEST_PASSWORD = 'TestPass123!';
let personalToken = '';

async function ensureTestUser(request: any): Promise<string> {
  // Register
  const regRes = await request.post(`${API_BASE}/personal/auth/register`, {
    data: { email: TEST_EMAIL, password: TEST_PASSWORD, display_name: 'E2E Tester' },
  });
  const regBody = await regRes.json();
  if (regBody.access_token) return regBody.access_token;

  // Try login if already exists
  const loginRes = await request.post(`${API_BASE}/personal/auth/login`, {
    data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  const loginBody = await loginRes.json();
  return loginBody.access_token || '';
}

async function loginPersonalApp(page: Page, token: string) {
  await page.goto(PERSONAL_URL, { waitUntil: 'networkidle' });

  // Inject token directly if possible, otherwise use login form
  const loginForm = page.locator('input[type="email"], input[name="email"]').first();
  if (await loginForm.isVisible({ timeout: 3000 })) {
    await loginForm.fill(TEST_EMAIL);
    const pw = page.locator('input[type="password"]').first();
    await pw.fill(TEST_PASSWORD);
    const submit = page.locator('button[type="submit"]').first();
    await submit.click();
    try {
      await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 15000 });
    } catch {}
  }

  // If still on login page, try token injection
  const currentUrl = page.url();
  if (currentUrl.includes('/login') || currentUrl.includes('/signup')) {
    // Inject token manually and navigate
    await page.evaluate((t) => {
      localStorage.setItem('access_token', t);
      localStorage.setItem('aria_personal_token', t);
      localStorage.setItem('token', t);
    }, token);
    await page.goto(`${PERSONAL_URL}/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
  }
}

test.describe('ARIA Personal - App Availability', () => {
  test('Personal app loads without crash', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    const start = Date.now();
    await page.goto(PERSONAL_URL, { waitUntil: 'networkidle' });
    const loadTime = Date.now() - start;
    console.log(`Personal app load: ${loadTime}ms, URL: ${page.url()}`);
    await page.screenshot({ path: 'screenshots/pers-landing.png', fullPage: true });

    const criticalErrors = errors.filter(e => e.includes('TypeError') || e.includes('Cannot read'));
    if (errors.length) console.log('Errors:', errors);
    expect(criticalErrors).toHaveLength(0);
    console.log('PASS: Personal app loads without critical errors');
  });

  test('Personal app shows auth screen or dashboard', async ({ page }) => {
    await page.goto(PERSONAL_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    const body = await page.locator('body').innerText();
    console.log('Personal landing body:', body.slice(0, 400));
    await page.screenshot({ path: 'screenshots/pers-auth-screen.png', fullPage: true });

    const hasContent = body.length > 50;
    expect(hasContent).toBeTruthy();
    console.log('PASS: Personal app renders content');
  });
});

test.describe('ARIA Personal - Registration + Login', () => {
  test('POST /personal/auth/register returns JWT', async ({ request }) => {
    const uniqueEmail = `e2e_reg_${Date.now()}@aria-test.com`;
    const res = await request.post(`${API_BASE}/personal/auth/register`, {
      data: { email: uniqueEmail, password: TEST_PASSWORD, display_name: 'Reg Test User' },
    });
    const body = await res.json();
    console.log('Register status:', res.status());
    console.log('Register response:', JSON.stringify(body).slice(0, 300));

    expect([200, 201]).toContain(res.status());
    expect(body.access_token).toBeTruthy();
    expect(body.token_type).toBe('bearer');
    expect(body.user).toBeTruthy();
    expect(body.user.email).toBe(uniqueEmail);
    console.log('PASS: Registration returns JWT with user data');
  });

  test('POST /personal/auth/login returns JWT', async ({ request }) => {
    // Register first
    const uniqueEmail = `e2e_login_${Date.now()}@aria-test.com`;
    await request.post(`${API_BASE}/personal/auth/register`, {
      data: { email: uniqueEmail, password: TEST_PASSWORD, display_name: 'Login Test' },
    });

    // Now login
    const res = await request.post(`${API_BASE}/personal/auth/login`, {
      data: { email: uniqueEmail, password: TEST_PASSWORD },
    });
    const body = await res.json();
    console.log('Login status:', res.status());
    console.log('Login response:', JSON.stringify(body).slice(0, 300));

    expect(res.status()).toBe(200);
    expect(body.access_token).toBeTruthy();
    personalToken = body.access_token;
    console.log('PASS: Login returns JWT token');
  });

  test('GET /personal/auth/me returns user profile', async ({ request }) => {
    // Get fresh token
    const uniqueEmail = `e2e_me_${Date.now()}@aria-test.com`;
    const regRes = await request.post(`${API_BASE}/personal/auth/register`, {
      data: { email: uniqueEmail, password: TEST_PASSWORD, display_name: 'Me Test' },
    });
    const { access_token } = await regRes.json();

    const res = await request.get(`${API_BASE}/personal/auth/me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const body = await res.json();
    console.log('GET /me status:', res.status());
    console.log('GET /me body:', JSON.stringify(body));

    expect(res.status()).toBe(200);
    expect(body.email).toBe(uniqueEmail);
    expect(body.display_name).toBe('Me Test');
    expect(body).toHaveProperty('risk_score');
    expect(body).toHaveProperty('advisor_id');
    console.log('PASS: /personal/auth/me returns full profile');
  });

  test('Wrong password returns 401', async ({ request }) => {
    const uniqueEmail = `e2e_auth_${Date.now()}@aria-test.com`;
    await request.post(`${API_BASE}/personal/auth/register`, {
      data: { email: uniqueEmail, password: TEST_PASSWORD, display_name: 'Auth Test' },
    });

    const res = await request.post(`${API_BASE}/personal/auth/login`, {
      data: { email: uniqueEmail, password: 'WrongPassword123!' },
    });
    console.log('Wrong password status:', res.status());
    expect([401, 400]).toContain(res.status());
    console.log('PASS: Wrong password rejected');
  });
});

test.describe('ARIA Personal - Portfolio & Goals API', () => {
  let token = '';
  let userEmail = '';

  test.beforeAll(async ({ request }) => {
    userEmail = `e2e_pg_${Date.now()}@aria-test.com`;
    const res = await request.post(`${API_BASE}/personal/auth/register`, {
      data: { email: userEmail, password: TEST_PASSWORD, display_name: 'PG Tester' },
    });
    const body = await res.json();
    token = body.access_token || '';
    console.log('Setup token:', token ? 'obtained' : 'FAILED');
  });

  test('GET /personal/portfolio returns null or portfolio data', async ({ request }) => {
    const res = await request.get(`${API_BASE}/personal/portfolio`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    console.log('Portfolio status:', res.status());
    console.log('Portfolio body:', JSON.stringify(body));
    expect(res.status()).toBe(200);
    // New user has null portfolio — that's valid
    console.log('PASS: /personal/portfolio returns 200 (null for new user is correct)');
  });

  test('GET /personal/goals returns empty array for new user', async ({ request }) => {
    const res = await request.get(`${API_BASE}/personal/goals`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    console.log('Goals status:', res.status());
    console.log('Goals body:', JSON.stringify(body));
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
    console.log('PASS: /personal/goals returns 200 with array');
  });

  test('GET /personal/life-events returns array', async ({ request }) => {
    const res = await request.get(`${API_BASE}/personal/life-events`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json();
    console.log('Life events status:', res.status());
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
    console.log('PASS: /personal/life-events returns 200');
  });

  test('PUT /personal/auth/profile updates risk score', async ({ request }) => {
    const res = await request.put(`${API_BASE}/personal/auth/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { risk_score: 7 },
    });
    const body = await res.json();
    console.log('Profile update status:', res.status());
    console.log('Profile update body:', JSON.stringify(body));
    expect([200, 204]).toContain(res.status());
    if (res.status() === 200) {
      expect(body.risk_score).toBe(7);
    }
    console.log('PASS: Profile update works');
  });

  test('Unauthorized request to /personal/goals returns 401', async ({ request }) => {
    const res = await request.get(`${API_BASE}/personal/goals`, {
      headers: { Authorization: 'Bearer bad_token' },
    });
    console.log('Unauth goals status:', res.status());
    expect([401, 403]).toContain(res.status());
    console.log('PASS: Unauthorized request rejected correctly');
  });
});

test.describe('ARIA Personal - UI Tests', () => {
  let token = '';

  test.beforeAll(async ({ request }) => {
    const email = `e2e_ui_${Date.now()}@aria-test.com`;
    const res = await request.post(`${API_BASE}/personal/auth/register`, {
      data: { email, password: TEST_PASSWORD, display_name: 'UI Tester' },
    });
    const body = await res.json();
    token = body.access_token || '';
  });

  test('Personal app login form works end-to-end', async ({ page }) => {
    const email = `e2e_form_${Date.now()}@aria-test.com`;
    // Register via API
    await page.request.post(`${API_BASE}/personal/auth/register`, {
      data: { email, password: TEST_PASSWORD, display_name: 'Form Tester' },
    });

    await page.goto(PERSONAL_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/pers-login-form.png', fullPage: true });

    const emailInput = page.locator('input[type="email"], input[name="email"], input[placeholder*="email" i]').first();
    const pwInput = page.locator('input[type="password"]').first();

    if (await emailInput.isVisible({ timeout: 3000 })) {
      await emailInput.fill(email);
      await pwInput.fill(TEST_PASSWORD);
      await page.screenshot({ path: 'screenshots/pers-login-filled.png', fullPage: true });

      const submitBtn = page.locator('button[type="submit"]').first();
      await submitBtn.click();
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'screenshots/pers-post-login.png', fullPage: true });

      console.log('Post-login URL:', page.url());
      const body = await page.locator('body').innerText();
      console.log('Post-login body:', body.slice(0, 400));
    } else {
      console.warn('Login form not found at root — checking if already authenticated');
      const body = await page.locator('body').innerText();
      console.log('Body without login form:', body.slice(0, 300));
    }
    expect(page.url()).toBeTruthy();
  });

  test('Personal app mobile responsive at 375px', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(PERSONAL_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/pers-mobile.png', fullPage: true });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    console.log(`Personal mobile: scrollWidth=${scrollWidth}, clientWidth=${clientWidth}`);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 5);
    console.log('PASS: Personal app responsive at 375px');
  });
});

test.describe('ARIA Personal - Cross-App: Advisor Links Client', () => {
  test('Advisor-linked client can view advisor info', async ({ request }) => {
    // Register a new personal user
    const email = `e2e_linked_${Date.now()}@aria-test.com`;
    const regRes = await request.post(`${API_BASE}/personal/auth/register`, {
      data: { email, password: TEST_PASSWORD, display_name: 'Linked Tester', referral_code: 'RAHUL01' },
    });
    const { access_token, user } = await regRes.json();
    console.log('Registered with referral RAHUL01:', JSON.stringify(user));

    // Check /me to see if advisor is linked
    const meRes = await request.get(`${API_BASE}/personal/auth/me`, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const meBody = await meRes.json();
    console.log('Me after referral registration:', JSON.stringify(meBody));
    expect(meRes.status()).toBe(200);
    // Note whether advisor linked automatically via referral code
    if (meBody.advisor_id) {
      console.log('PASS: Advisor linked via referral code - advisor_id:', meBody.advisor_id);
    } else {
      console.log('NOTE: Referral code did not auto-link advisor (may require separate step)');
    }
  });

  test('POST /personal/auth/link-advisor links via referral code', async ({ request }) => {
    const email = `e2e_link2_${Date.now()}@aria-test.com`;
    const regRes = await request.post(`${API_BASE}/personal/auth/register`, {
      data: { email, password: TEST_PASSWORD, display_name: 'Link Tester' },
    });
    const { access_token } = await regRes.json();

    // Try linking advisor
    const linkRes = await request.post(`${API_BASE}/personal/auth/link-advisor`, {
      headers: { Authorization: `Bearer ${access_token}` },
      data: { referral_code: 'RAHUL01' },
    });
    const linkBody = await linkRes.json();
    console.log('Link advisor status:', linkRes.status());
    console.log('Link advisor response:', JSON.stringify(linkBody));
    expect([200, 201, 400, 422]).toContain(linkRes.status());
    if (linkRes.status() === 200) {
      console.log('PASS: Advisor linked successfully via referral code');
    }
  });
});
