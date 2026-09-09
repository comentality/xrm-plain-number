// End to end in one browser: wait for the user to sign in (headed), then
// create the fixture form, publish, and take the screenshots. Writes
// shots/form-results.json when done, and shots/form-error.txt on failure.
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
try {
  ({ ctx, page: globalThis.page } = await openOrg({ waitForLogin: true, timeoutMs }));
  const page = globalThis.page;
  console.log('signed in at', new Date().toISOString());
  const setup = await setupForm(page);
  console.log('setup', JSON.stringify(setup));
  const result = await shootForm(page, setup);
  fs.writeFileSync(resultFile, JSON.stringify({ setup, ...result }, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (e) {
  fs.writeFileSync(errorFile, String(e?.stack ?? e));
  console.error(e);
  process.exitCode = 1;
} finally {
  if (ctx) await ctx.close().catch(() => {});
}
