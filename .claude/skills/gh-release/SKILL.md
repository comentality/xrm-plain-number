# gh-release: xrm-plain-number specifics

Deviations from the default release flow.

- **Version lives in four places.** `solution/src/Other/Solution.xml` `<Version>`
  (four-part, e.g. `0.1.0.0`), the `version` attribute in both
  `PlainNumber/PlainNumber/ControlManifest.Input.xml` and
  `PlainNumberGrid/PlainNumberGrid/ControlManifest.Input.xml` (three-part), and
  `version` in `PlainNumber/package.json`, `PlainNumberGrid/package.json`,
  `e2e/package.json`. Only the package.json files carry `-dev`; manifests and
  Solution.xml cannot. Treat `PlainNumber/package.json` as the version source and
  keep the others in step.
- **Artifacts.** `cd solution && dotnet build -c Release` produces
  `solution/bin/Release/solution.zip` (unmanaged) and
  `solution/bin/Release/solution_managed.zip`. Rename to
  `xrm-plain-number-<version>.zip` and `xrm-plain-number-<version>-managed.zip`
  before attaching. Both controls must appear in the zip under
  `Controls/cmtl_KK.PlainNumber` and `Controls/cmtl_KK.PlainNumberGrid`.
- **Notes.** Include: platform library React 16.14.0 and Fluent 9.46.2 are
  required by the environment (Fluent 9.68 is rejected); the grid customizer is
  assigned per table and only one customizer can exist per table.
