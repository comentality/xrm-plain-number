# xrm-plain-number

Model-driven app controls that show and edit a Whole Number without a
thousands separator. For years: 2024, not 2,024. One for forms, one for views.
**[How to use it](docs/usage.md)**, with screenshots.

## Install

Download the managed solution zip from the latest release and import it into
your environment (make.powerapps.com, Solutions, Import). Then follow
[docs/usage.md](docs/usage.md) to put Plain Number on a form column and, if you
want views too, assign Plain Number Grid to the table.

## Vendor it

Prefer the code in your own solution instead of a separate managed one? Each
control is two files, and the code is public domain, so copy them and forget
where they came from:

```
npx degit comentality/xrm-plain-number/PlainNumber/PlainNumber           PlainNumber/PlainNumber
npx degit comentality/xrm-plain-number/PlainNumberGrid/PlainNumberGrid   PlainNumberGrid/PlainNumberGrid
```

Then [VENDORING.md](VENDORING.md): generate the project with `pac pcf init`,
drop the files in, pin Fluent 9.46.2, build, add to your solution.

## Licence

Public domain, under the [CC0 1.0 Universal](LICENSE) dedication. Do what you
like with it; no attribution required, no notice to carry. The repository
contains no third-party code.

## Goal

Dataverse formats every Whole Number with the user's digit grouping, and there is
no per-column switch to turn that off. A year column therefore reads `2,024` on
every form and view. This control is the smallest fix: bind it to the column and
the number renders plain. No configuration, no options. Editable, so it can be
the only control on the field.

Started as a per-column "configure your own separator" control; refocused on
2026-09-09 to this single behaviour.

## What is here

- `PlainNumber/`: the form control (`KK.PlainNumber`, virtual, React 16 +
  Fluent 9.46.2), bound to `Whole.None`, editable, no inputs. Registered in the
  test env as `cmtl_KK.PlainNumber`.
- `PlainNumberGrid/`: the view side (`KK.PlainNumberGrid`), a Power Apps grid
  customizer that overrides the `Integer` cell renderer with plain text for every
  whole-number column of the table it is assigned to. No settings, no network
  calls. Assigned per table through the Power Apps grid control's Customizer
  control property. Registered as `cmtl_KK.PlainNumberGrid`.
- `e2e/`: Playwright scripts. `harness-server.mjs` + `shoot-harness.mjs`
  screenshot the control in the PCF test harness. `run.mjs` waits for a sign-in
  in a headed browser, then creates a `cmtl_founded` column on Account, an
  Account main form "Plain Number E2E" showing it with the stock control and with
  Plain Number, publishes, sets a test record to 2024, screenshots both, types
  1999 into Plain Number and checks the stock control follows. Web API writes go
  through the signed-in page; no secrets are stored.
- `docs/usage.md`: user-facing guide.

## Views

Built and verified 2026-09-09 as `PlainNumberGrid/` (see above). With the
customizer assigned to Account and `cmtl_founded` added to "My Active Accounts",
the Founded cell reads `2024` on the first load of a fresh session and every
load after (`e2e/setup-grid.mjs`, `e2e/shoot-grid.mjs`; `node setup-grid.mjs
restore` puts the table config and the view back). Rule, decided 2026-09-09:
every whole-number column of the table renders plain. An earlier version
rendered plain only the columns carrying Plain Number on a form, found by a
form query at grid init (about 270 ms, off the critical path, cell repaint up to
0.6 s after rows on the first grid of a session); it is in git history before
commit "Grid customizer: all whole numbers plain" if that rule is wanted back.
Known limits: one customizer per table; subgrids on forms untested; the plain
cell's right alignment differs from the stock cell by a few pixels of padding.
`e2e/shots/grid-backup.json` is the restore source for the demo state in the
test env; it is local and gitignored, keep it. All e2e scripts need `ORG_URL`
set to the org, e.g. `https://yourorg.crm.dynamics.com`.

The timing probe for that earlier version is `e2e/probe-timing.mjs`; its numbers
are in the commit "README: measured cost of the customizer's form query".

What the research said before building it:

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
