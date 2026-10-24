import test from 'node:test';
import assert from 'node:assert/strict';
import { createAiCompanionPort } from './aiCompanion.js';

test('AI companion port delegates the use case without knowing the provider', async () => {
  const received = [];
  const port = createAiCompanionPort({
    send: async request => {
      received.push(request);
      return 'Réponse';
    },
  });

  const onChunk = () => {};
  const answer = await port.ask({
    question: 'Que couvre cette application ?',
    cartography: { capabilities: [] },
    history: [],
    onChunk,
  });

  assert.equal(answer, 'Réponse');
  assert.equal(received[0].question, 'Que couvre cette application ?');
  assert.equal(received[0].onChunk, onChunk);
  assert.deepEqual(received[0].cartography, { capabilities: [] });
});
