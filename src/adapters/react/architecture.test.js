import test from 'node:test';
import assert from 'node:assert/strict';
import { createFrontendApplication } from './architecture.js';

const model = {
  metadata: { name: 'Injected map' },
  layout: { depth: 2 },
  domains: [],
  capabilities: [],
  applications: [],
};

test('frontend factory composes application services from injected dependencies', () => {
  const calls = [];
  const repository = {
    load: fallback => { calls.push(['load', fallback]); return fallback; },
    save: value => { calls.push(['save', value]); return value; },
  };
  const navigation = { goTo: mode => calls.push(['navigate', mode]) };
  const aiFactory = settings => ({ ask: question => ({ settings, question }) });

  const application = createFrontendApplication({
    initialModel: model,
    repository,
    navigation,
    createAiCompanion: aiFactory,
  });

  assert.equal(application.repository, repository);
  assert.equal(application.navigation, navigation);
  assert.equal(application.map.snapshot().current, model);
  assert.deepEqual(calls, [['load', model]]);

  const settings = { provider: 'test-provider' };
  const companion = application.aiCompanion(settings);
  assert.deepEqual(companion.ask('question'), {
    settings,
    question: 'question',
  });
});

test('frontend factory returns a stable explicit set of application dependencies', () => {
  const repository = { load: fallback => fallback, save: () => {} };
  const navigation = { goTo: () => {} };
  const map = { snapshot: () => ({ current: model }) };
  const aiFactory = settings => ({ settings });

  const application = createFrontendApplication({
    repository,
    navigation,
    map,
    createAiCompanion: aiFactory,
  });

  assert.deepEqual(Object.keys(application), ['repository', 'navigation', 'map', 'aiCompanion']);
  assert.equal(application.map, map);
  assert.deepEqual(application.aiCompanion({ provider: 'injected' }), {
    settings: { provider: 'injected' },
  });
});
