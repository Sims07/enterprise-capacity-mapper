import test from 'node:test';
import assert from 'node:assert/strict';
import { sortLibraryEntriesByDate } from './sortLibraryEntries.ts';

test('sorts named backups by last save date, newest first, without changing source or storage order', () => {
  const entries = [
    { id: 'old', updatedAt: '2026-11-05T09:26:00Z' },
    { id: 'latest', updatedAt: '2026-11-09T16:04:00Z' },
    { id: 'older', updatedAt: '2026-11-06T11:41:00Z' },
  ];
  assert.deepEqual(sortLibraryEntriesByDate(entries, 'saved').map(item => item.id), ['latest', 'older', 'old']);
  assert.deepEqual(entries.map(item => item.id), ['old', 'latest', 'older']);
});

test('sorts history by openedAt, never by backup updatedAt', () => {
  const entries = [
    { id: 'first', openedAt: '2026-11-06T11:34:00Z', updatedAt: '2026-11-09T23:00:00Z' },
    { id: 'second', openedAt: '2026-11-09T10:08:00Z', updatedAt: '2026-11-01T08:00:00Z' },
  ];
  assert.deepEqual(sortLibraryEntriesByDate(entries, 'recent').map(item => item.id), ['second', 'first']);
});

test('puts missing/invalid dates last and preserves stable ordering for identical dates', () => {
  const entries = [
    { id: 'missing' },
    { id: 'same-1', updatedAt: '2026-11-09T10:00:00Z' },
    { id: 'invalid', updatedAt: 'invalid' },
    { id: 'same-2', updatedAt: '2026-11-09T10:00:00Z' },
  ];
  assert.deepEqual(sortLibraryEntriesByDate(entries, 'saved').map(item => item.id), ['same-1', 'same-2', 'missing', 'invalid']);
  assert.deepEqual(sortLibraryEntriesByDate([], 'recent'), []);
});
