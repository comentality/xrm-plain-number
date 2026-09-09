# Changelog

## 0.1.0 - 2026-09-09

- **Plain Number shows and edits a Whole Number column without a thousands separator, so a year reads 2024, not 2,024.**
  Field control for model-driven app forms, no settings. Typed text keeps its digits and drops everything else on commit.
  ![stock control 2,024 beside Plain Number 2024](docs/img/form-display.png)
- **Plain Number Grid renders every whole-number cell of a table's views and subgrids without a separator.**
  Grid customizer for the Power Apps grid control, assigned once per table, no settings, no network calls.
  ![Founded column shows 2024 in a view](docs/img/grid-row.png)
- Ships as one solution, managed and unmanaged, with both controls, plus a source zip for vendoring.
- Each control is two files, manifest and index.ts, so it can be copied into another solution with `npx degit`; see VENDORING.md.
- e2e: Playwright scripts host the PCF harness headlessly, and build and screenshot fixtures in a Dataverse environment through a signed-in browser session.
- Probes kept as evidence: a field control cannot be bound to a view column (server rejects it); the cost of a form query at grid init.
