import { sendCompanionMessage } from '../../services/ai/companionProviders.js';
import { createAiCompanionPort } from '../../ports/aiCompanion.js';

/**
 * Infrastructure adapter for the AI provider implementation currently used by
 * the companion. Provider selection remains an outer concern.
 */
export const createCompanionAiAdapter = ({ provider, model, endpoint, apiKey }) =>
  createAiCompanionPort({
    send: ({ question, cartography, history, onChunk }) => sendCompanionMessage({
      provider,
      model,
      endpoint,
      apiKey,
      question,
      cartography,
      history,
      onChunk,
    }),
  });
