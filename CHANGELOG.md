# Changelog

All notable changes to this project will be documented in this file.

The project follows Semantic Versioning.

## [1.1.0] - 2026-08-19

### Added
- Pornhub page support through generic player/media URL detection for exposed HLS (`.m3u8`) and direct MP4 (`.mp4`) sources.
- Direct MP4 downloads through the Chrome/Brave download manager.
- Chrome i18n localization for English, Traditional Chinese, Simplified Chinese, Japanese, Korean and Spanish.
- Localized README files for all six supported UI languages.
- Automated locale-completeness tests and Pornhub manifest coverage checks.
- Manual smoke-test checklist for MissAV, Pornhub and localization.

### Changed
- Generalized the UI title from MissAV-specific wording to a multi-site video downloader.
- HLS discovery now also listens for direct MP4 player/network resources.
- Version bumped from 1.0.0 to 1.1.0 as a backward-compatible feature release.

### Security / scope
- Encrypted/DRM HLS remains intentionally unsupported; no DRM bypass is implemented.
- Direct-download requests are accepted only from supported MissAV/Pornhub content-script pages and HTTPS MP4 URLs.

## [1.0.0] - 2026-08-19

### Added
- Initial repository release of the Chrome/Brave Manifest V3 extension.
- HLS URL discovery from page scripts, DOM, Resource Timing, fetch/XHR sniffing, mirror pages, and manual URLs.
- SHA-256 sampling before byte-identical mirrors are mixed.
- Bounded-memory concurrent worker pipeline with dynamic source scoring and cooldown.
- CI checks, unit tests, reproducible ZIP packaging, and tag-driven GitHub Release workflow.
