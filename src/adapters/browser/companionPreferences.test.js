import test from 'node:test';
import assert from 'node:assert/strict';
import { createCompanionPreferencesAdapter } from './companionPreferences.ts';

const KEY = 'enterprise-capacity-mapper:companion-provider-preferences';

function withStorage(run) {
  const values = new Map();
  const originalWindow = globalThis.window;
  globalThis.window = { localStorage: {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  } };
  try { run(values); } finally {
    if (originalWindow === undefined) delete globalThis.window;
    else globalThis.window = originalWindow;
  }
}

test('companion preferences provide safe defaults when nothing is saved', () => {
  withStorage(() => {
    const adapter = createCompanionPreferencesAdapter();
    assert.deepEqual(adapter.load(), { provider: 'ollama', model: 'llama3.2', endpoint: 'http://localhost:11434', enabled: false });
    assert.equal(adapter.defaults.openai.label, 'OpenAI');
  });
});

test('companion preferences round-trip only supported settings', () => {
  withStorage(values => {
    const adapter = createCompanionPreferencesAdapter();
    adapter.save({ provider: 'openai', model: 'gpt-test', endpoint: 'https://example.test', enabled: true, apiKey: 'must-not-persist' });
    assert.deepEqual(adapter.load(), { provider: 'openai', model: 'gpt-test', endpoint: 'https://example.test', enabled: true });
    assert.equal(JSON.parse(values.get(KEY)).apiKey, undefined);
  });
});

test('companion preferences reject unknown providers and recover from malformed JSON', () => {
  withStorage(values => {
    const adapter = createCompanionPreferencesAdapter();
    values.set(KEY, JSON.stringify({ provider: 'unknown', model: 'x', endpoint: 'x', enabled: true }));
    assert.equal(adapter.load().provider, 'ollama');
    values.set(KEY, '{bad json');
    assert.equal(adapter.load().enabled, false);
  });
});
