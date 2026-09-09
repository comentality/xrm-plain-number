// Opens the e2e form on the test account and screenshots the three
// employee-count cells (full page, section, and a tight crop per cell).
import fs from 'node:fs';
import path from 'node:path';
import { openOrg, webApi, orgUrl, shotsDir } from './browser.mjs';

export async function shootForm(page, setup) {
  fs.mkdirSync(shotsDir, { recursive: true });
  const out = { shots: [] };

  let appId = process.env.APP_ID;
  if (!appId) {
    const apps = await webApi(page, 'GET', `appmodules?$select=appmoduleid,uniquename&$filter=statecode eq 0`);
    const pick =
      apps.data.value.find((a) => /NumberFormat/i.test(a.uniquename)) ??
      apps.data.value.find((a) => /EnvironmentSettings/i.test(a.uniquename)) ??
      apps.data.value[0];
    appId = pick.appmoduleid;
    out.app = pick.uniquename;
  }
  const url = `${orgUrl}/main.aspx?appid=${appId}&pagetype=entityrecord&etn=account&id=${setup.accountId}&formid=${setup.formId}`;
  out.url = url;
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  const value = page.locator('[data-testid="number-format-value"]');
  const errorDlg = page.locator('[data-id="errorDialog_subtitle"], [data-id="dialogSubtitle"], [data-id="errorDialogTitle"]');
  await Promise.race([
    value.first().waitFor({ state: 'visible', timeout: 120000 }),
    errorDlg.first().waitFor({ state: 'visible', timeout: 120000 }),
  ]).catch(() => {});
  await page.waitForTimeout(3000);
  const full = path.join(shotsDir, 'form-full.png');
  await page.screenshot({ path: full });
  out.shots.push(full);

  if (await errorDlg.count()) {
    out.error = (await errorDlg.first().innerText()).slice(0, 500);
  }

  const n = await value.count();
  out.instances = n;
  out.texts = [];
  for (let i = 0; i < n; i++) out.texts.push(await value.nth(i).inputValue());

  const fieldContainer = (loc) => loc.locator('xpath=ancestor::*[@data-id][contains(@data-id, "FieldSectionItemContainer")][1]');

  if (n > 0) {
    const section = page.locator('section').filter({ has: value.first() }).last();
    if (await section.count()) {
      const f = path.join(shotsDir, 'form-section.png');
      await section.screenshot({ path: f });
      out.shots.push(f);
    }
    for (let i = 0; i < n; i++) {
      const c = fieldContainer(value.nth(i));
      const f = path.join(shotsDir, `form-cell-${i + 1}.png`);
      await ((await c.count()) ? c : value.nth(i)).screenshot({ path: f });
      out.shots.push(f);
    }
  }
  const stock = page.locator('input[data-id$="numberofemployees.fieldControl-whole-number-text-input"]').first();
  if (await stock.count()) {
    out.stockText = await stock.inputValue();
    const c = fieldContainer(stock);
    const f = path.join(shotsDir, 'form-cell-stock.png');
    await ((await c.count()) ? c : stock).screenshot({ path: f });
    out.shots.push(f);
  }
  return out;
}

if (process.argv[1] && /shoot-form\.mjs$/.test(process.argv[1])) {
  const setup = JSON.parse(process.argv[2] ?? process.env.SETUP_JSON ?? '{}');
  if (!setup.formId || !setup.accountId) throw new Error('need formId and accountId from setup-form.mjs');
  const { ctx, page } = await openOrg({ headless: true });
  try { console.log(JSON.stringify(await shootForm(page, setup), null, 2)); } finally { await ctx.close(); }
}
