// Opens the e2e form on the test account and screenshots the three
// employee-count cells (full section plus a tight crop per cell).
// Usage: node shoot-form.mjs '<json from setup-form.mjs>'  (or env SETUP_JSON)
import fs from 'node:fs';
import path from 'node:path';
import { openOrg, webApi, orgUrl, shotsDir } from './browser.mjs';

const setup = JSON.parse(process.argv[2] ?? process.env.SETUP_JSON ?? '{}');
if (!setup.formId || !setup.accountId) throw new Error('need formId and accountId from setup-form.mjs');
fs.mkdirSync(shotsDir, { recursive: true });

const { ctx, page } = await openOrg({ headless: true });
try {
  // Any app that opens account records will do; prefer one the env has.
  let appId = process.env.APP_ID;
  if (!appId) {
    const apps = await webApi(page, 'GET', `appmodules?$select=appmoduleid,uniquename&$filter=statecode eq 0`);
    const pick = apps.data.value.find((a) => /NumberFormat/i.test(a.uniquename)) ?? apps.data.value.find((a) => /EnvironmentSettings/i.test(a.uniquename)) ?? apps.data.value[0];
    appId = pick.appmoduleid;
    console.log('using app', pick.uniquename);
  }
  const url = `${orgUrl}/main.aspx?appid=${appId}&pagetype=entityrecord&etn=account&id=${setup.accountId}&formid=${setup.formId}`;
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  // Wait for the form to render our control, or for an error dialog.
  const value = page.locator('[data-testid="number-format-value"]');
  await Promise.race([
    value.first().waitFor({ state: 'visible', timeout: 90000 }),
    page.locator('[data-id="errorDialog_subtitle"], [data-id="dialogSubtitle"]').first().waitFor({ state: 'visible', timeout: 90000 }),
  ]);
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(shotsDir, 'form-full.png') });

  const n = await value.count();
  console.log('NumberFormat instances rendered:', n);
  const texts = [];
  for (let i = 0; i < n; i++) texts.push(await value.nth(i).inputValue());
  console.log('rendered texts:', JSON.stringify(texts));

  // Section crop: the container that holds all three rows.
  const section = page.locator('section, [data-id^="numbers"], [role="region"]').filter({ has: value.first() }).first();
  if (await section.count()) await section.screenshot({ path: path.join(shotsDir, 'form-section.png') });

  // Per-cell crops: the field container (label + control) around each instance.
  for (let i = 0; i < n; i++) {
    const cell = value.nth(i).locator('xpath=ancestor::*[@data-id][contains(@data-id, "-FieldSectionItemContainer")][1]');
    const target = (await cell.count()) ? cell : value.nth(i);
    await target.screenshot({ path: path.join(shotsDir, `form-cell-${i + 1}.png`) });
  }
  // Stock control for comparison.
  const stock = page.locator('[data-id="numberofemployees.fieldControl-whole-number-text-input"]').first();
  if (await stock.count()) {
    const stockCell = stock.locator('xpath=ancestor::*[@data-id][contains(@data-id, "-FieldSectionItemContainer")][1]');
    await ((await stockCell.count()) ? stockCell : stock).screenshot({ path: path.join(shotsDir, 'form-cell-stock.png') });
    console.log('stock text:', JSON.stringify(await stock.inputValue()));
  }
  console.log('shots in', shotsDir);
} finally {
  await ctx.close();
}
