import { PROVIDER_DEFAULTS } from '../ai/providerClient.ts';
import type { CompanionPreferencesPort, CompanionProviderSettings } from '../../ports/companionPreferences.ts';

const PREFERENCES_KEY = 'enterprise-capacity-mapper:companion-provider-preferences';

/** Browser adapter for provider preferences; storage access stays outside UI/application. */
export const createCompanionPreferencesAdapter = (): CompanionPreferencesPort => Object.freeze({
  defaults: PROVIDER_DEFAULTS,
  load(): CompanionProviderSettings {
    const fallback: CompanionProviderSettings = {
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
  },
  save(settings: CompanionProviderSettings): void {
    const safeSettings: CompanionProviderSettings = {
      provider: settings.provider,
      model: settings.model,
      endpoint: settings.endpoint,
      enabled: settings.enabled === true,
    };
    try {
      window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(safeSettings));
    } catch {
      // The companion remains usable for the current session if storage is unavailable.
    }
  },
});
