// Opens the e2e form on the test account, screenshots the two Founded cells
// (stock control vs Plain Number), then types a new year into Plain Number
// and checks the stock control follows.
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
      apps.data.value.find((a) => /PlainNumber/i.test(a.uniquename)) ??
      apps.data.value.find((a) => /EnvironmentSettings/i.test(a.uniquename)) ??
      apps.data.value[0];
    appId = pick.appmoduleid;
    out.app = pick.uniquename;
  }
  const record = `pagetype=entityrecord&etn=account&id=${setup.accountId}&formid=${setup.formId}`;
  const urls = [`${orgUrl}/main.aspx?appid=${appId}&${record}`, `${orgUrl}/main.aspx?${record}`];
  const plain = page.locator('[data-testid="plain-number"]');
  const errorDlg = page.locator('[data-id="errorDialog_subtitle"], [data-id="dialogSubtitle"], [data-id="errorDialogTitle"]');
  out.attempts = [];
  let n = 0;
  for (const url of urls) {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await Promise.race([
      plain.first().waitFor({ state: 'visible', timeout: 120000 }),
      errorDlg.first().waitFor({ state: 'visible', timeout: 120000 }),
    ]).catch(() => {});
    await page.waitForTimeout(3000);
    n = await plain.count();
    const attempt = { url, instances: n, finalUrl: page.url() };
    if (await errorDlg.count()) attempt.error = (await errorDlg.first().innerText()).slice(0, 500);
    out.attempts.push(attempt);
    const full = path.join(shotsDir, `form-full-${out.attempts.length}.png`);
    await page.screenshot({ path: full });
    out.shots.push(full);
    if (n > 0) break;
  }
  out.url = out.attempts[out.attempts.length - 1].url;
  out.instances = n;
  if (n === 0) return out;

  const fieldContainer = (loc) => loc.locator('xpath=ancestor::*[@data-id][contains(@data-id, "FieldSectionItemContainer")][1]');
  const stock = page.locator(`input[data-id$="${setup.column}.fieldControl-whole-number-text-input"]`).first();

  const snap = async (tag) => {
    const r = { plain: await plain.first().inputValue(), stock: (await stock.count()) ? await stock.inputValue() : null };
    const section = page.locator('section').filter({ has: plain.first() }).last();
    const target = (await section.count()) ? section : page;
    const f = path.join(shotsDir, `form-${tag}.png`);
    await target.screenshot({ path: f });
    out.shots.push(f);
    for (const [name, loc] of [['plain', plain.first()], ['stock', stock]]) {
      if (!(await loc.count())) continue;
      const c = fieldContainer(loc);
      const cf = path.join(shotsDir, `form-${tag}-${name}.png`);
      await ((await c.count()) ? c : loc).screenshot({ path: cf });
      out.shots.push(cf);
    }
    return r;
  };

  out.display = await snap('display');

  // Edit: type a year into Plain Number, commit with Enter, expect the stock control to follow.
  await plain.first().click();
  await plain.first().fill('1999');
  await plain.first().press('Enter');
  await page.waitForTimeout(2000);
  out.afterEdit = await snap('edited');

  return out;
}

if (process.argv[1] && /shoot-form\.mjs$/.test(process.argv[1])) {
  const setup = JSON.parse(process.argv[2] ?? process.env.SETUP_JSON ?? '{}');
  if (!setup.formId || !setup.accountId) throw new Error('need formId and accountId from setup-form.mjs');
  const { ctx, page } = await openOrg({ headless: true });
  try { console.log(JSON.stringify(await shootForm(page, setup), null, 2)); } finally { await ctx.close(); }
}
