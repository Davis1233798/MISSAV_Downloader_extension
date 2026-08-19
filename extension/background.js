'use strict';

const MISSAV_HOSTS = [
  'missav.ai',
  'missav.ws',
  'missav.live',
  'missav123.com',
  'missav.fans',
  'missav.media'
];

function isHttps(url) {
  try {
    return new URL(String(url || '')).protocol === 'https:';
  } catch {
    return false;
  }
}

function isSupportedSender(sender) {
  try {
    const host = new URL(sender?.url || '').hostname.toLowerCase();
    return MISSAV_HOSTS.includes(host) || host === 'pornhub.com' || host.endsWith('.pornhub.com');
  } catch {
    return false;
  }
}

function safeFilename(value) {
  return (String(value || 'video.mp4')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160) || 'video.mp4');
}

function extractHlsCandidates(text, baseUrl) {
  const out = new Set();
  const decoded = String(text || '')
    .replace(/\\\//g, '/')
    .replace(/\\u0026/gi, '&')
    .replace(/&amp;/g, '&');

  const absolute = /https:\/\/[^\s"'<>\\]+?\.m3u8(?:\?[^\s"'<>\\]*)?/ig;
  for (const match of decoded.matchAll(absolute)) {
    try { out.add(new URL(match[0], baseUrl).href); } catch {}
  }

  const surritUuid = /https?:\/\/surrit\.com\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/ig;
  for (const match of decoded.matchAll(surritUuid)) {
    out.add(`https://surrit.com/${match[1]}/playlist.m3u8`);
  }

  return [...out];
}

async function fetchText(url) {
  if (!isHttps(url)) throw new Error('Only HTTPS URLs are allowed');
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'omit',
    cache: 'no-store',
    redirect: 'follow'
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return { text, finalUrl: response.url || url };
}

async function discoverMirrorPages(pathAndQuery, currentHost) {
  const results = [];
  const candidates = new Set();

  await Promise.all(MISSAV_HOSTS.filter(host => host !== currentHost).map(async host => {
    const url = `https://${host}${pathAndQuery}`;
    try {
      const { text, finalUrl } = await fetchText(url);
      const found = extractHlsCandidates(text, finalUrl);
      found.forEach(item => candidates.add(item));
      results.push({ host, ok: true, count: found.length, finalUrl });
    } catch (error) {
      results.push({ host, ok: false, count: 0, error: error?.message || String(error) });
    }
  }));

  return { candidates: [...candidates], pages: results };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') return;

  if (message.type === 'fetch-text') {
    (async () => {
      try {
        const { text, finalUrl } = await fetchText(message.url);
        sendResponse({ ok: true, text, finalUrl });
      } catch (error) {
        sendResponse({ ok: false, error: error?.message || String(error) });
      }
    })();
    return true;
  }

  if (message.type === 'discover-mirror-pages') {
    (async () => {
      try {
        const result = await discoverMirrorPages(
          String(message.pathAndQuery || '/'),
          String(message.currentHost || '')
        );
        sendResponse({ ok: true, ...result });
      } catch (error) {
        sendResponse({ ok: false, error: error?.message || String(error) });
      }
    })();
    return true;
  }

  if (message.type === 'download-direct') {
    (async () => {
      try {
        if (!isSupportedSender(sender)) throw new Error('Unsupported page');
        if (!isHttps(message.url) || !/\.mp4(?:[?#]|$)/i.test(String(message.url))) {
          throw new Error('Direct download must be an HTTPS MP4 URL');
        }
        const downloadId = await chrome.downloads.download({
          url: String(message.url),
          filename: safeFilename(message.filename),
          saveAs: true,
          conflictAction: 'uniquify'
        });
        sendResponse({ ok: true, downloadId });
      } catch (error) {
        sendResponse({ ok: false, error: error?.message || String(error) });
      }
    })();
    return true;
  }
});
