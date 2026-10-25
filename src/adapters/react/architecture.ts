import type { CatalogModel } from '../../application/catalogUseCases.ts';
import { createCompanionAiAdapter } from '../ai/companionAdapter.ts';
import { createLocalStorageModelRepository } from '../browser/localStorageRepository.ts';
import { createAppPreferences } from '../browser/appPreferences.ts';
import { createBrowserViewport } from '../browser/browserViewport.ts';
import { createBrowserInteractions } from '../browser/browserInteractions.ts';
import { createMapService } from '../../application/mapService.ts';
import { createNavigationPort } from '../../ports/navigation.ts';

export type FrontendApplication = ReturnType<typeof createFrontendApplication>;
export type FrontendApplicationOptions = {
  initialModel: CatalogModel;
  onModeChange?: (mode: string) => void;
  ai?: Record<string, unknown>;
  repository?: ReturnType<typeof createLocalStorageModelRepository>;
  navigation?: ReturnType<typeof createNavigationPort>;
  map?: ReturnType<typeof createMapService>;
  preferences?: ReturnType<typeof createAppPreferences>;
  viewport?: ReturnType<typeof createBrowserViewport>;
  browserInteractions?: ReturnType<typeof createBrowserInteractions>;
  createAiCompanion?: typeof createCompanionAiAdapter;
};

export const createFrontendApplication = ({
  initialModel,
  onModeChange,
  ai = {},
  repository: injectedRepository,
  navigation: injectedNavigation,
  map: injectedMap,
  preferences: injectedPreferences,
  viewport: injectedViewport,
  browserInteractions: injectedBrowserInteractions,
  createAiCompanion = createCompanionAiAdapter,
}: FrontendApplicationOptions) => {
  const repository = injectedRepository || createLocalStorageModelRepository();
  const navigation = injectedNavigation || createNavigationPort({ onModeChange });
  const preferences = injectedPreferences || createAppPreferences();
  const viewport = injectedViewport || createBrowserViewport();
  const browserInteractions = injectedBrowserInteractions || createBrowserInteractions();
  const map = injectedMap || createMapService({ repository, initialModel: repository.load(initialModel) });
  const aiCompanion = (settings: Record<string, unknown> = {}) => createAiCompanion(settings ?? ai);

  return Object.freeze({ repository, navigation, map, preferences, viewport, browserInteractions, aiCompanion });
};
