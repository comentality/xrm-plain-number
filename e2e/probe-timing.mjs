// Kept as evidence, not tooling; ids are from the test env.
// PROBE: what the customizer's form query costs on view load. Run on 2026-09-09.
import { openOrg, webApi, orgUrl } from './browser.mjs';
const APP = '63bd689b-2995-f111-b8db-70a8a50f575d', VIEW = '00000000-0000-0000-00aa-000010001001';
const url = `${orgUrl}/main.aspx?appid=${APP}&pagetype=entitylist&etn=account&viewid=%7b${VIEW}%7d&viewtype=1039`;
const QUERY = "systemforms?$select=objecttypecode,formxml&$filter=type eq 2 and contains(formxml,'KK.PlainNumber')";
const publish = (p) => webApi(p, 'POST', 'PublishXml', { ParameterXml: '<importexportxml><entities><entity>account</entity></entities></importexportxml>' });
const clearCaches = async (page) => { await page.goto(`${orgUrl}/api/data/v9.2/WhoAmI`, { waitUntil: 'domcontentloaded' }); return page.evaluate(async () => {
  try { localStorage.clear(); sessionStorage.clear(); } catch {}
  try { const dbs = await indexedDB.databases(); await Promise.all(dbs.map((d) => new Promise((r) => { const q = indexedDB.deleteDatabase(d.name); q.onsuccess = q.onerror = q.onblocked = () => r(); }))); } catch {}
  try { const keys = await caches.keys(); await Promise.all(keys.map((k) => caches.delete(k))); } catch {}
}); };

const step = (m) => console.log(new Date().toISOString().slice(11,19), 'STEP', m);
const withTimeout = (p, ms, what) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout ' + what)), ms))]);
const { ctx, page } = await openOrg({ headless: true });
try {
  // 1. The query alone, from inside the page, 5 times.
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000);
  const q = await page.evaluate(async (QUERY) => {
    const out = [];
    for (let i = 0; i < 5; i++) {
      const t0 = performance.now();
      const r = await fetch('/api/data/v9.2/' + QUERY, { headers: { Accept: 'application/json', 'OData-MaxVersion': '4.0', 'OData-Version': '4.0' } });
      const text = await r.text();
      out.push({ ms: Math.round(performance.now() - t0), bytes: text.length, forms: JSON.parse(text).value.length });
    }
    return out;
  }, QUERY);
  console.log('QUERY', JSON.stringify(q));

  // 2. View load with vs without the customizer, cold (caches cleared) and warm.
  const cfg = (await webApi(page, 'GET', `customcontroldefaultconfigs?$select=customcontroldefaultconfigid,controldescriptionxml&$filter=primaryentitytypecode eq 'account'`)).data.value[0];
  const withXml = cfg.controldescriptionxml;
  const measure = async (label, cold) => {
    if (cold) { step('clear (cold)'); await withTimeout(clearCaches(page), 30000, 'clear'); }
    step('goto ' + label + (cold ? ' cold' : ' warm'));
    const t0 = Date.now();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    const row = page.locator('[role="row"]:has-text("Plain Number E2E Co")').first();
    const ok = await row.waitFor({ state: 'visible', timeout: 90000 }).then(() => true).catch(() => false);
    const tRow = Date.now() - t0;
    if (!ok) return { label, cold, tRow: null, error: 'row not visible in 90s', url: page.url() };
    let tPlain = null;
    const cell = row.locator('[role="gridcell"]').nth(2);
    for (let i = 0; i < 100; i++) { if ((await cell.innerText().catch(() => '')).trim() === '2024') { tPlain = Date.now() - t0; break; } await page.waitForTimeout(100); }
    const res = await page.evaluate(() => performance.getEntriesByType('resource').filter((e) => /systemforms/.test(e.name)).map((e) => ({ ms: Math.round(e.duration), start: Math.round(e.startTime), bytes: e.transferSize })));
    const nav = await page.evaluate(() => { const n = performance.getEntriesByType('navigation')[0]; return n ? Math.round(n.domContentLoadedEventEnd) : null; });
    return { label, cold, tRow, tPlain, repaintDelay: tPlain !== null ? tPlain - tRow : null, formsQuery: res, domContentLoaded: nav };
  };
  const results = [];
  for (const [label, xml] of [['with', withXml], ['without', '<controlDescriptions />'], ['with', withXml]]) {
    step('patch ' + label); await withTimeout(webApi(page, 'PATCH', `customcontroldefaultconfigs(${cfg.customcontroldefaultconfigid})`, { controldescriptionxml: xml }), 60000, 'patch');
    step('publish'); await withTimeout(publish(page), 180000, 'publish');
    step('clear'); await withTimeout(clearCaches(page), 30000, 'clear');
    for (const cold of [true, true, false]) { const r = await measure(label, cold); results.push(r); console.log(JSON.stringify(r)); }
  }
  console.log('RESULTS', JSON.stringify(results));
} finally { await ctx.close(); }
