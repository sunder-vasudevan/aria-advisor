/**
 * Playwright Global Teardown
 * Runs after all tests complete. Deletes test-created users and data.
 */
import { chromium } from '@playwright/test';

async function globalTeardown() {
  const API_BASE = process.env.API_BASE || 'https://aria-advisor.onrender.com';

  console.log('\n🧹 E2E Teardown: Cleaning up test data...');

  const browser = await chromium.launch();
  const context = await browser.createBrowserContext();
  const page = await context.newPage();

  try {
    // Call DELETE /personal/auth/test-cleanup
    const res = await page.request.delete(`${API_BASE}/personal/auth/test-cleanup`);
    const body = await res.json();
    console.log(`✅ Cleanup response (${res.status()}):`, body);

    if (res.ok) {
      console.log(`   • Deleted ${body.deleted_users || 0} test users`);
      console.log(`   • Deleted ${body.deleted_trades || 0} test trades`);
    }
  } catch (err) {
    console.error('❌ Cleanup failed:', err);
  } finally {
    await context.close();
    await browser.close();
  }

  console.log('🏁 Teardown complete.\n');
}

export default globalTeardown;
