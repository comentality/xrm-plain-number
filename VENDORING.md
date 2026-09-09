# Vendoring Plain Number into your own solution

Each control is two files: `ControlManifest.Input.xml` and `index.ts`.
Everything else in a control folder is what `pac pcf init` generates. The code
is public domain (CC0), so there is nothing to attribute and no licence file to
carry.

## Fetch just the files

With Node installed, from the folder that holds your PCF projects:

```
npx degit comentality/xrm-plain-number/PlainNumber/PlainNumber           PlainNumber/PlainNumber
npx degit comentality/xrm-plain-number/PlainNumberGrid/PlainNumberGrid   PlainNumberGrid/PlainNumberGrid
```

Or download `xrm-plain-number-<version>-source.zip` from a release; it holds
the same files.

## Make them build

For each control you want (form control, grid customizer, or both):

1. Generate the project around the files. Use the same namespace and name,
   otherwise the generated types will not match:

   ```
   pac pcf init --namespace KK --name PlainNumber     --template field --framework react --outputDirectory PlainNumber
   pac pcf init --namespace KK --name PlainNumberGrid --template field --framework react --outputDirectory PlainNumberGrid
   ```

2. Copy the two vendored files over the generated `ControlManifest.Input.xml`
   and `index.ts`, and delete the generated `HelloWorld.tsx`.
3. In `PlainNumber/package.json`, pin `@fluentui/react-components` to `9.46.2`.
   The template pins a newer version that Dataverse rejects on import. The grid
   customizer does not use Fluent.
4. `npm install` and `npm run build` in each folder.
5. Add each project to your solution:

   ```
   pac solution add-reference --path ../PlainNumber
   pac solution add-reference --path ../PlainNumberGrid
   ```

## Renaming

Want your own namespace or display name? Change `namespace` and
`display-name-key` on the `<control>` element in each manifest, and pass the
same namespace to `pac pcf init`. Nothing else references them. The registered
name in Dataverse becomes `<your prefix>_<namespace>.PlainNumber`.

## What you get

- `PlainNumber`: a field control for Whole Number columns, editable, no
  settings. Renders `2024`, not `2,024`.
- `PlainNumberGrid`: a Power Apps grid customizer. Assign it to a table and
  every whole-number cell in that table's views and subgrids renders plain.

See `docs/usage.md` for the maker-side steps.
