# Test process

## Local automated test

Requirements: Node.js 20+ and `zip`/`unzip`.

```bash
npm ci
npm run verify
```

`npm run verify` performs:
1. JavaScript syntax checks with `node --check`.
2. Manifest validation and package/manifest version alignment.
3. Node unit tests for manifest invariants and HLS parsing fixtures.
4. Production ZIP build and ZIP integrity verification.

## Chrome manual smoke test

1. Open `chrome://extensions` and enable Developer mode.
2. Load `extension/` as an unpacked extension.
3. Open a supported MissAV video page.
4. Confirm the panel appears and variants are detected.
5. Click **重新掃描來源** and confirm the source count updates without console errors.
6. Select a small/short test video where you are authorized to download.
7. Test 4 and 16 workers; confirm the output file completes and media playback duration is plausible.
8. If multiple HLS sources are found, confirm only SHA-256-verified sources are shown as active.
9. Open DevTools and confirm no uncaught errors in page, content-script, or service-worker consoles.

## Brave manual smoke test

Repeat the Chrome smoke test under `brave://extensions`.

## Regression checklist

- Master playlist with relative variant URLs.
- Direct media playlist.
- `EXT-X-MAP` initialization segment.
- `EXT-X-BYTERANGE` explicit and implicit offsets.
- 403/429 source cooldown and retry behavior.
- Single-source fallback when no valid mirror exists.
- User-cancelled save picker does not leave the UI stuck.
- SPA navigation removes/recreates the panel correctly.

## Release gate

A release tag must not be created unless:
- `npm run verify` passes locally or on CI;
- Chrome and Brave smoke tests pass;
- `package.json` and `extension/manifest.json` contain the same SemVer;
- `CHANGELOG.md` contains the release entry.
