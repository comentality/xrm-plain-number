// One-time interactive login. Opens a headed Chromium with a persistent profile
// under e2e/.auth/chromium, navigates to the org, and waits until the user has
// signed in (URL back on the org host, app shell loaded). Later scripts reuse
// the same profile dir, so no second login is needed until the session expires.
import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs';

const orgUrl = (process.env.ORG_URL ?? 'https://org7a56f694.crm3.dynamics.com').replace(/\/$/, '');

const profileDir = path.resolve('.auth/chromium');
const timeoutMs = Number(process.env.LOGIN_TIMEOUT_MS ?? 15 * 60 * 1000);

const ctx = await chromium.launchPersistentContext(profileDir, {
  headless: false,
  viewport: { width: 1400, height: 900 },
  args: ['--disable-blink-features=AutomationControlled'],
});
const page = ctx.pages()[0] ?? (await ctx.newPage());
await page.goto(`${orgUrl}/main.aspx`, { waitUntil: 'domcontentloaded' });
console.log(`Sign in in the browser window (up to ${Math.round(timeoutMs / 60000)} min)...`);

const started = Date.now();
let ok = false;
while (Date.now() - started < timeoutMs) {
  const url = page.url();
  const onOrg = url.startsWith(orgUrl);
  const shell = onOrg && (await page.locator('[data-id="navbar-container"], #shell-container, [data-id="topBar"]').count()) > 0;
  if (shell) { ok = true; break; }
  await page.waitForTimeout(2000);
}
if (!ok) {
  console.error('Login did not complete in time; profile dir kept for retry.');
  await ctx.close();
  process.exit(2);
}
console.log('Signed in; session persisted at', profileDir);
await page.waitForTimeout(3000);
await ctx.close();
fs.writeFileSync(path.resolve('.auth/login-ok'), new Date().toISOString());
