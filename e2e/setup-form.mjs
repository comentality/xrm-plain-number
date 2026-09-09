// Fixture for the env e2e: a Whole Number column "Founded" on Account, and an
// Account main form "Plain Number E2E" that shows it twice, stock control and
// PlainNumber. Publishes and sets a test value.
import { openOrg, webApi } from './browser.mjs';

const FORM_NAME = 'Plain Number E2E';
const FORM_ID = '0e2e0003-aaaa-4bbb-8ccc-000000000003';
const COLUMN = 'cmtl_founded';
const TEST_ACCOUNT_NAME = 'Plain Number E2E Co';
const TEST_VALUE = Number(process.env.VALUE ?? 2024);

export async function setupForm(page) {
  // 1. Registered control name.
  const cc = await webApi(page, 'GET', `customcontrols?$select=name,version&$filter=contains(name,'KK.PlainNumber')`);
  const control = cc.data.value[0];
  if (!control) throw new Error('KK.PlainNumber is not registered in the env; run pac pcf push first');
  const ctrlName = control.name;

  // 2. Whole Number column "Founded" on account.
  const attrs = await webApi(page, 'GET', `EntityDefinitions(LogicalName='account')/Attributes?$select=LogicalName&$filter=LogicalName eq '${COLUMN}'`);
  if (!attrs.data.value.length) {
    await webApi(page, 'POST', `EntityDefinitions(LogicalName='account')/Attributes`, {
      '@odata.type': 'Microsoft.Dynamics.CRM.IntegerAttributeMetadata',
      SchemaName: COLUMN,
      Format: 'None',
      MinValue: 1000,
      MaxValue: 2999,
      RequiredLevel: { Value: 'None' },
      DisplayName: { '@odata.type': 'Microsoft.Dynamics.CRM.Label', LocalizedLabels: [{ '@odata.type': 'Microsoft.Dynamics.CRM.LocalizedLabel', Label: 'Founded', LanguageCode: 1033 }] },
      Description: { '@odata.type': 'Microsoft.Dynamics.CRM.Label', LocalizedLabels: [{ '@odata.type': 'Microsoft.Dynamics.CRM.LocalizedLabel', Label: 'Year the company was founded', LanguageCode: 1033 }] },
    });
  }

  // 3. Form XML: name, Founded (stock), Founded (PlainNumber).
  const INT_CLASSID = '{C6D124CA-7EDA-4a60-AEA9-7FB8D318B68F}';
  const TEXT_CLASSID = '{4273EDBD-AC1D-40d3-9FB2-095C621B552D}';
  const pcfCtrlId = '{0e2e5200-aaaa-4bbb-8ccc-000000000021}';
  const formxml =
    `<form showImage="true">` +
    `<tabs><tab name="general" id="{0e2e6000-aaaa-4bbb-8ccc-000000000060}" IsUserDefined="0" verticallayout="true" showlabel="true" expanded="true" locklevel="0">` +
    `<labels><label description="General" languagecode="1033" /></labels><columns><column width="100%"><sections>` +
    `<section name="founded" id="{0e2e6100-aaaa-4bbb-8ccc-000000000061}" showlabel="true" showbar="false" IsUserDefined="0" layout="varwidth" columns="1" labelwidth="180" celllabelposition="Left" locklevel="0">` +
    `<labels><label description="Founded, two ways" languagecode="1033" /></labels><rows>` +
    `<row><cell id="{0e2e4000-aaaa-4bbb-8ccc-000000000040}" showlabel="true" locklevel="0"><labels><label description="Account Name" languagecode="1033" /></labels><control id="name" classid="${TEXT_CLASSID}" datafieldname="name" disabled="false" /></cell></row>` +
    `<row><cell id="{0e2e4100-aaaa-4bbb-8ccc-000000000010}" showlabel="true" locklevel="0"><labels><label description="Founded (stock control)" languagecode="1033" /></labels><control id="${COLUMN}" classid="${INT_CLASSID}" datafieldname="${COLUMN}" disabled="false" /></cell></row>` +
    `<row><cell id="{0e2e4200-aaaa-4bbb-8ccc-000000000020}" showlabel="true" locklevel="0"><labels><label description="Founded (Plain Number)" languagecode="1033" /></labels><control id="${pcfCtrlId}" classid="${INT_CLASSID}" datafieldname="${COLUMN}" disabled="false" uniqueid="${pcfCtrlId}" /></cell></row>` +
    `</rows></section></sections></column></columns></tab></tabs>` +
    `<controlDescriptions><controlDescription forControl="${pcfCtrlId}"><customControl formFactor="2" name="${ctrlName}"><parameters><value>${COLUMN}</value></parameters></customControl></controlDescription></controlDescriptions>` +
    `</form>`;

  const existing = await webApi(page, 'GET', `systemforms?$select=formid&$filter=name eq '${FORM_NAME}' and objecttypecode eq 'account'`);
  let formId;
  if (existing.data.value.length) {
    formId = existing.data.value[0].formid;
    await webApi(page, 'PATCH', `systemforms(${formId})`, { formxml });
  } else {
    await webApi(page, 'POST', 'systemforms', {
      formid: FORM_ID,
      name: FORM_NAME,
      description: 'xrm-plain-number e2e fixture',
      objecttypecode: 'account',
      type: 2,
      formxml,
      formactivationstate: 1,
    });
    formId = FORM_ID;
  }

  // 4. Publish account.
  await webApi(page, 'POST', 'PublishXml', { ParameterXml: '<importexportxml><entities><entity>account</entity></entities></importexportxml>' });

  // 5. Test record.
  const acc = await webApi(page, 'GET', `accounts?$select=accountid&$filter=name eq '${TEST_ACCOUNT_NAME}'`);
  let accountId;
  if (acc.data.value.length) {
    accountId = acc.data.value[0].accountid;
    await webApi(page, 'PATCH', `accounts(${accountId})`, { [COLUMN]: TEST_VALUE });
  } else {
    const r = await webApi(page, 'POST', 'accounts', { name: TEST_ACCOUNT_NAME, [COLUMN]: TEST_VALUE });
    accountId = r.entityId.match(/\(([^)]+)\)/)[1];
  }

  return { ctrlName, formId, accountId, column: COLUMN, value: TEST_VALUE };
}

if (process.argv[1] && /setup-form\.mjs$/.test(process.argv[1])) {
  const { ctx, page } = await openOrg({ headless: true });
  try { console.log(JSON.stringify(await setupForm(page))); } finally { await ctx.close(); }
}
