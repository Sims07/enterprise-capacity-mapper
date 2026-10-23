import test from 'node:test';
import assert from 'node:assert/strict';
import { sendCompanionMessage } from '../../src/services/ai/companionProviders.js';

const cartography = {
  name: 'Cartographie de test',
  secretInternalNote: 'NE PAS TRANSMETTRE',
  domains: [{ id: 'd1', name: 'Finance', code: 'FIN' }],
  capabilities: [{ id: 'c1', name: 'Comptabilité générale', domainId: 'd1' }],
  applications: [{ id: 'a1', name: 'ERP Finance', capabilityIds: ['c1'] }],
};

const response = data => ({ ok: true, status: 200, json: async () => data });

test('Ollama utilise /api/chat et extrait la réponse textuelle', async () => {
  let request;
  const answer = await sendCompanionMessage({
    provider: 'ollama', model: 'llama3.2', endpoint: 'http://localhost:11434',
    question: 'Quelles capacités sont couvertes ?', cartography,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return response({ message: { content: 'La capacité Comptabilité générale.' } });
    },
  });
  assert.equal(answer, 'La capacité Comptabilité générale.');
  assert.equal(request.url, 'http://localhost:11434/api/chat');
  assert.equal(JSON.parse(request.options.body).stream, true);
  assert.match(JSON.parse(request.options.body).messages[0].content, /TOGAF/);
  assert.doesNotMatch(JSON.parse(request.options.body).messages[0].content, /NE PAS TRANSMETTRE/);
});

test('Ollama diffuse les fragments reçus et les expose au fil de la lecture', async () => {
  const chunks = [
    '{"message":{"content":"Bonjour"},"done":false}\\n{"message":{"content":" !"},"done":false}\\n',
    '{"message":{"content":" Comment puis-je aider ?"},"done":true}\\n',
  ];
  const encoded = chunks.map(chunk => new TextEncoder().encode(chunk));
  let index = 0;
  const received = [];
  const answer = await sendCompanionMessage({
    provider: 'ollama', model: 'llama3.1', endpoint: 'http://localhost:11434',
    question: 'Bonjour', cartography,
    onChunk: chunk => received.push(chunk),
    fetchImpl: async (url, options) => {
      assert.equal(url, 'http://localhost:11434/api/chat');
      assert.equal(JSON.parse(options.body).stream, true);
      return {
        ok: true,
        status: 200,
        body: {
          getReader: () => ({
            read: async () => index < encoded.length
              ? { value: encoded[index++], done: false }
              : { value: undefined, done: true },
            releaseLock() {},
          }),
        },
      };
    },
  });
  assert.equal(answer, 'Bonjour ! Comment puis-je aider ?');
  assert.deepEqual(received, ['Bonjour', ' !', ' Comment puis-je aider ?']);
});

test('OpenAI envoie la clé dans le header et lit choices[0].message.content', async () => {
  let request;
  const answer = await sendCompanionMessage({
    provider: 'openai', model: 'gpt-test', endpoint: 'https://api.example.test',
    apiKey: 'test-secret', question: 'Évalue cette carte', cartography,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return response({ choices: [{ message: { content: 'Revue terminée.' } }] });
    },
  });
  assert.equal(answer, 'Revue terminée.');
  assert.equal(request.url, 'https://api.example.test/v1/chat/completions');
  assert.equal(request.options.headers.Authorization, 'Bearer test-secret');
  assert.doesNotMatch(request.options.body, /test-secret/);
});

test('Gemini utilise le modèle configuré et extrait les parties de texte', async () => {
  let request;
  const answer = await sendCompanionMessage({
    provider: 'gemini', model: 'gemini-test', endpoint: 'https://generativelanguage.googleapis.com',
    apiKey: 'test-secret', question: 'Explique la couverture', cartography,
    fetchImpl: async (url, options) => {
      request = { url, options };
      return response({ candidates: [{ content: { parts: [{ text: 'Premier point.' }, { text: 'Deuxième point.' }] } }] });
    },
  });
  assert.equal(answer, 'Premier point.\nDeuxième point.');
  assert.match(request.url, /models\/gemini-test:generateContent$/);
  assert.equal(request.options.headers['x-goog-api-key'], 'test-secret');
  assert.doesNotMatch(request.url, /test-secret/);
  assert.match(JSON.parse(request.options.body).systemInstruction.parts[0].text, /TOGAF/);
  assert.equal(JSON.parse(request.options.body).contents.at(-1).parts[0].text, 'Explique la couverture');
});

test('refuse les appels cloud sans clé API', async () => {
  await assert.rejects(
    sendCompanionMessage({ provider: 'openai', model: 'gpt-test', question: 'Question', cartography, fetchImpl: async () => response({}) }),
    /clé API/
  );
});

test('masque le corps de réponse du fournisseur dans les erreurs HTTP', async () => {
  await assert.rejects(
    sendCompanionMessage({
      provider: 'ollama', model: 'llama3.2', question: 'Question', cartography,
      fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({ error: 'internal details' }) }),
    }),
    error => error.message.includes('503') && !error.message.includes('internal details')
  );
});
