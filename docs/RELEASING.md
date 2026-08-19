# Releasing

This project uses Semantic Versioning (`MAJOR.MINOR.PATCH`) and Git tags prefixed with `v`.

Examples:
- bug fix: `1.0.1` / tag `v1.0.1`
- backward-compatible feature: `1.1.0` / tag `v1.1.0`
- incompatible change: `2.0.0` / tag `v2.0.0`

## Recommended release procedure: GitHub Actions UI

1. Update `package.json` and `extension/manifest.json` to the same version.
2. Add the version to `CHANGELOG.md`.
3. Run `npm run verify` locally when possible.
4. Merge the release changes to `main`.
5. Open the repository on GitHub and go to **Actions > Release > Run workflow**.
6. Keep the branch set to `main`.
7. Enter the version without the `v` prefix, for example `1.0.0`.
8. Click **Run workflow**.

The workflow will:

1. Validate that the input uses stable Semantic Versioning.
2. Verify that `package.json` and `extension/manifest.json` match the requested version.
3. Run `npm ci` and `npm run verify`.
4. Build and validate the extension ZIP.
5. Create and push an annotated Git tag such as `v1.0.0`.
6. Create the GitHub Release and attach the generated ZIP.

The workflow intentionally fails if the same Git tag or GitHub Release already exists. Delete the old tag/release first only when correcting an accidental release; otherwise increment the version.

There is no deployment step.

## Alternative: local Git tag

You can still release from Git locally. After the release commit is on `main`:

```bash
git checkout main
git pull origin main
git tag -a v1.0.0 -m "Release v1.0.0"
git push origin v1.0.0
```

A pushed `vMAJOR.MINOR.PATCH` tag triggers the same verification, packaging, and GitHub Release creation workflow.
