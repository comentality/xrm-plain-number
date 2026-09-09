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
- **Artifacts.** `SolutionPackageType=Both` in the cdsproj does not emit two
  zips with this toolchain; build each type explicitly, renaming in between:
  `cd solution && dotnet build -c Release -p:SolutionPackageType=Managed` then
  copy `bin/Release/solution.zip` to `xrm-plain-number-<version>-managed.zip`;
  then `dotnet build -c Release -p:SolutionPackageType=Unmanaged` and copy to
  `xrm-plain-number-<version>.zip`. Check `<Managed>` inside each zip's
  `solution.xml` (1 managed, 0 unmanaged). Both controls must appear under
  `Controls/cmtl_KK.PlainNumber` and `Controls/cmtl_KK.PlainNumberGrid`.
- **Source zip.** Third asset, `xrm-plain-number-<version>-source.zip`, for
  people who vendor the code. Build it from the repo root with:
  `python -c "import zipfile;z=zipfile.ZipFile('xrm-plain-number-<version>-source.zip','w',zipfile.ZIP_DEFLATED);[z.write(f) for f in ['VENDORING.md','PlainNumber/PlainNumber/ControlManifest.Input.xml','PlainNumber/PlainNumber/index.ts','PlainNumberGrid/PlainNumberGrid/ControlManifest.Input.xml','PlainNumberGrid/PlainNumberGrid/index.ts']];z.close()"`
  Five files, nothing generated.
- **Notes.** Include: platform library React 16.14.0 and Fluent 9.46.2 are
  required by the environment (Fluent 9.68 is rejected); the grid customizer is
  assigned per table and only one customizer can exist per table.
