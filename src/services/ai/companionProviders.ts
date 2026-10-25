import { sendCompanionRequest, PROVIDER_DEFAULTS } from '../../adapters/ai/providerClient.ts';

const PREFERENCES_KEY = 'enterprise-capacity-mapper:companion-provider-preferences';

export { PROVIDER_DEFAULTS };

/**
 * Compatibility/application-facing preferences API.
 * Provider HTTP details live in the AI infrastructure adapter.
 */
export function loadCompanionProviderPreferences() {
  const fallback = {
    provider: 'ollama',
    model: PROVIDER_DEFAULTS.ollama.model,
    endpoint: PROVIDER_DEFAULTS.ollama.endpoint,
    enabled: false,
  };
  try {
    const saved = JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) || 'null');
    if (!saved || !Object.hasOwn(PROVIDER_DEFAULTS, saved.provider)) return fallback;
    return {
      provider: saved.provider,
      model: typeof saved.model === 'string' && saved.model.trim() ? saved.model : PROVIDER_DEFAULTS[saved.provider].model,
      endpoint: typeof saved.endpoint === 'string' && saved.endpoint.trim() ? saved.endpoint : PROVIDER_DEFAULTS[saved.provider].endpoint,
      enabled: saved.enabled === true,
    };
  } catch {
    return fallback;
  }
}

export function saveCompanionProviderPreferences(preferences) {
  const safePreferences = {
    provider: preferences.provider,
    model: preferences.model,
    endpoint: preferences.endpoint,
    enabled: preferences.enabled === true,
  };
  try {
    window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(safePreferences));
  } catch {
    // The companion still works for this session when local storage is unavailable.
  }
}

/**
 * Compatibility facade kept for existing tests/callers.
 * New code should depend on the AiCompanion port through its adapter.
 */
export const sendCompanionMessage = sendCompanionRequest;
