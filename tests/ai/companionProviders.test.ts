import test from 'node:test';
import assert from 'node:assert/strict';
import { sendCompanionRequest } from '../../src/adapters/ai/providerClient.ts';

const cartography = {
  name: 'Cartographie de test',
  secretInternalNote: 'NE PAS TRANSMETTRE',
  domains: [{ id: 'd1', name: 'Finance', code: 'FIN' }],
  capabilities: [{ id: 'c1', name: 'Comptabilité générale', domainId: 'd1', businessOwner: 'Direction financière' }],
  applications: [{ id: 'a1', name: 'ERP Finance', capabilityIds: ['c1'] }],
};

const response = data => ({ ok: true, status: 200, json: async () => data });

test('Ollama utilise /api/chat et extrait la réponse textuelle', async () => {
  let request;
  const answer = await sendCompanionRequest({
    provider: 'ollama', model: 'llama3.2', endpoint: 'http://localhost:11434',
    question: 'Quelles capacités sont couvertes ?', cartography, personaInstructions: 'Tu es Rico : curieux, concis et méthodique.',
    fetchImpl: async (url, options) => {
      request = { url, options };
      return response({ message: { content: 'La capacité Comptabilité générale.' } });
    },
  });
  assert.equal(answer, 'La capacité Comptabilité générale.');
  assert.equal(request.url, 'http://localhost:11434/api/chat');
  assert.equal(JSON.parse(request.options.body).stream, true);
  assert.match(JSON.parse(request.options.body).messages[0].content, /TOGAF/);
  assert.match(JSON.parse(request.options.body).messages[0].content, /Tu es Rico : curieux, concis et méthodique/);
  const messages = JSON.parse(request.options.body).messages;
  const contextMessage = messages.at(-1).content;
  assert.match(contextMessage, /Quelles capacités sont couvertes/);
  assert.match(contextMessage, /Cartographie de test/);
  assert.match(contextMessage, /Comptabilité générale/);
  assert.match(contextMessage, /ERP Finance/);
  assert.match(contextMessage, /Direction financière/);
  assert.doesNotMatch(contextMessage, /NE PAS TRANSMETTRE/);
  assert.doesNotMatch(messages[0].content, /Comptabilité générale/);
});

test('Ollama diffuse les fragments reçus et les expose au fil de la lecture', async () => {
  const chunks = [
    '{"message":{"content":"Bonjour"},"done":false}\n{"message":{"content":" !"},"done":false}\n',
    '{"message":{"content":" Comment puis-je aider ?"},"done":true}\n',
  ];
  const encoded = chunks.map(chunk => new TextEncoder().encode(chunk));
  let index = 0;
  const received = [];
  const answer = await sendCompanionRequest({
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

test('Ollama montre la réflexion Qwen avant le premier fragment de réponse, sans la mélanger au résultat', async () => {
  const ndjson = [
    JSON.stringify({ message: { thinking: 'Je vérifie les capacités…' }, done: false }),
    JSON.stringify({ message: { thinking: ' puis les relations.' }, done: false }),
    JSON.stringify({ message: { content: 'La capacité Finance' }, done: false }),
    JSON.stringify({ message: { content: ' est couverte.' }, done: true }),
  ].join('\n') + '\n';
  const encoded = new TextEncoder().encode(ndjson);
  const chunks = [encoded.slice(0, 37), encoded.slice(37, 54), encoded.slice(54, 122), encoded.slice(122)];
  const events = [];
  let index = 0;
  const answer = await sendCompanionRequest({
    provider: 'ollama', model: 'qwen3.5:4b', question: 'La capacité est-elle couverte ?', cartography,
    onThinkingChunk: chunk => events.push(['thinking', chunk]),
    onChunk: chunk => events.push(['answer', chunk]),
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      body: { getReader: () => ({
        read: async () => index < chunks.length
          ? { value: chunks[index++], done: false }
          : { value: undefined, done: true },
        releaseLock() {},
      }) },
    }),
  });
  assert.equal(answer, 'La capacité Finance est couverte.');
  assert.deepEqual(events, [
    ['thinking', 'Je vérifie les capacités…'],
    ['thinking', ' puis les relations.'],
    ['answer', 'La capacité Finance'],
    ['answer', ' est couverte.'],
  ]);
});

test('Ollama conserve la réflexion lors du repli JSON non-streamé', async () => {
  const events = [];
  const answer = await sendCompanionRequest({
    provider: 'ollama', model: 'qwen3.5:4b', question: 'Examine la carte', cartography,
    onThinkingChunk: chunk => events.push(['thinking', chunk]),
    onChunk: chunk => events.push(['answer', chunk]),
    fetchImpl: async () => response({ message: { thinking: 'Analyse.', content: 'Résultat.' }, done: true }),
  });
  assert.equal(answer, 'Résultat.');
  assert.deepEqual(events, [['thinking', 'Analyse.'], ['answer', 'Résultat.']]);
});

test('Ollama signale une ligne de flux invalide au lieu de masquer silencieusement des fragments', async () => {
  await assert.rejects(sendCompanionRequest({
    provider: 'ollama', model: 'qwen3.5:4b', question: 'Examine la carte', cartography,
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      body: { getReader: () => {
        let read = false;
        return {
          read: async () => {
            if (read) return { done: true };
            read = true;
            return { value: new TextEncoder().encode('texte invalide\n'), done: false };
          },
          releaseLock() {},
        };
      } },
    }),
  }), /flux JSON invalide/);
});

test('Ollama analyse les lignes JSON du flux même sans lecteur streaming', async () => {
  const chunks = [
    { message: { content: 'Bonjour' }, done: false },
    { message: { content: ' !' }, done: false },
    { message: { content: ' Je suis là.' }, done: true },
  ];
  const received = [];
  const answer = await sendCompanionRequest({
    provider: 'ollama', model: 'qwen2.5:0.5b', endpoint: 'http://localhost:11434',
    question: 'Bonjour', cartography,
    onChunk: chunk => received.push(chunk),
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      text: async () => chunks.map(chunk => JSON.stringify(chunk)).join('\n'),
    }),
  });
  assert.equal(answer, 'Bonjour ! Je suis là.');
  assert.deepEqual(received, ['Bonjour', ' !', ' Je suis là.']);
});

test('OpenAI envoie la clé dans le header et lit choices[0].message.content', async () => {
  let request;
  const answer = await sendCompanionRequest({
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
  const answer = await sendCompanionRequest({
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
  const userMessage = JSON.parse(request.options.body).contents.at(-1).parts[0].text;
  assert.match(userMessage, /Explique la couverture/);
  assert.match(userMessage, /ERP Finance/);
  assert.match(userMessage, /Comptabilité générale/);
});

test('refuse les appels cloud sans clé API', async () => {
  await assert.rejects(
    sendCompanionRequest({ provider: 'openai', model: 'gpt-test', question: 'Question', cartography, fetchImpl: async () => response({}) }),
    /clé API/
  );
});

test('masque le corps de réponse du fournisseur dans les erreurs HTTP', async () => {
  await assert.rejects(
    sendCompanionRequest({
      provider: 'ollama', model: 'llama3.2', question: 'Question', cartography,
      fetchImpl: async () => ({ ok: false, status: 503, json: async () => ({ error: 'internal details' }) }),
    }),
    error => error.message.includes('503') && !error.message.includes('internal details')
  );
});
