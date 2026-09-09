// Grid fixture: assign the PlainNumberGrid customizer to the Account table's
// Power Apps grid control, and add the Founded column to the default view
// "My Active Accounts" (the only Account view the test app opens). Both are
// reversible: `node setup-grid.mjs restore` puts the originals back from
// shots/grid-backup.json.
import fs from 'node:fs';
import path from 'node:path';
import { openOrg, webApi, shotsDir } from './browser.mjs';

const VIEW = '00000000-0000-0000-00aa-000010001001'; // My Active Accounts
const COLUMN = 'cmtl_founded';
const backupFile = path.join(shotsDir, 'grid-backup.json');
const publish = (p) => webApi(p, 'POST', 'PublishXml', { ParameterXml: '<importexportxml><entities><entity>account</entity></entities></importexportxml>' });

function gridXml(customizerName) {
  const params = (ff) =>
    `<parameters><data-set name="Items"><columnsDefaultView /></data-set>` +
    `<EnableEditing static="true" type="Enum">no</EnableEditing><DisableChildItemsEditing static="true" type="Enum">no</DisableChildItemsEditing>` +
    `<EnableFiltering static="true" type="Enum">yes</EnableFiltering><EnableSorting static="true" type="Enum">yes</EnableSorting>` +
    `<EnableGrouping static="true" type="Enum">no</EnableGrouping><EnableAggregation static="true" type="Enum">no</EnableAggregation>` +
    `<EnableColumnMoving static="true" type="Enum">no</EnableColumnMoving><EnableMultipleSelection static="true" type="Enum">yes</EnableMultipleSelection>` +
    `<EnableRangeSelection static="true" type="Enum">yes</EnableRangeSelection><EnableJumpBar static="true" type="Enum">no</EnableJumpBar>` +
    `<EnablePagination static="true" type="Enum">yes</EnablePagination><EnableDropdownColor static="true" type="Enum">no</EnableDropdownColor>` +
    `<EnableStatusIcons static="true" type="Enum">yes</EnableStatusIcons><EnableTypeIcons static="true" type="Enum">no</EnableTypeIcons>` +
    `<NavigationTypesAllowed static="true" type="Enum">all</NavigationTypesAllowed><ReflowBehavior static="true" type="Enum">Reflow</ReflowBehavior>` +
    `<ShowAvatar static="true" type="Enum">yes</ShowAvatar><ShowFooter static="true" type="Enum">yes</ShowFooter><ShowColumnHeaders static="true" type="Enum">yes</ShowColumnHeaders>` +
    `<GridCustomizerControlFullName static="true" type="SingleLine.Text">${customizerName}</GridCustomizerControlFullName>` +
    `<EnableStatusColumn static="true" type="Enum">yes</EnableStatusColumn></parameters>`;
  return (
    `<controlDescriptions><controlDescription><customControl id="{E7A81278-8635-4d9e-8D4D-59480B391C5B}"><parameters /></customControl>` +
    [0, 1, 2].map((ff) => `<customControl formFactor="${ff}" name="Microsoft.PowerApps.PowerAppsOneGrid">${params(ff)}</customControl>`).join('') +
    `</controlDescription></controlDescriptions>`
  );
}

export async function setupGrid(page) {
  const cc = await webApi(page, 'GET', `customcontrols?$select=name&$filter=contains(name,'KK.PlainNumberGrid')`);
  const customizer = cc.data.value[0]?.name;
  if (!customizer) throw new Error('KK.PlainNumberGrid is not registered; run pac pcf push in PlainNumberGrid first');

  const cfg = (await webApi(page, 'GET', `customcontroldefaultconfigs?$select=customcontroldefaultconfigid,controldescriptionxml&$filter=primaryentitytypecode eq 'account'`)).data.value[0];
  const view = (await webApi(page, 'GET', `savedqueries(${VIEW})?$select=fetchxml,layoutxml`)).data;
  if (!fs.existsSync(backupFile)) {
    fs.writeFileSync(backupFile, JSON.stringify({ configId: cfg?.customcontroldefaultconfigid, controldescriptionxml: cfg?.controldescriptionxml, fetchxml: view.fetchxml, layoutxml: view.layoutxml }, null, 2));
  }

  if (cfg) {
    await webApi(page, 'PATCH', `customcontroldefaultconfigs(${cfg.customcontroldefaultconfigid})`, { controldescriptionxml: gridXml(customizer) });
  } else {
    await webApi(page, 'POST', 'customcontroldefaultconfigs', { primaryentitytypecode: 'account', controldescriptionxml: gridXml(customizer) });
  }

  const fetchxml = view.fetchxml.includes(COLUMN) ? view.fetchxml : view.fetchxml.replace('<attribute name="name" />', `<attribute name="name" /><attribute name="${COLUMN}" />`);
  const layoutxml = view.layoutxml.includes(COLUMN) ? view.layoutxml : view.layoutxml.replace('<cell name="name" width="300" />', `<cell name="name" width="300" /><cell name="${COLUMN}" width="120" />`);
  if (!fetchxml.includes(COLUMN) || !layoutxml.includes(COLUMN)) throw new Error('could not add the column to the view');
  await webApi(page, 'PATCH', `savedqueries(${VIEW})`, { fetchxml, layoutxml });
  await publish(page);
  return { customizer, viewId: VIEW, column: COLUMN };
}

export async function restoreGrid(page) {
  if (!fs.existsSync(backupFile)) throw new Error('no backup to restore');
  const b = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  if (b.configId) await webApi(page, 'PATCH', `customcontroldefaultconfigs(${b.configId})`, { controldescriptionxml: b.controldescriptionxml ?? '<controlDescriptions />' });
  await webApi(page, 'PATCH', `savedqueries(${VIEW})`, { fetchxml: b.fetchxml, layoutxml: b.layoutxml });
  await publish(page);
  fs.renameSync(backupFile, backupFile + '.restored');
  return true;
}

if (process.argv[1] && /setup-grid\.mjs$/.test(process.argv[1])) {
  const { ctx, page } = await openOrg({ headless: true });
  try {
    console.log(JSON.stringify(process.argv[2] === 'restore' ? await restoreGrid(page) : await setupGrid(page)));
  } finally { await ctx.close(); }
}
