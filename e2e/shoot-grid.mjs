// Opens the default Account view with client caches cleared and records how
// the Founded cell renders for the test account, plus a screenshot of the row.
import fs from 'node:fs';
import path from 'node:path';
import { openOrg, webApi, orgUrl, shotsDir } from './browser.mjs';

const ACCOUNT = 'Plain Number E2E Co';

export async function shootGrid(page, { viewId, column, appId, tag = 'grid' }) {
  fs.mkdirSync(shotsDir, { recursive: true });
  const out = { shots: [] };
  if (!appId) {
    const apps = await webApi(page, 'GET', `appmodules?$select=appmoduleid,uniquename&$filter=statecode eq 0`);
    appId = (apps.data.value.find((a) => /EnvironmentSettings/i.test(a.uniquename)) ?? apps.data.value[0]).appmoduleid;
  }
  // Drop the client's metadata caches so a freshly published view layout is used.
  await page.evaluate(async () => {
    try { localStorage.clear(); sessionStorage.clear(); } catch {}
    try { const dbs = await indexedDB.databases(); await Promise.all(dbs.map((d) => new Promise((r) => { const q = indexedDB.deleteDatabase(d.name); q.onsuccess = q.onerror = q.onblocked = () => r(); }))); } catch {}
    try { const keys = await caches.keys(); await Promise.all(keys.map((k) => caches.delete(k))); } catch {}
  });
  const url = `${orgUrl}/main.aspx?appid=${appId}&pagetype=entitylist&etn=account&viewid=%7b${viewId}%7d&viewtype=1039`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const row = page.locator(`[role="row"]:has-text("${ACCOUNT}")`).first();
  await row.waitFor({ state: 'visible', timeout: 120000 }).catch(() => {});
  await page.waitForTimeout(5000);
  out.finalUrl = page.url();
  out.headers = [];
  const h = page.locator('[role="columnheader"]');
  for (let i = 0; i < (await h.count()); i++) out.headers.push((await h.nth(i).innerText()).replace(/\s+/g, ' ').trim());
  out.rowFound = (await row.count()) > 0;
  if (out.rowFound) {
    await row.scrollIntoViewIfNeeded().catch(() => {});
    out.cells = [];
    const c = row.locator('[role="gridcell"]');
    for (let i = 0; i < (await c.count()); i++) out.cells.push((await c.nth(i).innerText()).replace(/\s+/g, ' ').trim());
    const idx = out.headers.findIndex((x) => /^Founded/i.test(x));
    out.foundedHeaderIndex = idx;
    out.foundedCell = idx >= 0 ? out.cells[idx] : null;
    out.plainCellsInGrid = await page.locator('[data-testid="plain-number-cell"]').count();
    const rowShot = path.join(shotsDir, `${tag}-row.png`);
    await row.screenshot({ path: rowShot });
    out.shots.push(rowShot);
  }
  const full = path.join(shotsDir, `${tag}-full.png`);
  await page.screenshot({ path: full });
  out.shots.push(full);
  const grid = page.locator('[role="grid"]').first();
  if (await grid.count()) {
    const g = path.join(shotsDir, `${tag}-grid.png`);
    await grid.screenshot({ path: g });
    out.shots.push(g);
  }
  return out;
}

if (process.argv[1] && /shoot-grid\.mjs$/.test(process.argv[1])) {
  const setup = JSON.parse(process.argv[2] ?? '{"viewId":"00000000-0000-0000-00aa-000010001001","column":"cmtl_founded"}');
  const { ctx, page } = await openOrg({ headless: true });
  try { console.log(JSON.stringify(await shootGrid(page, setup), null, 2)); } finally { await ctx.close(); }
}
