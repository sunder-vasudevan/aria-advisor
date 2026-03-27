import { test, expect } from '@playwright/test';

test('Debug - slow render after login', async ({ page }) => {
  const allRequests: string[] = [];
  page.on('request', req => allRequests.push(`${req.method()} ${req.url()}`));
  page.on('response', res => {
    if (!res.url().includes('fonts') && !res.url().includes('static')) {
      console.log(`Response: ${res.status()} ${res.url()}`);
    }
  });

  await page.goto('https://a-ria.vercel.app/login', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  await page.locator('input[type="text"]').first().fill('rm_demo');
  await page.locator('input[type="password"]').first().fill('aria2026');
  await page.locator('button[type="submit"]').click();

  // Wait step by step
  console.log('=== 1s after submit ===');
  await page.waitForTimeout(1000);
  console.log('URL:', page.url());
  console.log('Body:', (await page.locator('body').innerText()).slice(0, 200));

  console.log('=== 3s after submit ===');
  await page.waitForTimeout(2000);
  console.log('URL:', page.url());
  console.log('Body:', (await page.locator('body').innerText()).slice(0, 200));

  console.log('=== 6s after submit ===');
  await page.waitForTimeout(3000);
  console.log('URL:', page.url());
  console.log('Body:', (await page.locator('body').innerText()).slice(0, 300));
  await page.screenshot({ path: 'screenshots/debug-slow-6s.png', fullPage: true });

  console.log('=== 10s after submit ===');
  await page.waitForTimeout(4000);
  console.log('URL:', page.url());
  console.log('Body:', (await page.locator('body').innerText()).slice(0, 400));
  await page.screenshot({ path: 'screenshots/debug-slow-10s.png', fullPage: true });

  console.log('=== 15s after submit ===');
  await page.waitForTimeout(5000);
  console.log('URL:', page.url());
  const bodyText = (await page.locator('body').innerText());
  console.log('Body:', bodyText.slice(0, 600));
  await page.screenshot({ path: 'screenshots/debug-slow-15s.png', fullPage: true });

  console.log('All API requests:', allRequests.filter(r => r.includes('onrender') || r.includes('aria')));
});

test('Debug - direct dashboard URL', async ({ page }) => {
  // Set session first via script injection, then navigate to dashboard
  await page.goto('https://a-ria.vercel.app/login', { waitUntil: 'networkidle' });

  // Inject session directly
  await page.evaluate(() => {
    localStorage.setItem('aria_advisor_session', JSON.stringify({
      username: 'rm_demo',
      role: 'advisor',
      displayName: 'Rahul',
      city: 'Hyderabad',
      region: 'Telangana',
      referral_code: 'RAHUL01',
      advisor_id: 1
    }));
  });

  // Navigate to common dashboard routes
  const routes = ['/dashboard', '/clients', '/home', '/workbench', '/app'];
  for (const route of routes) {
    await page.goto(`https://a-ria.vercel.app${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000);
    const body = await page.locator('body').innerText();
    console.log(`Route ${route}: URL=${page.url()}, body=${body.slice(0, 100)}`);
    if (body.length > 50 && !body.includes('Sign In')) {
      console.log(`Found content at ${route}!`);
      await page.screenshot({ path: `screenshots/debug-route-${route.replace('/', '')}.png`, fullPage: true });
    }
  }
});
