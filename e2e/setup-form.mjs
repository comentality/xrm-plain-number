// Creates (or replaces) an Account main form "Number Format E2E" that shows
// numberofemployees three ways: stock control, NumberFormat with no separator,
// NumberFormat with an emoji separator. Then publishes and sets a test value.
import { openOrg, webApi } from './browser.mjs';

const FORM_NAME = 'Number Format E2E';
const FORM_ID = '0e2e0002-aaaa-4bbb-8ccc-000000000002';
const TEST_ACCOUNT_NAME = 'Number Format E2E Co';
const TEST_VALUE = 1234567;
const EMOJI = process.env.EMOJI ?? '🍕';

export async function setupForm(page) {
  // 1. Registered control name (whatever pac pcf push produced).
  const cc = await webApi(page, 'GET', `customcontrols?$select=name,version&$filter=contains(name,'NumberFormat')`);
  const control = cc.data.value.find((c) => /KK\.NumberFormat$/.test(c.name)) ?? cc.data.value[0];
  if (!control) throw new Error('KK.NumberFormat is not registered in the env; run pac pcf push first');
  const ctrlName = control.name;

  // 2. Build the form XML.
  const cellId = (n) => `{0e2e4${n}00-aaaa-4bbb-8ccc-0000000000${n}0}`;
  const ctrlId = (n) => `{0e2e5${n}00-aaaa-4bbb-8ccc-0000000000${n}1}`;
  const INT_CLASSID = '{C6D124CA-7EDA-4a60-AEA9-7FB8D318B68F}';
  const TEXT_CLASSID = '{4273EDBD-AC1D-40d3-9FB2-095C621B552D}';
  const cell = (n, label, controlId) =>
    `<cell id="${cellId(n)}" showlabel="true" locklevel="0"><labels><label description="${label}" languagecode="1033" /></labels>` +
    `<control id="${controlId}" classid="${INT_CLASSID}" datafieldname="numberofemployees" disabled="false" uniqueid="${controlId}" /></cell>`;
  const desc = (n, mode, sep) =>
    `<controlDescription forControl="${ctrlId(n)}">` +
    `<customControl formFactor="2" name="${ctrlName}"><parameters><value>numberofemployees</value>` +
    `<separatorMode static="true" type="Enum">${mode}</separatorMode>` +
    (sep !== undefined ? `<groupSeparator static="true" type="SingleLine.Text">${sep}</groupSeparator>` : '') +
    `</parameters></customControl></controlDescription>`;

  const formxml =
    `<form showImage="true">` +
    `<tabs><tab name="general" id="{0e2e6000-aaaa-4bbb-8ccc-000000000060}" IsUserDefined="0" verticallayout="true" showlabel="true" expanded="true" locklevel="0">` +
    `<labels><label description="General" languagecode="1033" /></labels><columns><column width="100%"><sections>` +
    `<section name="numbers" id="{0e2e6100-aaaa-4bbb-8ccc-000000000061}" showlabel="true" showbar="false" IsUserDefined="0" layout="varwidth" columns="1" labelwidth="180" celllabelposition="Left" locklevel="0">` +
    `<labels><label description="Employees, three ways" languagecode="1033" /></labels><rows>` +
    `<row><cell id="{0e2e4000-aaaa-4bbb-8ccc-000000000040}" showlabel="true" locklevel="0"><labels><label description="Account Name" languagecode="1033" /></labels><control id="name" classid="${TEXT_CLASSID}" datafieldname="name" disabled="false" /></cell></row>` +
    `<row>${cell(1, 'Stock control', 'numberofemployees')}</row>` +
    `<row>${cell(2, 'No separator', ctrlId(2))}</row>` +
    `<row>${cell(3, `Emoji separator ${EMOJI}`, ctrlId(3))}</row>` +
    `</rows></section></sections></column></columns></tab></tabs>` +
    `<controlDescriptions>${desc(2, 'none')}${desc(3, 'custom', EMOJI)}</controlDescriptions>` +
    `</form>`;

  // 3. Create or update the form.
  const existing = await webApi(page, 'GET', `systemforms?$select=formid&$filter=name eq '${FORM_NAME}' and objecttypecode eq 'account'`);
  let formId;
  if (existing.data.value.length) {
    formId = existing.data.value[0].formid;
    await webApi(page, 'PATCH', `systemforms(${formId})`, { formxml });
  } else {
    await webApi(page, 'POST', 'systemforms', {
      formid: FORM_ID,
      name: FORM_NAME,
      description: 'xrm-number-format e2e fixture',
      objecttypecode: 'account',
      type: 2,
      formxml,
      formactivationstate: 1,
    });
    formId = FORM_ID;
  }

  // 4. Publish account customisations.
  await webApi(page, 'POST', 'PublishXml', { ParameterXml: '<importexportxml><entities><entity>account</entity></entities></importexportxml>' });

  // 5. Test record.
  const acc = await webApi(page, 'GET', `accounts?$select=accountid&$filter=name eq '${TEST_ACCOUNT_NAME}'`);
  let accountId;
  if (acc.data.value.length) {
    accountId = acc.data.value[0].accountid;
    await webApi(page, 'PATCH', `accounts(${accountId})`, { numberofemployees: TEST_VALUE });
  } else {
    const r = await webApi(page, 'POST', 'accounts', { name: TEST_ACCOUNT_NAME, numberofemployees: TEST_VALUE });
    accountId = r.entityId.match(/\(([^)]+)\)/)[1];
  }

  return { ctrlName, formId, accountId, value: TEST_VALUE, emoji: EMOJI };
}

if (process.argv[1] && /setup-form\.mjs$/.test(process.argv[1])) {
  const { ctx, page } = await openOrg({ headless: true });
  try { console.log(JSON.stringify(await setupForm(page))); } finally { await ctx.close(); }
}
