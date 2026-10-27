import { afterAll, beforeAll, beforeEach, vi } from 'vitest';
import test from 'node:test';
import assert from 'node:assert/strict';

type Listener = (event: any) => void;
const listeners = new Map<string, Listener>();
let selectedTarget: any = null;
const timeouts: Array<{ callback: () => void; delay: number }> = [];
class FakeElement {
  closest(selector: string) {
    return selector === '.dashboard-target, .dashboard-map-capability, .dashboard-gap-domain-list button'
      ? this
      : null;
  }
}
const fakeDocument = {
  addEventListener: (name: string, listener: Listener) => listeners.set(name, listener),
  querySelector: (selector: string) => selector === '.tree-row.impact-highlight' ? selectedTarget : null,
};
const fakeWindow = {
  setTimeout: (callback: () => void, delay: number) => {
    timeouts.push({ callback, delay });
    return timeouts.length;
  },
};

vi.stubGlobal('document', fakeDocument);
vi.stubGlobal('Element', FakeElement);
vi.stubGlobal('window', fakeWindow);

beforeAll(async () => {
  await import('./analysis-navigation.ts');
});
beforeEach(() => {
  selectedTarget = null;
  timeouts.length = 0;
});
afterAll(() => vi.unstubAllGlobals());

test('ignores clicks that do not originate from an Element', () => {
  listeners.get('click')?.({ target: {} });
  assert.equal(timeouts.length, 0);
});

test('ignores clicks outside dashboard navigation targets', () => {
  class OtherElement extends FakeElement {
    override closest() { return null; }
  }
  listeners.get('click')?.({ target: new OtherElement() });
  assert.equal(timeouts.length, 0);
});

test('scrolls the selected impact row into view and clears its focus marker', () => {
  const attributes = new Map<string, string>();
  selectedTarget = {
    scrollIntoView: vi.fn(),
    setAttribute: (name: string, value: string) => attributes.set(name, value),
    removeAttribute: (name: string) => attributes.delete(name),
  };
  listeners.get('click')?.({ target: new FakeElement() });
  assert.equal(timeouts[0]?.delay, 0);
  timeouts.shift()?.callback();
  assert.equal(selectedTarget.scrollIntoView.mock.calls.length, 1);
  assert.equal(attributes.get('data-navigation-focused'), 'true');
  assert.equal(timeouts[0]?.delay, 1200);
  timeouts.shift()?.callback();
  assert.equal(attributes.has('data-navigation-focused'), false);
});

test('retries briefly when the selected row has not rendered yet', () => {
  listeners.get('click')?.({ target: new FakeElement() });
  timeouts.shift()?.callback();
  assert.equal(timeouts[0]?.delay, 50);
  selectedTarget = {
    scrollIntoView: vi.fn(),
    setAttribute: vi.fn(),
    removeAttribute: vi.fn(),
  };
  timeouts.shift()?.callback();
  assert.equal(selectedTarget.scrollIntoView.mock.calls.length, 1);
});

test('stops retrying after the maximum number of attempts', () => {
  listeners.get('click')?.({ target: new FakeElement() });
  timeouts.shift()?.callback();
  for (let i = 0; i < 19; i += 1) timeouts.shift()?.callback();
  assert.equal(timeouts.length, 0);
});
