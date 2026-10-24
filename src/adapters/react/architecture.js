import { createLocalStorageModelRepository } from '../browser/localStorageRepository.js';
import { createMapService } from '../../application/mapService.js';
import { createNavigationPort } from '../../ports/navigation.js';

/**
 * React adapter composition root.
 * React components consume this object; they do not know which persistence or
 * navigation technology is behind the ports.
 */
export const createFrontendApplication = ({ initialModel, onModeChange } = {}) => {
  const repository = createLocalStorageModelRepository();
  const navigation = createNavigationPort({ onModeChange });
  const map = createMapService({ repository, initialModel });

  return Object.freeze({ repository, navigation, map });
};
