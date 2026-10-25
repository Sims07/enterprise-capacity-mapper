export const NAVIGATION_MODES = ['editor', 'dashboard', 'relations', 'impact', 'library'] as const;
export type NavigationMode = typeof NAVIGATION_MODES[number];

export type NavigationState = {
  capacityMapperMode?: NavigationMode;
  dashboardReturn?: boolean;
  [key: string]: unknown;
};

/** Inbound/outbound navigation contract used by the application layer. */
export interface NavigationPort {
  currentMode(): NavigationMode;
  initialize(mode: NavigationMode): void;
  goTo(mode: NavigationMode): void;
  exploreDashboardTarget(): void;
  replaceMode(mode: NavigationMode, extra?: Record<string, unknown>): void;
  back(): void;
  subscribePopState(handler: EventListener): () => void;
}
