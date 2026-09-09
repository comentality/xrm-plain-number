// Minimal Dataverse Web API client for e2e setup.
// Auth: client credentials from a .env file (never printed). Looks for
// ./.env first, then the sibling xrm-events-2-code fixture .env.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function loadEnv() {
  const candidates = [
    path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '.env'),
    path.join(os.homedir(), 'Code', 'xrm-events-2-code', 'tests', 'e2e-fixtures', '.env'),
  ];
  for (const f of candidates) {
    if (!fs.existsSync(f)) continue;
    const env = {};
    for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*"?([^"]*)"?\s*$/);
      if (m) env[m[1]] = m[2];
    }
    if (env.DATAVERSE_URL && env.CLIENT_ID && env.CLIENT_SECRET && env.TENANT_ID) return env;
  }
  throw new Error('No .env with DATAVERSE_URL/TENANT_ID/CLIENT_ID/CLIENT_SECRET found');
}

const env = loadEnv();
export const orgUrl = env.DATAVERSE_URL.replace(/\/$/, '');
let token = null;

async function getToken() {
  if (token) return token;
  const body = new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: env.CLIENT_ID,
    client_secret: env.CLIENT_SECRET,
    scope: `${orgUrl}/.default`,
  });
  const r = await fetch(`https://login.microsoftonline.com/${env.TENANT_ID}/oauth2/v2.0/token`, { method: 'POST', body });
  if (!r.ok) throw new Error(`token: ${r.status} ${await r.text()}`);
  token = (await r.json()).access_token;
  return token;
}

export async function api(method, url, body, extraHeaders = {}) {
  const t = await getToken();
  const full = url.startsWith('http') ? url : `${orgUrl}/api/data/v9.2/${url}`;
  const r = await fetch(full, {
    method,
    headers: {
      Authorization: `Bearer ${t}`,
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Accept: 'application/json',
      'Content-Type': 'application/json; charset=utf-8',
      ...extraHeaders,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await r.text();
  if (!r.ok) throw new Error(`${method} ${url}: ${r.status} ${text}`);
  return { status: r.status, headers: r.headers, data: text ? JSON.parse(text) : null };
}

export const get = (url, h) => api('GET', url, undefined, h).then((x) => x.data);
export const post = (url, body, h) => api('POST', url, body, h);
export const patch = (url, body, h) => api('PATCH', url, body, h);
export const del = (url) => api('DELETE', url);

export async function publishAll() {
  await post('PublishAllXml', {});
}

if (process.argv[1] && process.argv[1].endsWith('dv.mjs')) {
  const who = await get('WhoAmI');
  console.log('WhoAmI ok, user', who.UserId, 'org', orgUrl);
}
