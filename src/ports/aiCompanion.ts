import type { CatalogModel } from '../domain/catalogModel.ts';

export type AiHistoryEntry = { role: string; content: string; [key: string]: unknown };
export type AiQuestion = {
  question: string;
  cartography: CatalogModel;
  history?: AiHistoryEntry[];
  onChunk?: (chunk: string) => void;
};

/** Outbound contract for asking the AI companion, independent of any provider. */
export interface AiCompanionPort {
  ask(input: AiQuestion): unknown | Promise<unknown>;
}
