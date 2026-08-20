# Multi-Source Video Downloader

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md)

Chrome/Brave Manifest V3 extension for detecting downloadable HLS and direct MP4 media on supported video pages. It can verify byte-identical HLS mirrors before combining segments and uses a bounded-memory concurrent worker pipeline.

> Use only for media you own or are authorized to download. Encrypted/DRM HLS is intentionally rejected; the extension does not bypass DRM.

## Supported sites

- MissAV domains listed in `extension/manifest.json`
- Pornhub (`pornhub.com` and subdomains)

Support is based on media URLs exposed by the page/player. If a site only exposes encrypted/DRM media, this extension will not decrypt it.

## Features

- Detects `.m3u8` and direct `.mp4` URLs from inline scripts, DOM attributes, Resource Timing, Fetch/XHR and player activity.
- MissAV-specific Surrit HLS discovery and mirror-page probing.
- HLS master playlist variant discovery.
- SHA-256 sample verification before mixing candidate HLS mirrors.
- Continuous 4/8/16/32-worker pipeline with bounded read-ahead.
- `EXT-X-MAP` and `EXT-X-BYTERANGE` support.
- Direct MP4 downloads through the Chrome/Brave download manager.
- UI localization through Chrome i18n: English, Traditional Chinese, Simplified Chinese, Japanese, Korean and Spanish.
- SemVer-based CI, packaging and GitHub Release workflow.

## Install for development

1. Clone the repository.
2. Open `chrome://extensions/` or `brave://extensions/`.
3. Enable **Developer mode**.
4. Choose **Load unpacked**.
5. Select the `extension/` directory.

## Test

```bash
npm ci
npm run verify
```

See [docs/TESTING.md](docs/TESTING.md) for automated checks and manual smoke tests.

## Versioning

The project uses Semantic Versioning. Current development version: **1.1.0**.

- Patch: bug fix (`1.1.1`)
- Minor: backward-compatible feature (`1.2.0`)
- Major: incompatible change (`2.0.0`)

See [docs/RELEASING.md](docs/RELEASING.md).

## License

See `LICENSE` and `THIRD_PARTY_NOTICES.txt`.
