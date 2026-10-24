import { createCompanionAiAdapter } from '../ai/companionAdapter.js';
import { createLocalStorageModelRepository } from '../browser/localStorageRepository.js';
import { createMapService } from '../../application/mapService.js';
import { createNavigationPort } from '../../ports/navigation.js';

/**
 * React adapter composition root.
 * React components consume this object; they do not know which persistence,
 * navigation or AI technology is behind the ports.
 */
export const createFrontendApplication = ({ initialModel, onModeChange, ai = {} } = {}) => {
  const repository = createLocalStorageModelRepository();
  const navigation = createNavigationPort({ onModeChange });
  const map = createMapService({ repository, initialModel });
  const aiCompanion = createCompanionAiAdapter(ai);

  return Object.freeze({ repository, navigation, map, aiCompanion });
};
