# xrm-number-format

## Goal

A PCF (PowerApps Component Framework) control that can display whole numbers in a
format configured per column, in view and form.

In the user's words: "pcf control that can display whole numbers in format configured
per column. in view and form."

Two things follow from that sentence and should not be lost:

- **Per column.** The format is a property of the column the control is bound to, not
  of the control globally. Two Whole Number columns on the same form or view can show
  differently.
- **View and form.** One control (or one package) has to work as a field control on a
  form and as a cell renderer in a view/grid. Those are different PCF surfaces with
  different manifests and lifecycles; "works on the form" alone is not done.

## Open questions

Decided on purpose in the first working session, not by drift:

- **What "format" means.** Thousands separators on/off? Padding to a fixed width
  (leading zeros)? Prefix/suffix (units, `#`)? Custom digit grouping? Locale-aware vs
  a fixed pattern string? Pick the vocabulary before the manifest, since the manifest
  freezes the property names.
- **Where the per-column configuration lives.** PCF input properties set when the
  control is added to the column (the obvious answer), vs reading something off the
  column metadata, vs a lookup table. The first is simplest and is what "configured per
  column" most likely means.
- **Form control shape.** Read-only display only, or also editable (accept typed input,
  strip formatting, write back the integer)? "Display" in the ask suggests read-only,
  but a form field that cannot be edited surprises users.
- **View control shape.** PCF for views is a dataset control that owns the whole grid,
  not a per-cell renderer. Confirm whether "in view" means a custom grid control or
  whether a field-type control bound to the column is enough on the newer grid. This is
  the biggest scope fork in the project.
- **How anyone knows it worked.** A test harness run (`npm start`) with sample values,
  plus a solution import into a real environment with a Whole Number column on a form
  and a view.

## Leads (unverified, evaluate before using)

- The `pac pcf init` template and the PCF test harness are the standard starting point.
  Not run here.
- The `xrm-*` siblings in `~/Code` are Dynamics/XrmToolBox tools, not PCF controls; they
  are neighbours by domain, not by toolchain.

## Status

Empty, nothing built yet.
