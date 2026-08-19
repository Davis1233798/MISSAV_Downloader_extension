# Download strategy research

This document records practical alternatives when a single HLS CDN is the bottleneck.

## 1. External HLS downloader

**N_m3u8DL-RE** is purpose-built for HLS/DASH/MSS and exposes retry, proxy, custom header and range/fragment controls. It is the strongest fallback when browser-side fetching is slow or fragile.

**yt-dlp** supports concurrent native HLS/DASH fragment downloads with `-N/--concurrent-fragments`. This is useful for validating whether the browser extension itself is the bottleneck.

If both an external downloader and the extension plateau at approximately the same aggregate speed, the likely bottleneck is the origin/CDN path rather than JavaScript scheduling.

## 2. Native Messaging helper

Chrome extensions can communicate with a locally installed native application through Native Messaging. A future optional companion can let the extension discover URLs and then hand the actual transfer to N_m3u8DL-RE/yt-dlp without copying commands manually.

Advantages:
- avoids large browser buffers;
- mature retry/resume/remux behavior;
- easier process-level throughput telemetry.

Cost:
- requires a one-time native host install on Windows/macOS/Linux.

## 3. Verified multi-source HLS

The current extension only combines multiple HLS mirrors after structural checks and SHA-256 sampling establish byte identity for corresponding segments. This can aggregate throughput when mirrors use distinct network paths.

Do not substitute hostnames blindly. Different encodes or timelines can produce corrupt output even when they show the same title and resolution.

## 4. Multi-source HTTP Range for a byte-identical MP4

If two independent URLs expose the **same complete file**, support `Range`, and are verified byte-identical, chunks can be assigned across sources by byte offset and written into the correct positions. This is conceptually similar to multi-source download managers and aria2's multi-source capability.

Necessary safety checks include total length plus sampled hashes at corresponding offsets. Filename/title equality is not sufficient.

## 5. What does not solve a per-IP aggregate throttle

Increasing workers on the same hostname/IP path will not overcome a server-side aggregate cap. Browser File System Access improves memory behavior but does not increase remote throughput. FFmpeg remuxing changes containers, not network speed.

If the CDN imposes a total per-client/IP cap, meaningful speed gains require a legitimately available alternate mirror/source or a different authorized network path.
