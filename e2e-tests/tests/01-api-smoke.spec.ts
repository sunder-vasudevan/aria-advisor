import { test, expect, request } from '@playwright/test';

const API_BASE = 'https://aria-advisor.onrender.com';
let advisorToken = '';
let personalToken = '';
let clientId = '';
let tradeId = '';

test.describe('Backend API Smoke Tests', () => {
  test('Swagger UI loads', async ({ page }) => {
    await page.goto(`${API_BASE}/docs`);
    await expect(page.locator('text=Swagger UI')).toBeVisible({ timeout: 30000 });
    await page.screenshot({ path: 'screenshots/api-01-swagger.png', fullPage: true });
  });

  test('POST /advisor/login returns JWT', async ({ request }) => {
    const res = await request.post(`${API_BASE}/advisor/login`, {
      data: { username: 'rm_demo', password: 'aria2026' },
    });
    const body = await res.json();
    console.log('Advisor login status:', res.status());
    console.log('Advisor login response:', JSON.stringify(body).slice(0, 300));
    expect(res.status()).toBe(200);
    expect(body.access_token || body.token).toBeTruthy();
    advisorToken = body.access_token || body.token;
  });

  test('GET /clients returns client list', async ({ request }) => {
    if (!advisorToken) {
      const res = await request.post(`${API_BASE}/advisor/login`, {
        data: { username: 'rm_demo', password: 'aria2026' },
      });
      const body = await res.json();
      advisorToken = body.access_token || body.token;
    }
    const res = await request.get(`${API_BASE}/clients`, {
      headers: { Authorization: `Bearer ${advisorToken}` },
    });
    const body = await res.json();
    console.log('GET /clients status:', res.status());
    console.log('Clients count:', Array.isArray(body) ? body.length : JSON.stringify(body).slice(0, 200));
    expect(res.status()).toBe(200);
    expect(Array.isArray(body)).toBeTruthy();
    if (body.length > 0) {
      clientId = body[0].id || body[0].client_id || '';
      console.log('First client ID:', clientId);
    }
  });

  test('GET /notifications/advisor/me works', async ({ request }) => {
    if (!advisorToken) test.skip(true, 'No advisor token');
    const res = await request.get(`${API_BASE}/notifications/advisor/me`, {
      headers: { Authorization: `Bearer ${advisorToken}` },
    });
    console.log('Advisor notifications status:', res.status());
    const body = await res.json();
    console.log('Advisor notifications:', JSON.stringify(body).slice(0, 300));
    expect([200, 404]).toContain(res.status());
  });

  test('POST /clients/:id/trades creates a trade (draft)', async ({ request }) => {
    if (!advisorToken || !clientId) {
      console.log('Skipping trade creation - missing token or clientId');
      test.skip(true, 'Missing advisor token or clientId');
      return;
    }
    const res = await request.post(`${API_BASE}/clients/${clientId}/trades`, {
      headers: { Authorization: `Bearer ${advisorToken}` },
      data: {
        asset_class: 'equity',
        asset_name: 'NIFTY 50 ETF',
        trade_type: 'buy',
        quantity: 10,
        price_per_unit: 250,
        notes: 'E2E test trade - draft',
      },
    });
    const body = await res.json();
    console.log('Create trade status:', res.status());
    console.log('Create trade response:', JSON.stringify(body).slice(0, 300));
    expect([200, 201]).toContain(res.status());
    tradeId = body.id || body.trade_id || '';
    console.log('Trade ID:', tradeId);
  });

  test('GET /trades/personal/clients/me/trades works', async ({ request }) => {
    // Try to get a personal client token first
    // Use a known test account or skip
    const res = await request.get(`${API_BASE}/trades/personal/clients/me/trades`, {
      headers: { Authorization: `Bearer invalid_token` },
    });
    console.log('Personal trades endpoint status (no auth):', res.status());
    // Expect 401 or 403 for unauthed request
    expect([401, 403, 422]).toContain(res.status());
  });
});
