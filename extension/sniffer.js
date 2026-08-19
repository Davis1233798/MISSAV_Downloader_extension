(() => {
  'use strict';

  const TAG = 'missav-ext-hls-url';
  const seen = new Set();

  function normalize(value) {
    try {
      const raw = typeof value === 'string' ? value : value?.url || String(value || '');
      const url = new URL(raw, location.href).href;
      return /^https:\/\//i.test(url) && /\.m3u8(?:[?#]|$)/i.test(url) ? url : null;
    } catch {
      return null;
    }
  }

  function report(value) {
    const url = normalize(value);
    if (!url || seen.has(url)) return;
    seen.add(url);
    window.postMessage({ type: TAG, url }, location.origin);
  }

  try {
    for (const entry of performance.getEntriesByType('resource')) report(entry?.name);
    const observer = new PerformanceObserver(list => {
      for (const entry of list.getEntries()) report(entry?.name);
    });
    observer.observe({ type: 'resource', buffered: true });
  } catch {}

  try {
    const originalFetch = window.fetch;
    window.fetch = function (...args) {
      report(args[0]);
      return originalFetch.apply(this, args).then(response => {
        report(response?.url);
        return response;
      });
    };
  } catch {}

  try {
    const originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url, ...rest) {
      report(url);
      return originalOpen.call(this, method, url, ...rest);
    };
  } catch {}

  function scanElement(el) {
    if (!(el instanceof Element)) return;
    for (const attr of ['src', 'href', 'data-src', 'data-url', 'data-playlist']) {
      const value = el.getAttribute(attr);
      if (value) report(value);
    }
  }

  try {
    document.addEventListener('DOMContentLoaded', () => {
      document.querySelectorAll('[src],[href],[data-src],[data-url],[data-playlist]').forEach(scanElement);
    }, { once: true });

    const mo = new MutationObserver(records => {
      for (const record of records) {
        if (record.type === 'attributes') scanElement(record.target);
        for (const node of record.addedNodes || []) {
          if (!(node instanceof Element)) continue;
          scanElement(node);
          node.querySelectorAll?.('[src],[href],[data-src],[data-url],[data-playlist]').forEach(scanElement);
        }
      }
    });
    mo.observe(document.documentElement, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['src', 'href', 'data-src', 'data-url', 'data-playlist']
    });
  } catch {}
})();
