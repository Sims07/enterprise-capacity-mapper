import type { CatalogModel } from '../application/catalogUseCases.ts';

export type AiHistoryEntry = { role: string; content: string; [key: string]: unknown };
export type AiQuestion = {
  question: string;
  cartography: CatalogModel;
  history?: AiHistoryEntry[];
  onChunk?: (chunk: string) => void;
};
export type AiCompanionPort = { ask: (input: AiQuestion) => unknown | Promise<unknown> };
export type AiCompanionSender = (input: AiQuestion) => unknown | Promise<unknown>;

/** Outbound port for the AI companion. */
export const createAiCompanionPort = ({ send }: { send: AiCompanionSender }): AiCompanionPort => {
  if (typeof send !== 'function') throw new TypeError('AiCompanion port requires a send function');
  return Object.freeze({
    ask: ({ question, cartography, history = [], onChunk }: AiQuestion) => send({ question, cartography, history, onChunk }),
  });
};
