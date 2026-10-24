/**
 * Outbound port for the AI companion.
 * The application asks for an answer; it does not know which AI provider is used.
 */
export const createAiCompanionPort = ({ send }) => {
  if (typeof send !== 'function') throw new TypeError('AiCompanion port requires a send function');

  return Object.freeze({
    ask: ({ question, cartography, history = [], onChunk }) => send({
      question,
      cartography,
      history,
      onChunk,
    }),
  });
};
