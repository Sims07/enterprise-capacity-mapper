import type { CatalogModel } from '../domain/catalogModel.ts';

export type AiHistoryEntry = { role: string; content: string; [key: string]: unknown };
export type AiQuestion = {
  question: string;
  cartography: CatalogModel;
  history?: AiHistoryEntry[];
  /** Instructions de rôle et de style injectées dans le message système, jamais dans la question utilisateur. */
  personaInstructions?: string;
  onChunk?: (chunk: string) => void;
};

/** Outbound contract for asking the AI companion, independent of any provider. */
export interface AiCompanionPort {
  ask(input: AiQuestion): string | Promise<string>;
}
