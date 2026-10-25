import { sendCompanionRequest } from './providerClient.ts';
import type { AiCompanionPort, AiQuestion } from '../../ports/aiCompanion.ts';

type CompanionAiSettings = { provider?: string; model?: string; endpoint?: string; apiKey?: string };
type CompanionSender = (input: Record<string, unknown>) => unknown | Promise<unknown>;

/** Provider-specific adapter implementing the AI companion port. */
export const createCompanionAiAdapter = ({
  provider,
  model,
  endpoint,
  apiKey,
  send = sendCompanionRequest,
}: CompanionAiSettings & { send?: CompanionSender } = {}): AiCompanionPort => Object.freeze({
  ask: ({ question, cartography, history = [], onChunk }: AiQuestion) => send({
    provider, model, endpoint, apiKey, question, cartography, history, onChunk,
  }),
});
