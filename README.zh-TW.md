# 多來源影片下載器

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md)

Chrome/Brave Manifest V3 擴充功能，用來偵測支援影片頁面所公開的 HLS 與直接 MP4 來源。對 HLS 鏡像會先驗證內容一致，再以有限記憶體的多執行緒流程下載。

> 僅用於你擁有或已獲授權下載的媒體。加密/DRM HLS 會直接拒絕，本專案不繞過 DRM。

## 支援網站

- `extension/manifest.json` 中列出的 MissAV 網域
- Pornhub（`pornhub.com` 與子網域）

支援依賴網頁/播放器實際公開的媒體 URL。若網站只提供加密或 DRM 內容，本擴充功能不會解密。

## 功能

- 從 inline script、DOM、Resource Timing、Fetch/XHR 與播放器活動偵測 `.m3u8` 和直接 `.mp4`。
- MissAV 的 Surrit HLS 偵測與鏡像頁面掃描。
- HLS master playlist 畫質解析。
- 混合 HLS 鏡像前，以 SHA-256 抽樣驗證內容一致。
- 4/8/16/32 個持續 worker 與有限 read-ahead。
- 支援 `EXT-X-MAP`、`EXT-X-BYTERANGE`。
- 直接 MP4 交由 Chrome/Brave 下載管理員下載。
- Chrome i18n 介面：英文、繁體中文、簡體中文、日文、韓文、西班牙文。
- SemVer CI、打包與 GitHub Release 流程。

## 開發安裝

1. Clone repository。
2. 開啟 `chrome://extensions/` 或 `brave://extensions/`。
3. 開啟「開發人員模式」。
4. 選「載入未封裝項目」。
5. 選擇 `extension/` 目錄。

## 測試

```bash
npm ci
npm run verify
```

完整自動測試與人工 smoke test 請看 [docs/TESTING.md](docs/TESTING.md)。

## 版本

採 Semantic Versioning。目前開發版本：**1.1.0**。

- 修 bug：Patch，例如 `1.1.1`
- 相容新功能：Minor，例如 `1.2.0`
- 不相容改動：Major，例如 `2.0.0`

## 授權

請參閱 `LICENSE` 與 `THIRD_PARTY_NOTICES.txt`。
