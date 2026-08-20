(() => {
  'use strict';

  const PANEL_ID = 'missav-ext-downloader';
  const MEDIA_EVENT = 'media-ext-media-url';
  const SURRIT_PREFIX = 'https://surrit.com/';
  const CONCURRENCY = [4, 8, 16, 32];
  const hlsUrls = new Set();
  const mp4Urls = new Set();
  const metadata = new Map();
  const rendered = new Set();
  let lastUrl = location.href;
  let retryTimer;
  let refreshTimer;

  const t = (key) => chrome.i18n.getMessage(key) || key;
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  function currentSite() {
    const host = location.hostname.toLowerCase();
    if (host === 'pornhub.com' || host.endsWith('.pornhub.com')) return 'pornhub';
    if (host.startsWith('missav') || host.includes('.missav')) return 'missav';
    return 'unknown';
  }

  function safeFilename(value) {
    return (String(value || 'video')
      .replace(/[\\/:*?"<>|]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 140) || 'video');
  }

  function pageTitle() {
    const heading = document.querySelector('.order-first .mt-4 h1,.order-first h1,h1')?.textContent;
    let value = heading || document.title || 'video';
    value = value
      .replace(/\s*-\s*Pornhub(?:\.com)?\s*$/i, '')
      .replace(/\s*-\s*MissAV\s*$/i, '');
    return safeFilename(value);
  }

  function classifyUrl(value) {
    try {
      const url = new URL(String(value || ''), location.href).href;
      if (!/^https:\/\//i.test(url)) return null;
      if (/\.m3u8(?:[?#]|$)/i.test(url)) return { kind: 'hls', url };
      if (/\.mp4(?:[?#]|$)/i.test(url)) return { kind: 'mp4', url };
      return null;
    } catch {
      return null;
    }
  }

  function addMedia(value, meta = {}) {
    const item = classifyUrl(value);
    if (!item) return null;
    const set = item.kind === 'hls' ? hlsUrls : mp4Urls;
    const before = set.size;
    set.add(item.url);
    metadata.set(item.url, { ...(metadata.get(item.url) || {}), ...meta, kind: item.kind, url: item.url });
    updateCounter();
    if (set.size !== before) scheduleRefresh();
    return item.url;
  }

  window.addEventListener('message', (event) => {
    if (event.source !== window || event.origin !== location.origin) return;
    if (event.data?.type !== MEDIA_EVENT) return;
    addMedia(event.data.url, { by: 'player', kind: event.data.kind });
  });

  function inlineScripts() {
    return [...document.scripts]
      .filter(script => !script.src)
      .map(script => script.textContent || '')
      .filter(Boolean);
  }

  function scanText(text, by) {
    const decoded = String(text || '')
      .replace(/\\\//g, '/')
      .replace(/\\u0026/gi, '&')
      .replace(/&amp;/g, '&');

    const re = /https:\/\/[^\s"'<>\\]+?\.(?:m3u8|mp4)(?:\?[^\s"'<>\\]*)?/ig;
    for (const match of decoded.matchAll(re)) addMedia(match[0], { by });
  }

  function scan() {
    try {
      for (const entry of performance.getEntriesByType('resource')) addMedia(entry?.name, { by: 'performance' });
    } catch {}

    for (const script of inlineScripts()) scanText(script, 'script');

    document.querySelectorAll('[src],[href],[data-src],[data-url],[data-playlist],[data-video-url]').forEach(element => {
      for (const attr of ['src', 'href', 'data-src', 'data-url', 'data-playlist', 'data-video-url']) {
        const value = element.getAttribute(attr);
        if (value) addMedia(value, { by: 'dom' });
      }
    });
  }

  function missavVideoId() {
    if (currentSite() !== 'missav') return null;
    const surrit = /https?:\/\/surrit\.com\/([0-9a-f-]{36})/i;
    const uuid = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/ig;
    for (const script of inlineScripts()) {
      const match = script.match(surrit);
      if (match) return match[1];
      const seekIndex = script.indexOf('seek');
      const matches = seekIndex < 0 ? null : script.slice(Math.max(0, seekIndex - 600), seekIndex).match(uuid);
      if (matches?.length) return matches.at(-1);
    }
    return null;
  }

  async function fetchText(url) {
    try {
      const response = await fetch(url, { credentials: 'omit', cache: 'no-store', mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.text();
    } catch (firstError) {
      const response = await chrome.runtime.sendMessage({ type: 'fetch-text', url }).catch(() => null);
      if (response?.ok) return response.text;
      throw new Error(`${firstError.message}${response?.error ? ` / ${response.error}` : ''}`);
    }
  }

  function parseAttributes(text) {
    const out = {};
    const re = /([A-Z0-9-]+)=("[^"]*"|[^,]*)/gi;
    for (const match of text.matchAll(re)) {
      let value = match[2] || '';
      if (value[0] === '"' && value.at(-1) === '"') value = value.slice(1, -1);
      out[match[1].toUpperCase()] = value;
    }
    return out;
  }

  function qualityFromUrl(url, attrs = {}) {
    const resolution = attrs.RESOLUTION?.match(/\d+x(\d+)/);
    if (resolution) return `${resolution[1]}p`;
    if (attrs.NAME) return attrs.NAME;
    const raw = String(url || '');
    const fromUrl = raw.match(/(?:^|[^0-9])(2160|1440|1080|720|480|360|240)p(?:[^0-9]|$)/i);
    if (fromUrl) return `${fromUrl[1]}p`;
    try {
      const u = new URL(url);
      const queryQuality = u.searchParams.get('quality') || u.searchParams.get('q');
      if (/^\d{3,4}$/.test(queryQuality || '')) return `${queryQuality}p`;
      const parts = u.pathname.split('/').filter(Boolean);
      return decodeURIComponent(parts.at(-2) || parts.at(-1) || 'video');
    } catch {
      return 'video';
    }
  }

  function parseMaster(text, baseUrl) {
    const lines = text.split(/\r?\n/).map(line => line.trim());
    const out = [];
    let pending = null;
    for (const line of lines) {
      if (!line) continue;
      if (line.startsWith('#EXT-X-STREAM-INF:')) {
        pending = parseAttributes(line.slice(18));
        continue;
      }
      if (line[0] === '#' || (!pending && !/\.m3u8(?:[?#]|$)/i.test(line))) continue;
      const url = new URL(line, baseUrl).href;
      const attrs = pending || {};
      const variant = { url, attrs, quality: qualityFromUrl(url, attrs), kind: 'hls' };
      addMedia(url, variant);
      out.push(variant);
      pending = null;
    }
    return out;
  }

  function byteRange(value, url, nextOffsets) {
    if (!value) return null;
    const match = String(value).match(/^(\d+)(?:@(\d+))?$/);
    if (!match) throw new Error('Invalid HLS BYTERANGE');
    const length = Number(match[1]);
    const start = match[2] === undefined ? (nextOffsets.get(url) || 0) : Number(match[2]);
    const end = start + length - 1;
    nextOffsets.set(url, end + 1);
    return { start, end, length };
  }

  function parseMedia(text, baseUrl) {
    const items = [];
    const nextOffsets = new Map();
    let range = null;
    let duration = 0;
    let sequence = 0;

    for (const line of text.split(/\r?\n/).map(value => value.trim())) {
      if (!line) continue;
      if (line.startsWith('#EXT-X-MEDIA-SEQUENCE:')) {
        sequence = Number(line.slice(22)) || 0;
        continue;
      }
      if (line.startsWith('#EXTINF:')) {
        duration = Number(line.slice(8).split(',')[0]) || 0;
        continue;
      }
      if (line.startsWith('#EXT-X-KEY:')) {
        const attrs = parseAttributes(line.slice(11));
        const method = (attrs.METHOD || '').toUpperCase();
        if (method && method !== 'NONE') throw new Error(t('encryptedHlsUnsupported'));
        continue;
      }
      if (line.startsWith('#EXT-X-MAP:')) {
        const attrs = parseAttributes(line.slice(11));
        if (attrs.URI) {
          const url = new URL(attrs.URI, baseUrl).href;
          items.push({ kind: 'init', url, range: byteRange(attrs.BYTERANGE, url, nextOffsets), duration: 0 });
        }
        continue;
      }
      if (line.startsWith('#EXT-X-BYTERANGE:')) {
        range = line.slice(17).trim();
        continue;
      }
      if (line[0] === '#') continue;
      const url = new URL(line, baseUrl).href;
      items.push({ kind: 'media', url, range: byteRange(range, url, nextOffsets), duration, sequence: sequence++ });
      range = null;
      duration = 0;
    }

    const media = items.filter(item => item.kind === 'media');
    return { items, media, total: media.reduce((sum, item) => sum + item.duration, 0) };
  }

  async function resolvePlaylist(url, wantedQuality) {
    const text = await fetchText(url);
    if (!/#EXT-X-STREAM-INF:/i.test(text)) return { url, text };
    const variants = parseMaster(text, url);
    const selected = variants.find(item => item.quality === wantedQuality)
      || variants.find(item => item.url.includes(`/${wantedQuality}/`))
      || variants[0];
    if (!selected) throw new Error(t('noUsableQuality'));
    return { url: selected.url, text: await fetchText(selected.url) };
  }

  async function discoverRemote() {
    scan();
    if (currentSite() === 'missav') {
      const result = await chrome.runtime.sendMessage({
        type: 'discover-mirror-pages',
        pathAndQuery: location.pathname + location.search,
        currentHost: location.hostname
      }).catch(() => null);
      if (result?.ok) {
        for (const url of result.candidates || []) addMedia(url, { by: 'mirror' });
      }
    }
    updateCounter();
    return [...hlsUrls];
  }

  function compatible(a, b) {
    if (a.items.length !== b.items.length || a.media.length !== b.media.length) return false;
    if (Math.abs(a.total - b.total) > Math.max(1.5, a.total * 0.002)) return false;
    for (let i = 0; i < a.items.length; i += 1) {
      if (a.items[i].kind !== b.items[i].kind) return false;
      if (Math.abs((a.items[i].duration || 0) - (b.items[i].duration || 0)) > 0.08) return false;
      if ((a.items[i].range?.length || 0) !== (b.items[i].range?.length || 0)) return false;
    }
    return true;
  }

  async function fetchBuffer(item, sampleBytes = 0) {
    const headers = {};
    if (item.range) headers.Range = `bytes=${item.range.start}-${item.range.end}`;
    else if (sampleBytes) headers.Range = `bytes=0-${sampleBytes - 1}`;
    const response = await fetch(item.url, { credentials: 'omit', cache: 'no-store', mode: 'cors', headers });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.arrayBuffer();
  }

  async function sha256(buffer) {
    const digest = await crypto.subtle.digest('SHA-256', buffer);
    return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
  }

  async function sameMedia(a, b) {
    if (!compatible(a.parsed, b.parsed)) return false;
    const count = a.parsed.items.length;
    const samples = [0, Math.floor(count / 2), count - 1];
    for (const index of new Set(samples)) {
      const [left, right] = await Promise.all([
        fetchBuffer(a.parsed.items[index], 131072),
        fetchBuffer(b.parsed.items[index], 131072)
      ]);
      if (await sha256(left) !== await sha256(right)) return false;
    }
    return true;
  }

  const makeSource = (url, parsed) => ({
    playlistUrl: url,
    host: new URL(url).host,
    parsed,
    state: { bps: 0, fail: 0, coolUntil: 0, inFlight: 0 }
  });

  async function verifiedSources(url, setStatus) {
    const wantedQuality = qualityFromUrl(url, metadata.get(url)?.attrs || {});
    const resolved = await resolvePlaylist(url, wantedQuality);
    const primary = makeSource(resolved.url, parseMedia(resolved.text, resolved.url));
    const out = [primary];

    await discoverRemote();
    for (const candidate of [...hlsUrls].filter(item => item !== url && item !== resolved.url)) {
      try {
        setStatus(`${t('verifying')} ${new URL(candidate).host}…`);
        const resolvedCandidate = await resolvePlaylist(candidate, wantedQuality);
        if (out.some(item => item.playlistUrl === resolvedCandidate.url)) continue;
        const source = makeSource(resolvedCandidate.url, parseMedia(resolvedCandidate.text, resolvedCandidate.url));
        if (await sameMedia(primary, source)) out.push(source);
      } catch {}
    }
    return out;
  }

  function pickSource(sources, excluded = new Set()) {
    const now = Date.now();
    const healthy = sources.filter(source => !excluded.has(source) && source.state.coolUntil <= now);
    const candidates = healthy.length ? healthy : sources.filter(source => !excluded.has(source));
    candidates.sort((a, b) => {
      const aScore = (a.state.bps || 1048576) / (1 + a.state.inFlight * 0.6) / (1 + a.state.fail * 0.4);
      const bScore = (b.state.bps || 1048576) / (1 + b.state.inFlight * 0.6) / (1 + b.state.fail * 0.4);
      return bScore - aScore;
    });
    return candidates[0];
  }

  async function downloadItem(source, index) {
    const item = source.parsed.items[index];
    const headers = item.range ? { Range: `bytes=${item.range.start}-${item.range.end}` } : {};
    const started = performance.now();
    source.state.inFlight += 1;
    try {
      const response = await fetch(item.url, { credentials: 'omit', cache: 'no-store', mode: 'cors', headers });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      const bps = buffer.byteLength / Math.max((performance.now() - started) / 1000, 0.001);
      source.state.bps = source.state.bps ? source.state.bps * 0.7 + bps * 0.3 : bps;
      source.state.fail = Math.max(0, source.state.fail - 0.25);
      return buffer;
    } catch (error) {
      source.state.fail += 1;
      source.state.coolUntil = Date.now() + 8000 * Math.min(4, source.state.fail);
      throw error;
    } finally {
      source.state.inFlight = Math.max(0, source.state.inFlight - 1);
    }
  }

  async function getItem(sources, index) {
    let lastError;
    for (let round = 0; round < 3; round += 1) {
      const tried = new Set();
      while (tried.size < sources.length) {
        const source = pickSource(sources, tried);
        if (!source) break;
        tried.add(source);
        try {
          return await downloadItem(source, index);
        } catch (error) {
          lastError = error;
        }
      }
      if (round < 2) await sleep(500 * (round + 1));
    }
    throw lastError || new Error(t('allSourcesFailed'));
  }

  function formatBytes(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / 1024 ** index;
    return `${value.toFixed(index ? (value >= 100 ? 0 : value >= 10 ? 1 : 2) : 0)} ${units[index]}`;
  }

  const formatRate = value => `${formatBytes(value)}/s`;
  const sourceSummary = sources => sources.map(source => `${source.host} ${formatRate(source.state.bps)}`).join(' + ');

  async function pipeToDisk(sources, writable, button, concurrency) {
    const itemCount = sources[0].parsed.items.length;
    const mediaCount = sources[0].parsed.media.length;
    const readAhead = Math.max(concurrency * 3, concurrency + 4);
    const completed = new Map();
    let nextStart = 0;
    let nextWrite = 0;
    let inFlight = 0;
    let bytes = 0;
    let mediaDone = 0;
    let fatalError = null;
    let wake;
    const started = performance.now();

    const signal = () => {
      if (wake) {
        const callback = wake;
        wake = null;
        callback();
      }
    };

    const pump = () => {
      while (!fatalError && inFlight < concurrency && nextStart < itemCount && nextStart < nextWrite + readAhead) {
        const index = nextStart++;
        inFlight += 1;
        getItem(sources, index)
          .then(buffer => completed.set(index, buffer))
          .catch(error => { fatalError = error; })
          .finally(() => {
            inFlight -= 1;
            pump();
            signal();
          });
      }
    };

    pump();
    while (nextWrite < itemCount) {
      while (!completed.has(nextWrite)) {
        if (fatalError) throw fatalError;
        await new Promise(resolve => { wake = resolve; });
      }
      const buffer = completed.get(nextWrite);
      completed.delete(nextWrite);
      await writable.write(buffer);
      bytes += buffer.byteLength;
      if (sources[0].parsed.items[nextWrite].kind === 'media') mediaDone += 1;
      nextWrite += 1;
      pump();

      const elapsed = Math.max((performance.now() - started) / 1000, 0.001);
      button.textContent = `${mediaCount ? Math.round(mediaDone / mediaCount * 100) : 0}% · ${formatBytes(bytes)} · ${formatRate(bytes / elapsed)} · ${sources.length} ${t('sources')}`;
      button.title = sourceSummary(sources);
    }

    return { bytes, seconds: Math.max((performance.now() - started) / 1000, 0.001) };
  }

  function concurrencyValue() {
    const value = Number(document.querySelector(`#${PANEL_ID} .mav-ext-concurrency`)?.value);
    return CONCURRENCY.includes(value) ? value : 16;
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      textarea.remove();
    }
  }

  function externalCommand(url, name) {
    return `N_m3u8DL-RE "${url}" -H "Referer: ${location.href}" -H "Origin: ${location.origin}" -H "User-Agent: ${navigator.userAgent}" --save-dir "$env:USERPROFILE\\Downloads" --save-name "${safeFilename(name)}" --download-retry-count 10 --thread-count ${concurrencyValue()} -M format=mp4`;
  }

  async function downloadHls(url, name, button, info) {
    const original = button.textContent;
    let writable;
    try {
      if (typeof showSaveFilePicker !== 'function') throw new Error(t('desktopApiRequired'));
      const handle = await showSaveFilePicker({
        suggestedName: name.toLowerCase().endsWith('.mp4') ? name : `${name}.mp4`,
        types: [{ description: 'Video', accept: { 'video/mp4': ['.mp4'] } }]
      });
      button.disabled = true;
      const sources = await verifiedSources(url, value => { info.textContent = value; });
      info.textContent = sources.length > 1
        ? `${t('multiSource')}: ${sourceSummary(sources)}`
        : `${t('singleVerifiedSource')}: ${sources[0].host}`;
      writable = await handle.createWritable();
      const result = await pipeToDisk(sources, writable, button, concurrencyValue());
      await writable.close();
      writable = null;
      info.textContent = `${t('completed')} · ${sourceSummary(sources)}`;
      button.textContent = `${t('completed')} · ${formatBytes(result.bytes)} · ${formatRate(result.bytes / result.seconds)}`;
    } catch (error) {
      if (writable) {
        try { await writable.abort(); } catch {}
      }
      if (error?.name !== 'AbortError') {
        info.textContent = `${t('failed')}: ${error.message || error}`;
        button.textContent = t('failed');
        alert(`${t('downloadFailed')}: ${error.message || error}`);
      }
    } finally {
      setTimeout(() => {
        button.disabled = false;
        button.textContent = original;
      }, 1800);
    }
  }

  async function downloadMp4(url, name, button, info) {
    const original = button.textContent;
    button.disabled = true;
    button.textContent = t('startingDownload');
    try {
      const result = await chrome.runtime.sendMessage({
        type: 'download-direct',
        url,
        filename: `${safeFilename(name)}.mp4`
      });
      if (!result?.ok) throw new Error(result?.error || t('downloadFailed'));
      info.textContent = `${t('browserDownloadStarted')} #${result.downloadId}`;
      button.textContent = t('started');
    } catch (error) {
      info.textContent = `${t('failed')}: ${error.message || error}`;
      button.textContent = t('failed');
    } finally {
      setTimeout(() => {
        button.disabled = false;
        button.textContent = original;
      }, 1800);
    }
  }

  function updateCounter(extra = '') {
    const element = document.querySelector(`#${PANEL_ID} .mav-ext-source-counter`);
    if (!element) return;
    const all = [...hlsUrls, ...mp4Urls];
    const hosts = new Set(all.map(url => {
      try { return new URL(url).host; } catch { return ''; }
    }).filter(Boolean));
    const pieces = [
      `${t('detected')} ${hlsUrls.size} ${t('hlsUrls')}`,
      `${mp4Urls.size} ${t('mp4Urls')}`,
      `${hosts.size} ${t('hosts')}`
    ];
    element.textContent = `${pieces.join(' / ')}${extra ? ` · ${extra}` : ''}`;
  }

  function mountTarget() {
    if (currentSite() === 'missav') return document.querySelector('.order-first .mt-4,.order-first,main,body');
    return document.querySelector('main,#main-container,#wrapper,body');
  }

  function panel(target) {
    let root = document.getElementById(PANEL_ID);
    if (root) return root;
    root = document.createElement('section');
    root.id = PANEL_ID;
    root.innerHTML = `
      <div class="mav-ext-header">
        <div>
          <div class="mav-ext-title">${t('panelTitle')}</div>
          <div class="mav-ext-source-counter"></div>
        </div>
        <div class="mav-ext-header-right">
          <label class="mav-ext-thread-control">${t('downloadThreads')}
            <select class="mav-ext-concurrency"><option>4</option><option>8</option><option selected>16</option><option>32</option></select>
          </label>
          <button class="mav-ext-btn scan" type="button">${t('rescanSources')}</button>
          <button class="mav-ext-btn add" type="button">${t('addMirror')}</button>
        </div>
      </div>
      <div class="mav-ext-status">${t('initializing')}</div>
      <div class="mav-ext-list"></div>`;
    target.prepend(root);

    root.querySelector('.scan').onclick = async (event) => {
      event.target.disabled = true;
      try {
        await discoverRemote();
        await refresh();
        updateCounter(t('rescanned'));
      } finally {
        event.target.disabled = false;
      }
    };

    root.querySelector('.add').onclick = () => {
      const url = prompt(t('promptM3u8'));
      if (!url) return;
      updateCounter(addMedia(url, { by: 'manual' }) ? t('added') : t('invalidUrl'));
    };
    updateCounter();
    return root;
  }

  function addButton(container, label, onClick, primary = false) {
    const button = document.createElement('button');
    button.className = `mav-ext-btn ${primary ? 'mav-ext-btn-primary' : ''}`;
    button.type = 'button';
    button.textContent = label;
    button.onclick = onClick;
    container.appendChild(button);
    return button;
  }

  function renderHlsRow(list, variant, name) {
    const key = `hls:${variant.url}`;
    if (rendered.has(key)) return;
    rendered.add(key);

    const row = document.createElement('div');
    row.className = 'mav-ext-item';
    const quality = document.createElement('div');
    quality.className = 'mav-ext-quality';
    quality.textContent = variant.quality || qualityFromUrl(variant.url, variant.attrs || {});
    const url = document.createElement('div');
    url.className = 'mav-ext-url';
    url.textContent = variant.url;
    url.title = variant.url;
    const info = document.createElement('div');
    info.className = 'mav-ext-source-info';
    info.textContent = t('hlsSourceInfo');
    const actions = document.createElement('div');
    actions.className = 'mav-ext-actions';

    addButton(actions, t('copyLink'), () => copyText(variant.url));
    let downloadButton;
    downloadButton = addButton(actions, t('multiSourceDownload'), () => downloadHls(variant.url, name, downloadButton, info), true);
    addButton(actions, t('copyExternalCommand'), () => copyText(externalCommand(variant.url, name)));
    row.append(quality, url, info, actions);
    list.appendChild(row);
  }

  function renderMp4Row(list, urlValue, name) {
    const key = `mp4:${urlValue}`;
    if (rendered.has(key)) return;
    rendered.add(key);

    const row = document.createElement('div');
    row.className = 'mav-ext-item';
    const quality = document.createElement('div');
    quality.className = 'mav-ext-quality';
    quality.textContent = `${qualityFromUrl(urlValue)} MP4`;
    const url = document.createElement('div');
    url.className = 'mav-ext-url';
    url.textContent = urlValue;
    url.title = urlValue;
    const info = document.createElement('div');
    info.className = 'mav-ext-source-info';
    info.textContent = t('directMp4Info');
    const actions = document.createElement('div');
    actions.className = 'mav-ext-actions';

    addButton(actions, t('copyLink'), () => copyText(urlValue));
    let downloadButton;
    downloadButton = addButton(actions, t('directDownload'), () => downloadMp4(urlValue, name, downloadButton, info), true);
    row.append(quality, url, info, actions);
    list.appendChild(row);
  }

  async function expandHls(url) {
    try {
      const text = await fetchText(url);
      if (/#EXT-X-STREAM-INF:/i.test(text)) return parseMaster(text, url);
      return [{ url, attrs: metadata.get(url)?.attrs || {}, quality: qualityFromUrl(url), kind: 'hls' }];
    } catch {
      return [{ url, attrs: metadata.get(url)?.attrs || {}, quality: qualityFromUrl(url), kind: 'hls' }];
    }
  }

  async function refresh() {
    const root = document.getElementById(PANEL_ID);
    if (!root) return;
    const status = root.querySelector('.mav-ext-status');
    const list = root.querySelector('.mav-ext-list');
    scan();

    const name = pageTitle();
    let newRows = 0;
    for (const url of [...hlsUrls]) {
      const variants = await expandHls(url);
      for (const variant of variants) {
        const key = `hls:${variant.url}`;
        if (!rendered.has(key)) newRows += 1;
        renderHlsRow(list, variant, name);
      }
    }
    for (const url of [...mp4Urls]) {
      const key = `mp4:${url}`;
      if (!rendered.has(key)) newRows += 1;
      renderMp4Row(list, url, name);
    }

    const total = rendered.size;
    status.textContent = total ? `${t('foundSources')} ${total}` : t('waitingForSource');
    updateCounter(newRows ? t('updated') : '');
  }

  function scheduleRefresh() {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => refresh().catch(() => {}), 180);
  }

  async function init(attempt = 0) {
    const target = mountTarget();
    if (!target) {
      if (attempt < 20) retryTimer = setTimeout(() => init(attempt + 1), 500);
      return;
    }

    const root = panel(target);
    const status = root.querySelector('.mav-ext-status');
    scan();

    const id = missavVideoId();
    if (id) addMedia(new URL(`${id}/playlist.m3u8`, SURRIT_PREFIX).href, { by: 'primary' });

    status.textContent = t('scanningSources');
    await refresh();
    discoverRemote().then(refresh).catch(() => {});

    setTimeout(() => { scan(); refresh().catch(() => {}); }, 1000);
    setTimeout(() => { scan(); refresh().catch(() => {}); }, 3000);
  }

  function reset() {
    clearTimeout(retryTimer);
    clearTimeout(refreshTimer);
    document.getElementById(PANEL_ID)?.remove();
    hlsUrls.clear();
    mp4Urls.clear();
    metadata.clear();
    rendered.clear();
    init();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => init(), { once: true });
  else init();

  new MutationObserver(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      reset();
    }
  }).observe(document.documentElement, { subtree: true, childList: true });
})();
