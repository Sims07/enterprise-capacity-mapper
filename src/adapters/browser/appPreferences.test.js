import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppPreferences } from './appPreferences.js';

const createStorage = (initial = {}) => {
  const values = new Map(Object.entries(initial));
  const calls = [];
  return {
    values,
    calls,
    getItem(key) { calls.push(['get', key]); return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { calls.push(['set', key, String(value)]); values.set(key, String(value)); },
    removeItem(key) { calls.push(['remove', key]); values.delete(key); },
  };
};

test('app preferences read and write theme and active map ids through injected storage', () => {
  const storage = createStorage({
    'enterprise-capacity-mapper:theme': 'dark',
    'enterprise-capacity-mapper:active-local-map': 'local-1',
    'enterprise-capacity-mapper:active-recent-map': 'recent-1',
  });
  const preferences = createAppPreferences({ storage });

  assert.equal(preferences.readTheme(), 'dark');
  assert.equal(preferences.readActiveLocalMapId(), 'local-1');
  assert.equal(preferences.readActiveRecentMapId('fallback'), 'recent-1');
  preferences.writeTheme('light');
  preferences.writeActiveLocalMapId('local-2');
  preferences.writeActiveRecentMapId('recent-2');
  preferences.clearActiveLocalMapId();

  assert.equal(storage.values.get('enterprise-capacity-mapper:theme'), 'light');
  assert.equal(storage.values.get('enterprise-capacity-mapper:active-local-map'), undefined);
  assert.equal(storage.values.get('enterprise-capacity-mapper:active-recent-map'), 'recent-2');
});

test('app preferences use safe defaults and can clear the source URL', () => {
  const storage = createStorage();
  const preferences = createAppPreferences({ storage });

  assert.equal(preferences.readTheme(), 'light');
  assert.equal(preferences.readSourceUrl(), '');
  assert.equal(preferences.readActiveLocalMapId(), '');
  assert.equal(preferences.readActiveRecentMapId('recent-fallback'), 'recent-fallback');
  preferences.clearSourceUrl();
  assert.deepEqual(storage.calls, [
    ['get', 'enterprise-capacity-mapper:theme'],
    ['get', 'enterprise-capacity-mapper:source-url'],
    ['get', 'enterprise-capacity-mapper:active-local-map'],
    ['get', 'enterprise-capacity-mapper:active-recent-map'],
    ['remove', 'enterprise-capacity-mapper:source-url'],
  ]);
});
