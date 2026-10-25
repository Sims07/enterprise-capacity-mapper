export type Theme = 'light' | 'dark';

export type AppPreferences = {
  readTheme: () => Theme;
  writeTheme: (theme: Theme) => void;
  readActiveLocalMapId: () => string;
  writeActiveLocalMapId: (id: string) => void;
  clearActiveLocalMapId: () => void;
  readActiveRecentMapId: (fallback: string) => string;
  writeActiveRecentMapId: (id: string) => void;
};

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const KEYS = Object.freeze({
  theme: 'enterprise-capacity-mapper:theme',
  activeLocalMap: 'enterprise-capacity-mapper:active-local-map',
  activeRecentMap: 'enterprise-capacity-mapper:active-recent-map',
});

export const createAppPreferences = ({ storage = localStorage }: { storage?: StorageLike } = {}): AppPreferences => ({
  readTheme: () => storage.getItem(KEYS.theme) === 'dark' ? 'dark' : 'light',
  writeTheme: theme => storage.setItem(KEYS.theme, theme === 'dark' ? 'dark' : 'light'),
  readActiveLocalMapId: () => storage.getItem(KEYS.activeLocalMap) || '',
  writeActiveLocalMapId: id => storage.setItem(KEYS.activeLocalMap, id),
  clearActiveLocalMapId: () => storage.removeItem(KEYS.activeLocalMap),
  readActiveRecentMapId: fallback => storage.getItem(KEYS.activeRecentMap) || fallback,
  writeActiveRecentMapId: id => storage.setItem(KEYS.activeRecentMap, id),
});
