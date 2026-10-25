import type { CatalogModel } from '../../application/catalogUseCases.ts';
import type { ModelRepository } from '../../ports/modelRepository.ts';
import type { NavigationPort, NavigationMode } from '../../ports/navigation.ts';
import type { AiCompanionPort } from '../../ports/aiCompanion.ts';
import { createCompanionAiAdapter } from '../ai/companionAdapter.ts';
import { createLocalStorageModelRepository } from '../browser/localStorageRepository.ts';
import { createAppPreferences } from '../browser/appPreferences.ts';
import { createBrowserViewport } from '../browser/browserViewport.ts';
import { createBrowserInteractions } from '../browser/browserInteractions.ts';
import { createNavigationPort } from '../browser/navigationAdapter.ts';
import { createMapService } from '../../application/mapService.ts';

export type FrontendApplication = ReturnType<typeof createFrontendApplication>;
export type FrontendApplicationOptions = {
  initialModel: CatalogModel;
  onModeChange?: (mode: NavigationMode) => void;
  ai?: Record<string, unknown>;
  repository?: ModelRepository;
  navigation?: NavigationPort;
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
  const aiCompanion = (settings: Record<string, unknown> = {}): AiCompanionPort => createAiCompanion(settings ?? ai);

  return Object.freeze({ repository, navigation, map, preferences, viewport, browserInteractions, aiCompanion });
};
