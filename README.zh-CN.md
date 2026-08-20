# 多来源视频下载器

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md)

Chrome/Brave Manifest V3 扩展，用于检测受支持视频页面公开的 HLS 和直接 MP4 来源。对 HLS 镜像会先验证内容一致，再通过有限内存的多线程流程下载。

> 仅用于你拥有或已获授权下载的媒体。加密/DRM HLS 会被拒绝，本项目不会绕过 DRM。

## 支持网站

- `extension/manifest.json` 中列出的 MissAV 域名
- Pornhub（`pornhub.com` 与子域名）

支持依赖页面/播放器实际公开的媒体 URL。如果网站只提供加密或 DRM 内容，本扩展不会解密。

## 功能

- 从 inline script、DOM、Resource Timing、Fetch/XHR 和播放器活动检测 `.m3u8` 与直接 `.mp4`。
- MissAV 的 Surrit HLS 检测及镜像页面扫描。
- HLS master playlist 清晰度解析。
- 混合 HLS 镜像前使用 SHA-256 抽样验证内容一致。
- 4/8/16/32 个持续 worker 与有限 read-ahead。
- 支持 `EXT-X-MAP`、`EXT-X-BYTERANGE`。
- 直接 MP4 交给 Chrome/Brave 下载管理器。
- Chrome i18n：英语、繁体中文、简体中文、日语、韩语、西班牙语。
- SemVer CI、打包和 GitHub Release 流程。

## 开发安装

1. Clone repository。
2. 打开 `chrome://extensions/` 或 `brave://extensions/`。
3. 开启开发者模式。
4. 选择“加载已解压的扩展程序”。
5. 选择 `extension/` 目录。

## 测试

```bash
npm ci
npm run verify
```

完整测试流程见 [docs/TESTING.md](docs/TESTING.md)。

## 版本

采用 Semantic Versioning。当前开发版本：**1.1.0**。

## 许可

请参阅 `LICENSE` 与 `THIRD_PARTY_NOTICES.txt`。
