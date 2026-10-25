import test from 'node:test';
import assert from 'node:assert/strict';
import { createBrowserNavigationAdapter } from '../adapters/browser/navigationAdapter.ts';

const createBrowserHistory = () => {
  const calls = [];
  const history = {
    state: { custom: 'preserved' },
    pushState(state, _title, url) {
      calls.push({ method: 'pushState', state, url });
      this.state = state;
    },
    replaceState(state, _title, url) {
      calls.push({ method: 'replaceState', state, url });
      this.state = state;
    },
  };
  const eventCalls = [];
  const listeners = new Map();
  const eventTarget = {
    addEventListener(type, handler) { eventCalls.push(['add', type]); listeners.set(type, handler); },
    removeEventListener(type, handler) { eventCalls.push(['remove', type]); if (listeners.get(type) === handler) listeners.delete(type); },
    dispatch(type, event) { listeners.get(type)?.(event); },
  };
  history.back = () => calls.push({ method: 'back' });
  return { history, calls, eventCalls, eventTarget };
};

test('browser navigation adapter changes mode while preserving unrelated history state', () => {
  const { history, calls } = createBrowserHistory();
  const changedModes = [];
  const navigation = createBrowserNavigationAdapter({
    history,
    location: { href: 'https://example.test/app/' },
    onModeChange: mode => changedModes.push(mode),
  });

  navigation.goTo('relations');

  assert.deepEqual(calls, [{
    method: 'pushState',
    state: { custom: 'preserved', capacityMapperMode: 'relations', dashboardReturn: false },
    url: 'https://example.test/app/',
  }]);
  assert.deepEqual(changedModes, ['relations']);
  assert.equal(navigation.currentMode(), 'relations');
});

test('browser navigation adapter rejects unsupported modes without mutating history', () => {
  const { history, calls } = createBrowserHistory();
  const navigation = createBrowserNavigationAdapter({ history, location: { href: '/' } });

  assert.throws(() => navigation.goTo('unknown'), /Mode de navigation inconnu/);
  assert.equal(calls.length, 0);
});


test('browser navigation adapter owns initialization, dashboard exploration, back and popstate subscription', () => {
  const { history, calls, eventCalls, eventTarget } = createBrowserHistory();
  const changedModes = [];
  const navigation = createBrowserNavigationAdapter({
    history,
    location: { href: 'https://example.test/app/' },
    eventTarget,
    onModeChange: mode => changedModes.push(mode),
  });
  navigation.initialize('editor');
  navigation.exploreDashboardTarget();
  assert.equal(history.state.capacityMapperMode, 'relations');
  assert.equal(history.state.dashboardReturn, true);
  assert.deepEqual(changedModes, ['editor', 'relations']);

  const events = [];
  const unsubscribe = navigation.subscribePopState(event => events.push(event.state.capacityMapperMode));
  eventTarget.dispatch('popstate', { state: { capacityMapperMode: 'dashboard' } });
  unsubscribe();
  navigation.back();

  assert.deepEqual(events, ['dashboard']);
  assert.deepEqual(eventCalls, [['add', 'popstate'], ['remove', 'popstate']]);
  assert.deepEqual(calls.map(call => call.method), ['replaceState', 'pushState', 'back']);
});
