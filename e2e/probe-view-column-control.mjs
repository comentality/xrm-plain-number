// PROBE, run once on 2026-09-09. Result: the server rejects a field control bound
// to a view column ("Property cmtl_founded is bound to an attribute in
// non-existent entity"). Views only accept dataset-level controls. Kept as
// evidence; it patches the default Account view and restores it in finally.
// Tests a column-bound field PCF in the default Account view, then restores it.
import fs from 'node:fs';
import { openOrg, webApi, orgUrl } from './browser.mjs';
const VIEW = '00000000-0000-0000-00aa-000010001001'; // My Active Accounts
const APP = '63bd689b-2995-f111-b8db-70a8a50f575d';
const url = `${orgUrl}/main.aspx?appid=${APP}&pagetype=entitylist&etn=account&viewid=%7b${VIEW}%7d&viewtype=1039`;
const publish = (p) => webApi(p, 'POST', 'PublishXml', { ParameterXml: '<importexportxml><entities><entity>account</entity></entities></importexportxml>' });
const ctrl = `<controlDescriptions><controlDescription forControl="cmtl_founded"><customControl name="cmtl_KK.PlainNumber" formFactor="0"><parameters><value>cmtl_founded</value></parameters></customControl><customControl name="cmtl_KK.PlainNumber" formFactor="1"><parameters><value>cmtl_founded</value></parameters></customControl><customControl name="cmtl_KK.PlainNumber" formFactor="2"><parameters><value>cmtl_founded</value></parameters></customControl></controlDescription></controlDescriptions>`;
const { ctx, page } = await openOrg({ headless: true });
const orig = (await webApi(page, 'GET', `savedqueries(${VIEW})?$select=fetchxml,layoutxml`)).data;
fs.writeFileSync('shots/my-active-accounts.backup.json', JSON.stringify(orig, null, 2));
try {
  const fetchxml = orig.fetchxml.includes('cmtl_founded') ? orig.fetchxml : orig.fetchxml.replace('<attribute name="name" />', '<attribute name="name" /><attribute name="cmtl_founded" />');
  const layoutPlain = orig.layoutxml.replace('<cell name="name" width="300" />', '<cell name="name" width="300" /><cell name="cmtl_founded" width="120" />');
  const layoutCtrl = layoutPlain.replace('</grid>', ctrl + '</grid>');
  if (!fetchxml.includes('cmtl_founded') || !layoutPlain.includes('cmtl_founded')) throw new Error('could not inject column: ' + orig.fetchxml.slice(0, 200));
  for (const [tag, layoutxml] of [['plain', layoutPlain], ['withControl', layoutCtrl]]) {
    await webApi(page, 'PATCH', `savedqueries(${VIEW})`, { fetchxml, layoutxml });
    await publish(page);
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(12000);
    const row = page.locator('[role="row"]:has-text("Plain Number E2E Co")').first();
    await row.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(1500);
    let cells = null;
    if (await row.count()) { cells = []; const c = row.locator('[role="gridcell"]'); for (let i = 0; i < await c.count(); i++) cells.push((await c.nth(i).innerText()).replace(/\s+/g,' ').trim()); }
    const headers = [];
    const h = page.locator('[role="columnheader"]'); for (let i = 0; i < await h.count(); i++) headers.push((await h.nth(i).innerText()).replace(/\s+/g,' ').trim());
    const pcf = await page.locator('[data-testid="plain-number"]').count();
    const errs = await page.locator('[data-id="errorDialog_subtitle"], [data-id="dialogSubtitle"]').allInnerTexts().catch(() => []);
    console.log(JSON.stringify({ tag, onOurView: page.url().toLowerCase().includes(VIEW), headers, cells, pcf, errs }));
    await page.screenshot({ path: `shots/view-probe-${tag}.png` });
    if (await row.count()) await row.screenshot({ path: `shots/view-probe-${tag}-row.png` });
  }
} finally {
  await webApi(page, 'PATCH', `savedqueries(${VIEW})`, { fetchxml: orig.fetchxml, layoutxml: orig.layoutxml });
  await publish(page);
  const back = (await webApi(page, 'GET', `savedqueries(${VIEW})?$select=layoutxml`)).data.layoutxml;
  console.log('restored:', back === orig.layoutxml);
  await ctx.close();
}
