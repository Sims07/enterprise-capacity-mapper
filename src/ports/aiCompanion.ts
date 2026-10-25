import type { CatalogModel } from '../application/catalogUseCases.ts';

export interface AiHistoryEntry {
  role: string;
  content: string;
  [key: string]: unknown;
}

export interface AiQuestion {
  question: string;
  cartography: CatalogModel;
  history?: AiHistoryEntry[];
  onChunk?: (chunk: string) => void;
}

export interface AiCompanionPort {
  ask(input: AiQuestion): unknown | Promise<unknown>;
}

export type AiCompanionSender = (input: AiQuestion) => unknown | Promise<unknown>;

/** Outbound port for the AI companion. */
export const createAiCompanionPort = ({ send }: { send: AiCompanionSender }): AiCompanionPort => {
  if (typeof send !== 'function') throw new TypeError('AiCompanion port requires a send function');
  return Object.freeze({
    ask: ({ question, cartography, history = [], onChunk }: AiQuestion) => send({ question, cartography, history, onChunk }),
  });
};
