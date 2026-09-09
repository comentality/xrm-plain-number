// Shared: open the persistent, already signed-in profile and expose a
// same-origin Web API caller that runs inside the page (cookies do the auth).
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const orgUrl = (process.env.ORG_URL ?? 'https://org7a56f694.crm3.dynamics.com').replace(/\/$/, '');
const here = path.dirname(fileURLToPath(import.meta.url));
export const profileDir = path.join(here, '.auth', 'chromium');
export const shotsDir = path.join(here, 'shots');

export async function openOrg({ headless = true } = {}) {
  const ctx = await chromium.launchPersistentContext(profileDir, {
    headless,
    viewport: { width: 1400, height: 900 },
    args: ['--disable-blink-features=AutomationControlled'],
  });
  const page = ctx.pages()[0] ?? (await ctx.newPage());
  await page.goto(`${orgUrl}/main.aspx`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(4000);
  if (!page.url().startsWith(orgUrl)) {
    await ctx.close();
    throw new Error(`Not signed in (landed on ${page.url()}). Run: node login.mjs`);
  }
  return { ctx, page };
}

/** Web API call executed in the page. Returns parsed JSON or null. Throws on non-2xx. */
export async function webApi(page, method, url, body, extraHeaders = {}) {
  return page.evaluate(
    async ({ method, url, body, extraHeaders }) => {
      const r = await fetch(`/api/data/v9.2/${url}`, {
        method,
        headers: {
          'OData-MaxVersion': '4.0',
          'OData-Version': '4.0',
          Accept: 'application/json',
          'Content-Type': 'application/json; charset=utf-8',
          ...extraHeaders,
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        credentials: 'same-origin',
      });
      const text = await r.text();
      if (!r.ok) throw new Error(`${method} ${url}: ${r.status} ${text}`);
      const id = r.headers.get('OData-EntityId');
      return { data: text ? JSON.parse(text) : null, entityId: id };
    },
    { method, url, body, extraHeaders },
  );
}
