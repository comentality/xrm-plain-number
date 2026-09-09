// Screenshots the control in the local PCF test harness (see harness-server.mjs)
// in three configurations: user separator, none, custom emoji.
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const shots = path.join(here, 'shots');
fs.mkdirSync(shots, { recursive: true });
const base = process.env.HARNESS_URL ?? 'http://localhost:8182/';
const VALUE = Number(process.env.VALUE ?? 1234567);
const EMOJI = process.env.EMOJI ?? '🍕';

const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1300, height: 800 }, deviceScaleFactor: 2 });
await p.goto(base, { waitUntil: 'load' });
const control = p.locator('[data-testid="number-format-value"]');
await control.waitFor({ state: 'visible', timeout: 30000 });

const item = (name) => p.locator('.property-inputs .io-item').filter({ hasText: name });
const setValue = async (v) => { const i = item('value').locator('input[type=number]'); await i.fill(String(v)); await i.dispatchEvent('change'); };
const setMode = async (m) => { await item('separatorMode').locator('select').selectOption(m); };
const setSep = async (s) => { const i = item('groupSeparator').locator('input[type=text]'); await i.fill(s); await i.dispatchEvent('change'); };

const results = {};
async function shot(name) {
  await p.waitForTimeout(600);
  const text = await control.inputValue();
  results[name] = text;
  await p.locator('.control-container').first().screenshot({ path: path.join(shots, `harness-${name}.png`) });
  console.log(name.padEnd(8), JSON.stringify(text));
}

await setValue(VALUE);
await setMode('user');
await shot('user');
await setMode('none');
await shot('none');
await setMode('custom');
await setSep(EMOJI);
await shot('emoji');

await b.close();
fs.writeFileSync(path.join(shots, 'harness-results.json'), JSON.stringify(results, null, 2));
