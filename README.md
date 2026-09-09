# xrm-plain-number

Model-driven app field control that shows and edits a Whole Number without a
thousands separator. For years: 2024, not 2,024.
**[How to use it](docs/usage.md)**, with screenshots.

## Goal

Dataverse formats every Whole Number with the user's digit grouping, and there is
no per-column switch to turn that off. A year column therefore reads `2,024` on
every form and view. This control is the smallest fix: bind it to the column and
the number renders plain. No configuration, no options. Editable, so it can be
the only control on the field.

Started as a per-column "configure your own separator" control; refocused on
2026-09-09 to this single behaviour.

## What is here

- `PlainNumber/`: the PCF (`KK.PlainNumber`, virtual, React 16 + Fluent 9.46.2),
  bound to `Whole.None`. Registered in the test env as `cmtl_KK.PlainNumber`.
- `e2e/`: Playwright scripts. `harness-server.mjs` + `shoot-harness.mjs`
  screenshot the control in the PCF test harness. `run.mjs` waits for a sign-in
  in a headed browser, then creates a `cmtl_founded` column on Account, an
  Account main form "Plain Number E2E" showing it with the stock control and with
  Plain Number, publishes, sets a test record to 2024, screenshots both, types
  1999 into Plain Number and checks the stock control follows. Web API writes go
  through the signed-in page; no secrets are stored.
- `docs/usage.md`: user-facing guide.

## Views

Views are part of the same product but not built. What the research says:

- The Power Apps grid control does not document rendering a column-bound field
  PCF per cell. Whether it does is untested; it is the first thing to try.
- Its documented hook is a **grid customizer control**: one per table, a
  `virtual` PCF whose `init` registers cell renderer overrides keyed by data
  type (`Integer` for whole numbers), targeting columns by name. That is a second
  PCF in the same solution, sharing nothing but the idea.
- A dataset PCF replacing the whole grid is the wrong tool: it costs infinite
  scroll, grouping, aggregation, editing and nested grids to change one column's
  text.
- Non-PCF shapes: a Text formula column (`Text(n, "#")`) shows plain digits in
  any view but is a second, read-only column; per-user digit grouping is global
  and also hits currency. Nothing in the 2025 to 2026 release plans adds
  per-column number formatting to grids.

Tested 2026-09-09 (`e2e/probe-view-column-control.mjs`): a field PCF cannot be
bound to a view column. Creating a savedquery with `grid/controlDescriptions`
`forControl="cmtl_founded"` is accepted on POST but the view never opens (the
app falls back to the default view), and PATCHing the same XML onto the default
Account view is rejected by the server: "Property cmtl_founded is bound to an
attribute in non-existent entity". Views only know dataset-level controls. So
the view side is a **grid customizer control** in the same solution, or
nothing. Open product question: with no configuration, which whole-number
columns does the customizer render plain? All of them on the table it is
assigned to, or only some by a naming rule.

## Gotchas met

- `pac pcf init` pins Fluent 9.68.0; the env rejects it. 9.46.2 imports.
- No apostrophes in manifest `description-key` values (XSD `noAposStringType`).
- `pac pcf push` piped through grep or tail exits 0 even when the import failed;
  check for "Error:" or query the `customcontrol` table.

## Prior art (researched 2026-09-09)

No existing PCF strips digit grouping from a Whole Number. Nearest: prefix/suffix
controls (Danish Naglekar, Oliver Denness, Ivan Ficko) that wrap the platform's
formatted text, and yopower's GPL-3.0 grid customizer bundle with colour and
progress renderers. Platform side: the Whole Number `Format` enum is None,
Duration, Time Zone, Language; digit grouping lives in per-user Personalization
Settings. Sources:

- https://learn.microsoft.com/en-us/power-apps/maker/data-platform/create-edit-field-portal
- https://learn.microsoft.com/en-us/power-apps/user/set-personal-options
- https://learn.microsoft.com/en-us/power-apps/maker/data-platform/formula-columns
- https://learn.microsoft.com/en-us/power-apps/developer/component-framework/customize-editable-grid-control
- https://github.com/microsoft/PowerApps-Samples/tree/master/component-framework/PowerAppsGridCustomizerControl
- https://learn.microsoft.com/en-us/power-platform/important-changes-coming#deprecation-of-editable-grid-and-power-apps-read-only-grid-controls
- https://pcf.gallery/prefix-suffix-textfield/
- https://pcf.gallery/power-apps-grid-extensions/
