import { createCompanionAiAdapter } from '../ai/companionAdapter.js';
import { createLocalStorageModelRepository } from '../browser/localStorageRepository.js';
import { createMapService } from '../../application/mapService.js';
import { createNavigationPort } from '../../ports/navigation.js';

/**
 * React adapter composition root.
 * React components consume this object; they do not know which persistence,
 * navigation or AI technology is behind the ports.
 */
export const createFrontendApplication = ({
  initialModel,
  onModeChange,
  ai = {},
  repository: injectedRepository,
  navigation: injectedNavigation,
  map: injectedMap,
  createAiCompanion = createCompanionAiAdapter,
} = {}) => {
  const repository = injectedRepository || createLocalStorageModelRepository();
  const navigation = injectedNavigation || createNavigationPort({ onModeChange });
  const map = injectedMap || createMapService({ repository, initialModel: repository.load(initialModel) });
  const aiCompanion = settings => createAiCompanion(settings ?? ai);

  return Object.freeze({ repository, navigation, map, aiCompanion });
};
