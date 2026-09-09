# xrm-number-format

Model-driven app field control that shows a Whole Number with a thousands
separator configured per column: the user's own, none, or any text.
**[How to use it](docs/usage.md)**, with screenshots.

## Goal

A PCF (PowerApps Component Framework) control that can display whole numbers in a
format configured per column, in view and form.

In the user's words: "pcf control that can display whole numbers in format configured
per column. in view and form."

Two things follow from that sentence and should not be lost:

- **Per column.** The format is a property of the column the control is bound to, not
  of the control globally. Two Whole Number columns on the same form or view can show
  differently.
- **View and form.** One package has to work as a field control on a form and change
  how a cell renders in a view. Those are different PCF surfaces with different
  manifests and lifecycles; "works on the form" alone is not done. Prior art (below)
  says the view side is most likely a grid customizer control, not a dataset control
  that replaces the whole grid.

## Open questions

Decided on purpose in the first working session, not by drift:

- **What "format" means.** Thousands separators on/off? Padding to a fixed width
  (leading zeros)? Prefix/suffix (units, `#`)? Custom digit grouping? Locale-aware vs
  a fixed pattern string? Pick the vocabulary before the manifest, since the manifest
  freezes the property names. Note the platform hands a PCF the user's digit-grouping
  settings via `context.userSettings.numberFormattingInfo`, so "honour user settings"
  and "ignore them for this column" are both possible.
- **Where the per-column configuration lives.** This is harder than it looks: the grid
  customizer control has exactly one manifest property (`EventName`) and no
  maker-editable inputs, so form-side input properties alone cannot carry the format
  to views. Options: an environment-variable JSON keyed by entity and column logical
  name (both controls read it); a config table (the yopower approach); form-side input
  properties as an override on top of either. Decide one source of truth first.
- **Form control shape.** Read-only display only, or also editable (accept typed input,
  strip formatting, write back the integer)? "Display" in the ask suggests read-only,
  but a form field that cannot be edited surprises users.
- **View control shape, and the first empirical test.** Nobody, Microsoft included,
  documents whether a field-type PCF bound to a view column renders per cell inside
  the Power Apps grid control. The two grids that would have honoured one (Editable
  Grid, Power Apps Read-Only Grid) were deprecated March 2026. First thing to do in a
  real environment: bind a trivial field PCF to a Whole Number column on a view using
  the Power Apps grid control and see whether it renders. If it does, the view side
  is nearly free. If not, the view side is a grid customizer overriding the `Integer`
  cell renderer (and cell editor, on editable grids), targeting columns by
  `colDefs[columnIndex].name`. A dataset PCF replacing the whole view is ruled out:
  it costs infinite scroll, grouping, aggregation, editing and nested grids to change
  one column's text.
- **How anyone knows it worked.** A test harness run (`npm start`) with sample values,
  then a solution import into a real environment with a Whole Number column on a form,
  a view using the Power Apps grid control, and a subgrid on a form.

## Constraints surfaced by the research

- **One customizer per grid.** If the target table already has a grid customizer
  assigned (yopower or anything else), this control cannot coexist without merging.
- **Renderers are display only.** Microsoft: "Don't use renderers to override the
  values in the grid since the server doesn't use the new values to do filtering or
  sorting." Sort and filter stay on the raw integer.
- **`colDefs[].customizerParams` is undocumented** and platform-populated. Do not rely
  on it as the per-column config channel.
- **Customizer assignment is classic solution explorer only** (table > Controls > Power
  Apps grid control > Customizer control), no modern designer path.
- **Reading an environment variable from the customizer** likely needs
  `<uses-feature name="WebAPI">` in the manifest, which Microsoft's template does not
  declare. Unverified.
- **Licence hygiene.** Microsoft samples are MIT. The yopower repo is GPL-3.0; do not
  copy code from it.

## Prior art (researched 2026-09-09, nothing run)

### Existing PCF controls

Nothing found that exposes a format pattern, digit-grouping toggle, zero-padding
width or locale as a manifest input for `Whole.None`. Closest:

- **Prefix Suffix TextField**, Danish Naglekar. Field control, binds `Whole.None`;
  inputs `displayOption`, `prefixValue`, `suffixValue`. Glues text around the raw
  value, never touches digits. Editable, MIT, last commit 2022-08.
  https://pcf.gallery/prefix-suffix-textfield/ ·
  https://github.com/Power-Maverick/PCF-Controls/tree/master/PrefixSuffixTextFieldControl
- **Comprehensive Prefix Suffix PCF**, Oliver Denness. Field control, `Whole.None`
  plus others; prefix/suffix, icons, colours, regex validation. No digit formatting.
  MIT, 2025-08, still alpha. https://github.com/odenness/oden-prefixsuffix-pcf
- **Prefix Suffix Control**, Ivan Ficko. Suffix only, MIT, last commit 2019.
  https://github.com/DynamicsNinja/PCF-Prefix-Suffix-Control
- **Configurable Field Formatter Control**, Prateek Chauhan. Field control, JSON
  rules, but rules change text colour only. Read-only, MIT, 2026-08.
  https://github.com/chauhanprateek92/ConfigurableFieldFormatterControl
- **Power Apps Grid Extensions**, yopower. A grid customizer with 18 sub-customizers
  configured from a JSON column on its own Column Definition table (its workaround for
  customizers having no per-instance parameters). Numeric ones do colours, progress
  bar, duration. No format-string customizer. GPL-3.0, active 2026-09. Views and
  subgrids only, not forms. https://pcf.gallery/power-apps-grid-extensions/ ·
  https://github.com/yopowerrepos/freemium
- **RecordImage Cell Renderer**, David Rivard. Customizer for images; its blog post
  documents the no-per-instance-parameters constraint and shows it working in a form
  subgrid. MIT. https://github.com/drivardxrm/RecordImage.CellRenderer
- Percent-format, truncated-number and phone-format controls exist but bind Decimal or
  text, not `Whole.None`.

### What the platform already does

- **Whole Number `Format`** is None / Duration / Time Zone / Language (plus API-only
  Locale). It picks a control, it is not a display mask. No per-column separator,
  padding or prefix setting exists.
  https://learn.microsoft.com/en-us/power-apps/maker/data-platform/create-edit-field-portal ·
  https://learn.microsoft.com/en-us/power-apps/developer/data-platform/webapi/reference/integerformat
- **Digit grouping is per user** (Personalization Settings > Formats > Number). The org
  setting only seeds new users. It hits every number the user sees, currency included.
  https://learn.microsoft.com/en-us/power-apps/user/set-personal-options
- **Formula (fx) column** of type Text: `Text(n, "#")` gives an unseparated digit
  string and can concatenate a prefix. Locale tokens (`,` `.`) unsupported; zero
  padding unverified; sortability documented inconsistently; filtering throttled; a
  second read-only column beside the editable one.
  https://learn.microsoft.com/en-us/power-apps/maker/data-platform/formula-columns
- **Classic calculated column** has no number-to-text function at all.
- **Canvas / custom page `Text()`** supports `0`, `#`, `,`, locale tags. Only helps if
  leaving native model-driven views and forms is acceptable.
  https://learn.microsoft.com/en-us/power-platform/power-fx/reference/function-text
- **Release plans 2025w1 through 2026w1** list nothing on per-column number
  formatting in model-driven grids. Release plans moved to the "AI at Work roadmap" in
  September 2026, which was **not checked**. A feature landing there would make this
  project moot.

### How a PCF reaches a view cell

- **Power Apps grid control** is the current grid; Editable Grid and Power Apps
  Read-Only Grid deprecated effective March 2026, no removal date.
  https://learn.microsoft.com/en-us/power-platform/important-changes-coming#deprecation-of-editable-grid-and-power-apps-read-only-grid-controls
- **Customizer control**: a `virtual` PCF with one bound property `EventName`; in
  `init` it calls `context.factory.fireEvent(eventName, { cellRendererOverrides,
  cellEditorOverrides })`. Overrides are keyed by data type; `Integer` is the whole
  number key. Return null to fall back to the stock renderer. The doc is titled
  "Customize the editable grid control" but is the Power Apps grid control API.
  https://learn.microsoft.com/en-us/power-apps/developer/component-framework/customize-editable-grid-control ·
  https://learn.microsoft.com/en-us/power-apps/developer/component-framework/sample-controls/customized-editable-grid-control ·
  https://github.com/microsoft/PowerApps-Samples/tree/master/component-framework/PowerAppsGridCustomizerControl ·
  https://github.com/microsoft/PowerApps-Samples/tree/master/component-framework/resources/GridCustomizerControlTemplate
- **Targeting one column**: `params.colDefs[params.columnIndex].name === 'creditlimit'`
  in the official sample. `props` carries `value`, `formattedValue`, `columnDataType`.
- **Getting `context.formatting` into a renderer**: build the overrides in a closure
  over `context` inside `init`. Formatting API has `formatInteger`.
  https://learn.microsoft.com/en-us/power-apps/developer/component-framework/reference/formatting ·
  https://nordicsummit.info/wp-content/uploads/2023/10/Diana_Birkelbach_CodeComponentsForPowerAppsGrid.pdf
- **Per-column config from outside the control**: environment-variable JSON read via
  webAPI (Temmy Raharjo), or entity metadata (itmustbecode).
  https://temmyraharjo.wordpress.com/2023/07/29/build-pcf-make-specified-attributes-readonly-on-power-apps-grid-control/ ·
  https://itmustbecode.com/powerapps-grid-control-how-to-make-cell-renderers-more-generic/ ·
  https://dianabirkelbach.wordpress.com/2022/07/27/power-apps-grid-control-first-glimpse-to-the-cell-renderer-and-editors/
- **Subgrids on forms** use the same control and the same Customizer control property.
  https://dianabirkelbach.wordpress.com/2023/07/15/disable-cells-using-power-apps-grid-customizer-control/
- **Two controls in one solution**: one `.pcfproj` each, both referenced from one
  `.cdsproj` via `pac solution add-reference`. A shared `formatWholeNumber(value,
  spec)` module can serve both.
  https://learn.microsoft.com/en-us/power-platform/developer/cli/reference/solution#pac-solution-add-reference

### Recommended shape (research only, untested)

A field PCF bound to `Whole.None` for forms, plus a grid customizer PCF overriding the
`Integer` cell renderer (and editor, when the grid is editable) for views and
subgrids, both in one solution and both reading the same per-column format spec from
one place. Run the field-PCF-in-grid test first; if the Power Apps grid renders a
column-bound field PCF, the customizer may not be needed at all.

## Status (2026-09-09)

- `NumberFormat/` is a working field PCF (`cmtl_KK.NumberFormat`, virtual, React 16 +
  Fluent 9.46.2), bound to `Whole.None`, display only. Inputs: `separatorMode`
  (user | none | custom) and `groupSeparator` (any text). Pushed to the test env with
  `pac pcf push --publisher-prefix cmtl`.
- Harness screenshots for 1234567 in `e2e/shots/keep/`: user separator, none, and
  the pizza emoji. Reproduce with `node harness-server.mjs` then
  `node shoot-harness.mjs` in `e2e/`.
- Env e2e: `node run.mjs` in `e2e/` opens a headed browser, waits for a sign-in,
  creates the Account main form "Number Format E2E" (stock control, no separator,
  emoji separator, all on `numberofemployees`), publishes, sets the test account to
  1234567, and screenshots into `e2e/shots/`. Web API writes go through the signed-in
  page, so no secrets are stored.
- Not done: the view side, and the field-PCF-in-grid test.

## Gotchas met

- `pac pcf init` pins Fluent 9.68.0; the env rejects it. 9.46.2 imports.
- No apostrophes in manifest `description-key` values (XSD `noAposStringType`).
- `pac pcf push` piped through grep or tail exits 0 even when the import failed.
