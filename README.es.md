# Descargador de vídeo multifuente

[English](README.md) | [繁體中文](README.zh-TW.md) | [简体中文](README.zh-CN.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Español](README.es.md)

Extensión Manifest V3 para Chrome/Brave que detecta HLS y MP4 directos expuestos por páginas de vídeo compatibles. Verifica espejos HLS equivalentes antes de combinar segmentos y utiliza trabajadores concurrentes con memoria limitada.

> Úsalo solo con medios propios o para los que tengas permiso de descarga. HLS cifrado/DRM se rechaza y no se intenta eludir DRM.

## Sitios compatibles

- Dominios MissAV enumerados en `extension/manifest.json`
- Pornhub (`pornhub.com` y subdominios)

## Funciones

- Detección `.m3u8` / `.mp4` desde scripts, DOM, Resource Timing, Fetch/XHR y el reproductor.
- Descubrimiento Surrit HLS y páginas espejo de MissAV.
- Variantes de master playlist HLS.
- Verificación SHA-256 antes de mezclar espejos HLS.
- 4/8/16/32 trabajadores concurrentes.
- `EXT-X-MAP` y `EXT-X-BYTERANGE`.
- MP4 directo mediante el gestor de descargas del navegador.
- UI en inglés, chino tradicional, chino simplificado, japonés, coreano y español.

## Pruebas

```bash
npm ci
npm run verify
```

Consulta [docs/TESTING.md](docs/TESTING.md).

Versión de desarrollo actual: **1.1.0**.
