import test from 'node:test';
import assert from 'node:assert/strict';
import { createNavigationPort } from './navigation.js';

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
  return { history, calls };
};

test('navigation port changes mode while preserving unrelated history state', () => {
  const { history, calls } = createBrowserHistory();
  const changedModes = [];
  const navigation = createNavigationPort({
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

test('navigation port rejects unsupported modes without mutating history', () => {
  const { history, calls } = createBrowserHistory();
  const navigation = createNavigationPort({ history, location: { href: '/' } });

  assert.throws(() => navigation.goTo('unknown'), /Mode de navigation inconnu/);
  assert.equal(calls.length, 0);
});
