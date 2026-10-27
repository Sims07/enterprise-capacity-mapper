import { afterAll, beforeAll, beforeEach, vi } from 'vitest';
import test from 'node:test';
import assert from 'node:assert/strict';

type Listener = (event: any) => void;
const listeners = new Map<string, Listener>();
const insideTarget = {};
const outsideTarget = {};
const toggle = { focus: vi.fn() };
const menu = {
  open: true,
  contains: (target: unknown) => target === insideTarget,
  hasAttribute(name: string) { return name === 'open' && this.open; },
  removeAttribute(name: string) { if (name === 'open') this.open = false; },
  querySelector: (selector: string) => selector === '[data-testid="tools-menu-toggle"]' ? toggle : null,
};
const fakeDocument = {
  addEventListener: (name: string, listener: Listener) => listeners.set(name, listener),
  querySelector: (selector: string) => selector === '[data-testid="tools-menu"]' ? menu : null,
};

vi.stubGlobal('document', fakeDocument);

beforeAll(async () => {
  await import('./toolsMenuBehavior.ts');
});
beforeEach(() => {
  menu.open = true;
  toggle.focus.mockClear();
});
afterAll(() => vi.unstubAllGlobals());

test('closes an open tools menu on an outside pointer event', () => {
  listeners.get('pointerdown')?.({ target: outsideTarget });
  assert.equal(menu.open, false);
});

test('keeps the tools menu open when pointer events originate inside it', () => {
  listeners.get('pointerdown')?.({ target: insideTarget });
  assert.equal(menu.open, true);
});

test('escape closes the menu and returns focus to its toggle', () => {
  listeners.get('keydown')?.({ key: 'Escape' });
  assert.equal(menu.open, false);
  assert.equal(toggle.focus.mock.calls.length, 1);
});

test('other keyboard keys do not close the menu', () => {
  listeners.get('keydown')?.({ key: 'Enter' });
  assert.equal(menu.open, true);
  assert.equal(toggle.focus.mock.calls.length, 0);
});
