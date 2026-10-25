export type CompanionProviderSettings = {
  provider: string;
  model: string;
  endpoint: string;
  enabled: boolean;
};

export interface CompanionPreferencesPort {
  load(): CompanionProviderSettings;
  save(settings: CompanionProviderSettings): void;
  defaults: Readonly<Record<string, { label: string; model: string; endpoint: string }>>;
}
