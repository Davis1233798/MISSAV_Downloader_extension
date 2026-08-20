# マルチソース動画ダウンローダー

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md)

対応する動画ページが公開する HLS と直接 MP4 URL を検出する Chrome/Brave Manifest V3 拡張機能です。同一の HLS ミラーを検証してから、メモリ使用量を抑えた並列ワーカーでダウンロードします。

> 所有またはダウンロード許可を得ているメディアにのみ使用してください。暗号化/DRM HLS は拒否し、DRM を回避しません。

## 対応サイト

- `extension/manifest.json` に記載された MissAV ドメイン
- Pornhub（`pornhub.com` とサブドメイン）

## 主な機能

- script、DOM、Resource Timing、Fetch/XHR、プレーヤーから `.m3u8` / `.mp4` を検出。
- MissAV の Surrit HLS とミラーページ探索。
- HLS master playlist の画質解析。
- SHA-256 サンプル検証後のみ HLS ミラーを混在。
- 4/8/16/32 並列ワーカー。
- `EXT-X-MAP` / `EXT-X-BYTERANGE`。
- 直接 MP4 はブラウザーのダウンロードマネージャーを使用。
- 英語、繁体字中国語、簡体字中国語、日本語、韓国語、スペイン語 UI。

## テスト

```bash
npm ci
npm run verify
```

詳細は [docs/TESTING.md](docs/TESTING.md) を参照してください。

現在の開発バージョン：**1.1.0**。
