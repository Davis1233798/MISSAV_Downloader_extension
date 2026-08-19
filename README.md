# MissAV Multi-Source Downloader

Chrome/Brave Manifest V3 extension that discovers HLS URLs, verifies byte-identical mirror sources, and downloads HLS segments with a bounded-memory concurrent worker pipeline.

> Use only for media you are authorized to download. The project does not attempt to bypass DRM or invent alternate CDN hostnames.

## Why

A single CDN may become the transfer bottleneck even on a fast local connection. This project tries to distinguish browser-side bottlenecks from remote-side throttling and can safely combine genuinely equivalent HLS mirrors when they are available.

## Features

- Detects `.m3u8` URLs from inline scripts, DOM attributes, Resource Timing, fetch/XHR, supported mirror pages, and manual input.
- Resolves HLS master playlists into media variants.
- Verifies candidate mirrors structurally and samples corresponding segments with SHA-256 before mixing them.
- Uses a continuous 4/8/16/32-worker pipeline with bounded read-ahead.
- Dynamically favors healthier/faster verified sources and cools down failing ones.
- Supports `EXT-X-MAP` and `EXT-X-BYTERANGE`.
- Streams ordered output to disk through the File System Access API.
- Provides a CI/test/package pipeline and SemVer-based GitHub Release workflow.

## Install for development

1. Clone the repository.
2. Open `chrome://extensions/` or `brave://extensions/`.
3. Enable Developer mode.
4. Choose **Load unpacked**.
5. Select the `extension/` directory.

## Test

```bash
npm ci
npm run verify
```

See [docs/TESTING.md](docs/TESTING.md) for the full automated and manual smoke-test process.

## Other download approaches

Research and tradeoffs are documented in [docs/RESEARCH.md](docs/RESEARCH.md). In short:

- **N_m3u8DL-RE**: strong external HLS/DASH downloader fallback.
- **yt-dlp `-N`**: concurrent native HLS fragment downloads and a useful speed-control comparison.
- **Native Messaging helper**: future one-click bridge from the extension to an external downloader.
- **Verified multi-source Range download**: possible when two URLs expose the exact same complete file.

If every downloader hits the same ~1 MB/s aggregate ceiling against the same CDN, more browser workers will not fix an upstream/server-side aggregate throttle.

## Versioning and releases

The repository uses [Semantic Versioning](https://semver.org/) and GitHub Releases based on `vMAJOR.MINOR.PATCH` tags. See [docs/RELEASING.md](docs/RELEASING.md).

Current version: **1.0.0**.

## License

The extension is derived from the original userscript identified in `THIRD_PARTY_NOTICES.txt`. Review upstream licensing/attribution before redistribution.
