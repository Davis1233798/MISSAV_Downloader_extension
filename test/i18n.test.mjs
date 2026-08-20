import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const locales = ['en', 'zh_TW', 'zh_CN', 'ja', 'ko', 'es'];
const load = async locale => JSON.parse(await readFile(new URL(`../extension/_locales/${locale}/messages.json`, import.meta.url), 'utf8'));
const english = await load('en');
const expectedKeys = Object.keys(english).sort();

test('all supported locales have complete message catalogs', async () => {
  for (const locale of locales) {
    const messages = await load(locale);
    assert.deepEqual(Object.keys(messages).sort(), expectedKeys, `${locale} message keys differ from en`);
    for (const [key, value] of Object.entries(messages)) {
      assert.equal(typeof value.message, 'string', `${locale}.${key}.message must be a string`);
      assert.ok(value.message.trim(), `${locale}.${key}.message must not be empty`);
    }
  }
});

test('required button labels are localized', async () => {
  const required = ['copyLink', 'multiSourceDownload', 'copyExternalCommand', 'directDownload', 'rescanSources', 'addMirror'];
  for (const locale of locales) {
    const messages = await load(locale);
    for (const key of required) assert.ok(messages[key]?.message, `${locale} missing ${key}`);
  }
});
