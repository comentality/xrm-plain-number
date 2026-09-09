// End to end in one browser: wait for the user to sign in (headed), then
// create the fixture column and form, screenshot the form and check editing.
// Writes shots/form-results.json when done, shots/form-error.txt on failure.
// The view side was probed separately; see probe-view-column-control.mjs.
import fs from 'node:fs';
import path from 'node:path';
import { openOrg, shotsDir } from './browser.mjs';
import { setupForm } from './setup-form.mjs';
import { shootForm } from './shoot-form.mjs';

fs.mkdirSync(shotsDir, { recursive: true });
const resultFile = path.join(shotsDir, 'form-results.json');
const errorFile = path.join(shotsDir, 'form-error.txt');
for (const f of [resultFile, errorFile]) if (fs.existsSync(f)) fs.unlinkSync(f);

const timeoutMs = Number(process.env.LOGIN_TIMEOUT_MS ?? 12 * 60 * 60 * 1000);
let ctx;
const result = {};
try {
  let page;
  ({ ctx, page } = await openOrg({ waitForLogin: true, timeoutMs }));
  console.log('signed in at', new Date().toISOString());
  result.setup = await setupForm(page);
  console.log('setup', JSON.stringify(result.setup));
  result.form = await shootForm(page, result.setup);
  console.log('form', JSON.stringify(result.form));
  fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
} catch (e) {
  fs.writeFileSync(errorFile, String(e?.stack ?? e) + '\n' + JSON.stringify(result, null, 2));
  console.error(e);
  process.exitCode = 1;
} finally {
  if (ctx) await ctx.close().catch(() => {});
}
