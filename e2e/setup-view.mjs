// Fixture for the view test: an Account system view "Plain Number E2E" with
// name and cmtl_founded, and Plain Number attached to the founded column in
// layoutxml the only schema-valid way (controlDescriptions under grid, with
// forControl naming the cell). Nothing documents a grid honouring this; that
// is what the test is for.
import { openOrg, webApi } from './browser.mjs';

const VIEW_NAME = 'Plain Number E2E';
const VIEW_ID = '0e2e0004-aaaa-4bbb-8ccc-000000000004';

export async function setupView(page, { ctrlName, column }) {
  const fetchxml =
    `<fetch version="1.0" output-format="xml-platform" mapping="logical" distinct="false">` +
    `<entity name="account"><attribute name="name" /><attribute name="${column}" /><attribute name="accountid" />` +
    `<order attribute="name" descending="false" /><filter type="and"><condition attribute="${column}" operator="not-null" /></filter>` +
    `</entity></fetch>`;
  const layoutxml =
    `<grid name="resultset" object="1" jump="name" select="1" icon="1" preview="1">` +
    `<row name="result" id="accountid"><cell name="name" width="300" /><cell name="${column}" width="150" /></row>` +
    `<controlDescriptions><controlDescription forControl="${column}">` +
    `<customControl name="${ctrlName}" formFactor="0"><parameters><value>${column}</value></parameters></customControl>` +
    `<customControl name="${ctrlName}" formFactor="1"><parameters><value>${column}</value></parameters></customControl>` +
    `<customControl name="${ctrlName}" formFactor="2"><parameters><value>${column}</value></parameters></customControl>` +
    `</controlDescription></controlDescriptions>` +
    `</grid>`;

  const existing = await webApi(page, 'GET', `savedqueries?$select=savedqueryid&$filter=name eq '${VIEW_NAME}' and returnedtypecode eq 'account'`);
  let viewId;
  if (existing.data.value.length) {
    viewId = existing.data.value[0].savedqueryid;
    await webApi(page, 'PATCH', `savedqueries(${viewId})`, { fetchxml, layoutxml });
  } else {
    await webApi(page, 'POST', 'savedqueries', {
      savedqueryid: VIEW_ID,
      name: VIEW_NAME,
      description: 'xrm-plain-number e2e fixture: field PCF on a view column',
      returnedtypecode: 'account',
      querytype: 0,
      fetchxml,
      layoutxml,
    });
    viewId = VIEW_ID;
  }
  await webApi(page, 'POST', 'PublishXml', { ParameterXml: '<importexportxml><entities><entity>account</entity></entities></importexportxml>' });
  return { viewId };
}

if (process.argv[1] && /setup-view\.mjs$/.test(process.argv[1])) {
  const setup = JSON.parse(process.argv[2] ?? '{}');
  const { ctx, page } = await openOrg({ headless: true });
  try { console.log(JSON.stringify(await setupView(page, setup))); } finally { await ctx.close(); }
}
