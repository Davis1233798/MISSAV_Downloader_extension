# 다중 소스 동영상 다운로더

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md)

지원되는 동영상 페이지가 노출하는 HLS 및 직접 MP4 URL을 감지하는 Chrome/Brave Manifest V3 확장 프로그램입니다. 동일한 HLS 미러인지 검증한 뒤 제한된 메모리의 병렬 워커로 다운로드합니다.

> 소유하거나 다운로드 권한이 있는 미디어에만 사용하세요. 암호화/DRM HLS는 거부하며 DRM을 우회하지 않습니다.

## 지원 사이트

- `extension/manifest.json`에 나열된 MissAV 도메인
- Pornhub (`pornhub.com` 및 하위 도메인)

## 기능

- script, DOM, Resource Timing, Fetch/XHR, 플레이어에서 `.m3u8` / `.mp4` 감지.
- MissAV Surrit HLS 및 미러 페이지 탐색.
- HLS master playlist 품질 분석.
- SHA-256 샘플 검증 후에만 HLS 미러 혼합.
- 4/8/16/32 병렬 워커.
- `EXT-X-MAP`, `EXT-X-BYTERANGE` 지원.
- 직접 MP4는 브라우저 다운로드 관리자를 사용.
- 영어, 번체 중국어, 간체 중국어, 일본어, 한국어, 스페인어 UI.

## 테스트

```bash
npm ci
npm run verify
```

자세한 내용은 [docs/TESTING.md](docs/TESTING.md)를 참조하세요.

현재 개발 버전: **1.1.0**.
