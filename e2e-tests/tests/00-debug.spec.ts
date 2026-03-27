import { test, expect } from '@playwright/test';

test('Debug advisor dashboard content', async ({ page }) => {
  const errors: string[] = [];
  const networkFails: string[] = [];
  const networkRequests: Array<{url: string, status: number}> = [];

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', e => errors.push(e.message));
  page.on('requestfailed', req => networkFails.push(`${req.method()} ${req.url()} - ${req.failure()?.errorText}`));
  page.on('response', res => {
    if (res.status() >= 400) {
      networkRequests.push({ url: res.url(), status: res.status() });
    }
  });

  await page.goto('https://a-ria.vercel.app/login', { waitUntil: 'networkidle' });

  await page.locator('input[type="text"]').first().fill('rm_demo');
  await page.locator('input[type="password"]').first().fill('aria2026');
  await page.screenshot({ path: 'screenshots/debug-01-login.png', fullPage: true });
  await page.locator('button[type="submit"]').click();

  await page.waitForURL(url => !url.toString().includes('/login'), { timeout: 20000 });
  await page.waitForTimeout(4000);

  console.log('URL after login:', page.url());
  console.log('Title:', await page.title());

  const bodyText = await page.locator('body').innerText();
  console.log('Body text (full):', bodyText.slice(0, 2000));

  const allElements = await page.locator('body *').count();
  console.log('Total DOM elements:', allElements);

  // Check specific structural elements
  const divCount = await page.locator('div').count();
  const navCount = await page.locator('nav').count();
  const headerCount = await page.locator('header').count();
  console.log(`divs: ${divCount}, navs: ${navCount}, headers: ${headerCount}`);

  // Get visible text nodes
  const visibleTexts = await page.evaluate(() => {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const texts: string[] = [];
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent?.trim();
      if (text && text.length > 2) texts.push(text);
    }
    return texts.slice(0, 50);
  });
  console.log('Visible text nodes:', visibleTexts);

  console.log('Console errors:', errors);
  console.log('Network failures:', networkFails);
  console.log('HTTP 4xx/5xx responses:', networkRequests.slice(0, 10));

  await page.screenshot({ path: 'screenshots/debug-02-dashboard.png', fullPage: true });

  // Also check localStorage
  const storage = await page.evaluate(() => {
    const result: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)!;
      result[key] = localStorage.getItem(key) || '';
    }
    return result;
  });
  console.log('localStorage:', JSON.stringify(storage));
});

test('Debug - check advisor app source/routing', async ({ page }) => {
  // Check if there's a SPA loading issue
  await page.goto('https://a-ria.vercel.app/', { waitUntil: 'domcontentloaded' });
  const html = await page.content();
  console.log('Root HTML length:', html.length);
  console.log('Has root div:', html.includes('id="root"'));
  console.log('Has app div:', html.includes('id="app"'));
  console.log('Script tags:', (html.match(/<script/g) || []).length);

  // Wait for JS to execute
  await page.waitForTimeout(5000);
  const htmlAfter = await page.content();
  console.log('HTML after 5s length:', htmlAfter.length);

  const bodyAfter = await page.locator('body').innerText();
  console.log('Body text after 5s:', bodyAfter.slice(0, 500));
  await page.screenshot({ path: 'screenshots/debug-03-root.png', fullPage: true });
});
