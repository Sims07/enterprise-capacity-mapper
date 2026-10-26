import { sendCompanionRequest } from './providerClient.ts';
import type { AiCompanionPort, AiQuestion } from '../../ports/aiCompanion.ts';

type CompanionAiSettings = { provider?: string; model?: string; endpoint?: string; apiKey?: string };
type CompanionSender = typeof sendCompanionRequest;

/** Provider-specific adapter implementing the AI companion port. */
export const createCompanionAiAdapter = ({
  provider,
  model,
  endpoint,
  apiKey,
  send = sendCompanionRequest,
}: CompanionAiSettings & { send?: CompanionSender } = {}) => {
  const adapter = {
    ask: ({ question, cartography, history = [], personaInstructions, onChunk }: AiQuestion) => send({
      provider, model, endpoint, apiKey, question, cartography, history, personaInstructions, onChunk,
    }),
  } satisfies AiCompanionPort;
  return Object.freeze(adapter);
};
