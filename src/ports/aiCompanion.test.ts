import test from 'node:test';
import assert from 'node:assert/strict';
import { createCompanionAiAdapter } from '../adapters/ai/companionAdapter.ts';

test('AI provider adapter implements the port and forwards requests to its injected sender', async () => {
  const received = [];
  const adapter = createCompanionAiAdapter({
    provider: 'test-provider',
    send: async request => {
      received.push(request);
      return 'Réponse';
    },
  });

  const onChunk = () => {};
  const answer = await adapter.ask({
    question: 'Que couvre cette application ?',
    cartography: { capabilities: [] },
    history: [],
    onChunk,
  });

  assert.equal(answer, 'Réponse');
  assert.equal(received[0].provider, 'test-provider');
  assert.equal(received[0].question, 'Que couvre cette application ?');
  assert.equal(received[0].onChunk, onChunk);
  assert.deepEqual(received[0].cartography, { capabilities: [] });
});
