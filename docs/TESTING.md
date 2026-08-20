# Testing

## Automated verification

Run on Node.js 20+:

```bash
npm ci
npm run verify
```

`verify` must pass all of the following before a release:

1. JavaScript syntax checks for `content.js`, `background.js` and `sniffer.js`.
2. Manifest V3 validation and SemVer alignment with `package.json`.
3. Required Chrome i18n locales exist and contain the same message keys as English.
4. MissAV and Pornhub match patterns are present in both content-script declarations.
5. `downloads` permission exists for direct MP4 downloads.
6. Unit tests for manifest/i18n and HLS parsing fixtures.
7. Production ZIP creation and `unzip -t` integrity verification.

## Manual smoke test — Chrome and Brave

Perform on both browsers before a release candidate is promoted.

### MissAV

1. Load the unpacked `extension/` directory.
2. Open a MissAV video page that you are authorized to download.
3. Confirm the panel appears and detects at least one HLS URL or player source.
4. Confirm master playlist qualities render when available.
5. Test 4 and 16 workers on a short sample.
6. Confirm the resulting file opens and duration is plausible.
7. If multiple mirrors are reported, confirm only SHA-256-verified mirrors are mixed.

### Pornhub

1. Open a Pornhub video page that you are authorized to download.
2. Start playback if the player does not load media until user interaction.
3. Confirm the panel detects any exposed `.m3u8` and/or direct `.mp4` URL.
4. For HLS, test one short download and verify playback.
5. For direct MP4, click **Direct download** and confirm Chrome/Brave opens its save dialog/download flow.
6. If the page exposes only encrypted/DRM HLS, confirm the extension refuses it rather than attempting decryption.

## Localization smoke test

Temporarily change Chrome/Brave UI language or run separate browser profiles for:

- English (`en`)
- Traditional Chinese (`zh_TW`)
- Simplified Chinese (`zh_CN`)
- Japanese (`ja`)
- Korean (`ko`)
- Spanish (`es`)

For each locale verify the extension name, action tooltip, panel title and buttons are localized and no raw message keys are displayed.

## Release gate

A release must not be created unless:

- `npm run verify` passes locally or on CI;
- Chrome and Brave smoke tests pass;
- `package.json` and `extension/manifest.json` contain the same SemVer;
- `CHANGELOG.md` contains the release entry.
