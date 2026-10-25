import { sendCompanionRequest } from './providerClient.ts';
import { createAiCompanionPort } from '../../ports/aiCompanion.ts';

type CompanionAiSettings = { provider?: string; model?: string; endpoint?: string; apiKey?: string };

/**
 * Infrastructure adapter for the AI provider implementation currently used by
 * the companion. Provider selection remains an outer concern.
 *
 * Configuration is supplied by the composition root so the application port
 * remains independent from provider-specific settings.
 */
export const createCompanionAiAdapter = ({
  provider,
  model,
  endpoint,
  apiKey,
}: CompanionAiSettings = {}) => createAiCompanionPort({
  send: ({ question, cartography, history, onChunk }) => sendCompanionRequest({
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
