export type Theme = 'light' | 'dark';
export type MapDensity = 'comfortable' | 'compact';

export type AppPreferences = {
  readTheme: () => Theme;
  writeTheme: (theme: Theme) => void;
  readMapDensity: () => MapDensity;
  writeMapDensity: (density: MapDensity) => void;
  readActiveLocalMapId: () => string;
  writeActiveLocalMapId: (id: string) => void;
  clearActiveLocalMapId: () => void;
  readActiveRecentMapId: (fallback: string) => string;
  writeActiveRecentMapId: (id: string) => void;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const KEYS = Object.freeze({
  theme: 'enterprise-capacity-mapper:theme',
  mapDensity: 'enterprise-capacity-mapper:map-density',
  activeLocalMap: 'enterprise-capacity-mapper:active-local-map',
  activeRecentMap: 'enterprise-capacity-mapper:active-recent-map',
});

/** Storage fallback for presentation windows without an active BroadcastChannel. */
export const APP_THEME_STORAGE_KEY = KEYS.theme;

export const createAppPreferences = ({ storage = localStorage }: { storage?: StorageLike } = {}): AppPreferences => ({
  readTheme: () => storage.getItem(KEYS.theme) === 'dark' ? 'dark' : 'light',
  writeTheme: theme => storage.setItem(KEYS.theme, theme === 'dark' ? 'dark' : 'light'),
  readMapDensity: () => storage.getItem(KEYS.mapDensity) === 'compact' ? 'compact' : 'comfortable',
  writeMapDensity: density => storage.setItem(KEYS.mapDensity, density === 'compact' ? 'compact' : 'comfortable'),
  readActiveLocalMapId: () => storage.getItem(KEYS.activeLocalMap) || '',
  writeActiveLocalMapId: id => storage.setItem(KEYS.activeLocalMap, id),
  clearActiveLocalMapId: () => storage.removeItem(KEYS.activeLocalMap),
  readActiveRecentMapId: fallback => storage.getItem(KEYS.activeRecentMap) || fallback,
  writeActiveRecentMapId: id => storage.setItem(KEYS.activeRecentMap, id),
});
