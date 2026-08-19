# Releasing

This project uses Semantic Versioning (`MAJOR.MINOR.PATCH`) and Git tags prefixed with `v`.

Examples:
- bug fix: `1.0.1` / tag `v1.0.1`
- backward-compatible feature: `1.1.0` / tag `v1.1.0`
- incompatible change: `2.0.0` / tag `v2.0.0`

## Release procedure

1. Update `package.json` and `extension/manifest.json` to the same version.
2. Add the version to `CHANGELOG.md`.
3. Run `npm run verify`.
4. Merge the release changes to `main`.
5. Create and push an annotated tag, for example:

```bash
git tag -a v1.0.0 -m "v1.0.0"
git push origin v1.0.0
```

6. `.github/workflows/release.yml` verifies the tag matches the manifest/package version, rebuilds the ZIP, and creates a GitHub Release with generated release notes and the ZIP attached.

There is no deployment step.
