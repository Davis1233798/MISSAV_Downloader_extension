import test from 'node:test';
import assert from 'node:assert/strict';

function parseAttributeList(text) {
  const attrs = {};
  const regex = /([A-Z0-9-]+)=("[^"]*"|[^,]*)/gi;
  for (const match of text.matchAll(regex)) {
    let value = match[2];
    if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
    attrs[match[1].toUpperCase()] = value;
  }
  return attrs;
}

function parseMasterPlaylist(text, masterUrl) {
  const lines = text.split(/\r?\n/).map(line => line.trim());
  const variants = [];
  let pending = null;
  for (const line of lines) {
    if (line.startsWith('#EXT-X-STREAM-INF:')) {
      pending = parseAttributeList(line.slice('#EXT-X-STREAM-INF:'.length));
      continue;
    }
    if (pending && line && !line.startsWith('#')) {
      variants.push({ url: new URL(line, masterUrl).href, attrs: pending });
      pending = null;
    }
  }
  return variants;
}

function parseByteRange(value, previousEnd = 0) {
  const match = String(value).trim().match(/^(\d+)(?:@(\d+))?$/);
  if (!match) return null;
  const length = Number(match[1]);
  const start = match[2] === undefined ? previousEnd : Number(match[2]);
  return { start, end: start + length - 1 };
}

test('master playlist resolves relative variants', () => {
  const data = '#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=2500000,RESOLUTION=1280x720\n720p/video.m3u8\n';
  const [item] = parseMasterPlaylist(data, 'https://cdn.example/video/playlist.m3u8');
  assert.equal(item.url, 'https://cdn.example/video/720p/video.m3u8');
  assert.equal(item.attrs.RESOLUTION, '1280x720');
});

test('byterange handles explicit and implicit offsets', () => {
  assert.deepEqual(parseByteRange('100@50'), { start: 50, end: 149 });
  assert.deepEqual(parseByteRange('100', 150), { start: 150, end: 249 });
});
