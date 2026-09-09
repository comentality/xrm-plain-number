// Screenshots the control in the local PCF test harness (see harness-server.mjs):
// a year displayed, then a year typed in with a separator, which the control
// strips on commit.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const shots = path.join(here, 'shots');
fs.mkdirSync(shots, { recursive: true });
const base = process.env.HARNESS_URL ?? 'http://localhost:8182/';
const VALUE = Number(process.env.VALUE ?? 2024);

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 900, height: 700 }, deviceScaleFactor: 2 });
await p.goto(base, { waitUntil: 'load' });
const control = p.locator('[data-testid="plain-number"]');
await control.waitFor({ state: 'visible', timeout: 30000 });

const valueInput = p.locator('.property-inputs .io-item').filter({ hasText: 'value' }).locator('input[type=number]');
const setValue = async (v) => { await valueInput.fill(String(v)); await valueInput.dispatchEvent('change'); };

const results = {};
async function shot(name) {
  await p.waitForTimeout(500);
  results[name] = { text: await control.inputValue(), harnessValue: await valueInput.inputValue() };
  await p.locator('.control-container').first().screenshot({ path: path.join(shots, `harness-${name}.png`) });
  console.log(name.padEnd(10), JSON.stringify(results[name]));
}

await setValue(VALUE);
await shot('display');

// Type a year with a thousands separator and commit with Enter.
await control.click();
await control.fill('1,999');
await shot('typing');
await control.press('Enter');
await shot('committed');

await b.close();
fs.writeFileSync(path.join(shots, 'harness-results.json'), JSON.stringify(results, null, 2));
