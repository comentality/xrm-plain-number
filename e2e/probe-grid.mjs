import { openOrg, orgUrl } from './browser.mjs';
const url = `${orgUrl}/main.aspx?appid=63bd689b-2995-f111-b8db-70a8a50f575d&pagetype=entitylist&etn=account&viewid=%7b00000000-0000-0000-00aa-000010001001%7d&viewtype=1039`;
const { ctx, page } = await openOrg({ headless: true });
const logs = [];
page.on('console', (m) => { const t = m.text(); if (/PlainNumber|customizer|fireEvent|Integer/i.test(t)) logs.push(m.type() + ': ' + t.slice(0, 300)); });
page.on('pageerror', (e) => logs.push('pageerror: ' + String(e).slice(0, 300)));
try {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const row = page.locator('[role="row"]:has-text("Plain Number E2E Co")').first();
  await row.waitFor({ state: 'visible', timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(8000);
  const cell = async () => (await row.locator('[role="gridcell"]').nth(2).innerText()).trim();
  const res = await page.evaluate(() => performance.getEntriesByType('resource').map((e) => e.name).filter((n) => /PlainNumber|customizer|cmtl_/i.test(n)));
  const ss = await page.evaluate(() => Object.keys(sessionStorage).filter((k) => /plainnumber/i.test(k)).map((k) => k + '=' + sessionStorage.getItem(k)));
  console.log(JSON.stringify({ before: await cell(), resources: res, sessionStorage: ss, plainCells: await page.locator('[data-testid="plain-number-cell"]').count() }));
  // Force re-render: sort by Founded twice.
  const header = page.locator('[role="columnheader"]:has-text("Founded")').first();
  await header.click().catch(() => {});
  await page.waitForTimeout(4000);
  await header.click().catch(() => {});
  await page.waitForTimeout(4000);
  console.log(JSON.stringify({ afterSort: await cell().catch(() => null), plainCells: await page.locator('[data-testid="plain-number-cell"]').count() }));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await row.waitFor({ state: 'visible', timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(8000);
  console.log(JSON.stringify({ afterReload: await cell().catch(() => null), plainCells: await page.locator('[data-testid="plain-number-cell"]').count() }));
  await page.screenshot({ path: 'shots/grid-probe.png' });
  console.log('LOGS', JSON.stringify(logs, null, 1));
} finally { await ctx.close(); }
