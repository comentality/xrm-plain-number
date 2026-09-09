// Opens the e2e view and records how the Founded cell renders for the test
// account: the cell text, whether the Plain Number DOM is present anywhere in
// the grid, and which grid control the page used.
import fs from 'node:fs';
import path from 'node:path';
import { openOrg, webApi, orgUrl, shotsDir } from './browser.mjs';

export async function shootView(page, { viewId, accountName, appId }) {
  fs.mkdirSync(shotsDir, { recursive: true });
  const out = { shots: [] };
  if (!appId) {
    const apps = await webApi(page, 'GET', `appmodules?$select=appmoduleid,uniquename&$filter=statecode eq 0`);
    const pick = apps.data.value.find((a) => /EnvironmentSettings/i.test(a.uniquename)) ?? apps.data.value[0];
    appId = pick.appmoduleid;
  }
  const list = `pagetype=entitylist&etn=account&viewid=%7b${viewId}%7d&viewtype=1039`;
  const urls = [`${orgUrl}/main.aspx?appid=${appId}&${list}`, `${orgUrl}/main.aspx?${list}`];
  const rowLink = page.locator(`a[aria-label="${accountName}"], [role="row"]:has-text("${accountName}")`).first();
  const errorDlg = page.locator('[data-id="errorDialog_subtitle"], [data-id="dialogSubtitle"], [data-id="errorDialogTitle"]');
  out.attempts = [];
  let found = false;
  for (const url of urls) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await Promise.race([
      rowLink.waitFor({ state: 'visible', timeout: 120000 }),
      errorDlg.first().waitFor({ state: 'visible', timeout: 120000 }),
    ]).catch(() => {});
    await page.waitForTimeout(4000);
    found = (await rowLink.count()) > 0;
    const attempt = { url, rowFound: found, finalUrl: page.url() };
    if (await errorDlg.count()) attempt.error = (await errorDlg.first().innerText()).slice(0, 500);
    out.attempts.push(attempt);
    const full = path.join(shotsDir, `view-full-${out.attempts.length}.png`);
    await page.screenshot({ path: full });
    out.shots.push(full);
    if (found) break;
  }
  if (!found) return out;

  const row = page.locator(`[role="row"]:has-text("${accountName}")`).first();
  out.rowText = (await row.innerText()).replace(/\s+/g, ' ').trim();
  const cells = row.locator('[role="gridcell"]');
  out.cellTexts = [];
  for (let i = 0; i < (await cells.count()); i++) out.cellTexts.push((await cells.nth(i).innerText()).trim());
  out.plainNumberInGrid = await page.locator('[data-testid="plain-number"]').count();
  out.gridKind = await page.evaluate(() => {
    const hits = [];
    for (const sel of ['[data-lp-id*="PowerAppsOneGrid"]', '[data-lp-id*="PCFGridControl"]', '[data-lp-id*="Grid.GridControl"]', '[data-lp-id*="PlainNumber"]']) {
      if (document.querySelector(sel)) hits.push(sel);
    }
    return hits;
  });
  const rowShot = path.join(shotsDir, 'view-row.png');
  await row.screenshot({ path: rowShot });
  out.shots.push(rowShot);
  const grid = page.locator('[role="grid"]').first();
  if (await grid.count()) {
    const g = path.join(shotsDir, 'view-grid.png');
    await grid.screenshot({ path: g });
    out.shots.push(g);
  }
  return out;
}

if (process.argv[1] && /shoot-view\.mjs$/.test(process.argv[1])) {
  const setup = JSON.parse(process.argv[2] ?? '{}');
  const { ctx, page } = await openOrg({ headless: true });
  try { console.log(JSON.stringify(await shootView(page, setup), null, 2)); } finally { await ctx.close(); }
}
