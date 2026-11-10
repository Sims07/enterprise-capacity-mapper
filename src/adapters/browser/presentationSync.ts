import { ACTIVE_MODEL_STORAGE_KEY } from '../../services/storage.ts';
import { APP_THEME_STORAGE_KEY, type Theme } from './appPreferences.ts';
import { PRESENTATION_READING_OPTIONS, type PresentationReadingMode } from '../../application/presentationReadout.ts';

export const PRESENTATION_CHANNEL_NAME = 'enterprise-capacity-mapper:presentation:v1';
const publisherChannel: ChannelLike | null = typeof BroadcastChannel === 'undefined'
  ? null
  : new BroadcastChannel(PRESENTATION_CHANNEL_NAME);

export type PresentationViewState = {
  readingMode: PresentationReadingMode;
  showApplications: boolean;
  focusedDomainId: string | null;
};
type PresentationMessage =
  | { type: 'model-updated'; sourceId: string; timestamp: number }
  | { type: 'view-updated'; sourceId: string; view: PresentationViewState }
  | { type: 'selection-updated'; sourceId: string; capabilityIds: string[] }
  | { type: 'selection-requested'; sourceId: string }
  | { type: 'theme-updated'; sourceId: string; theme: Theme };
type ChannelLike = Pick<BroadcastChannel, 'postMessage' | 'addEventListener' | 'removeEventListener' | 'close'>;
type WindowLike = Pick<Window, 'addEventListener' | 'removeEventListener'>;

/** Publishes a lightweight invalidation signal; the persisted JSON remains the source of truth. */
export const publishPresentationUpdate = ({ channel, sourceId, now = Date.now() }: {
  channel?: ChannelLike | null; sourceId: string; now?: number;
}): void => {
  (channel ?? publisherChannel)?.postMessage({ type: 'model-updated', sourceId, timestamp: now } satisfies PresentationMessage);
};

/** Sends only local presentation controls; no model data or user information leaves the browser. */
export const publishPresentationView = ({ channel, sourceId, view }: {
  channel?: ChannelLike | null; sourceId: string; view: PresentationViewState;
}): void => {
  (channel ?? publisherChannel)?.postMessage({ type: 'view-updated', sourceId, view } satisfies PresentationMessage);
};

/** Broadcasts ephemeral N1 selection without touching the business model. */
export const publishPresentationSelection = ({ channel, sourceId, capabilityIds }: {
  channel?: ChannelLike | null; sourceId: string; capabilityIds: string[];
}): void => {
  (channel ?? publisherChannel)?.postMessage({ type: 'selection-updated', sourceId, capabilityIds } satisfies PresentationMessage);
};

/** A newly opened projection requests the current selection from its editor. */
export const requestPresentationSelection = ({ channel, sourceId }: {
  channel?: ChannelLike | null; sourceId: string;
}): void => {
  (channel ?? publisherChannel)?.postMessage({ type: 'selection-requested', sourceId } satisfies PresentationMessage);
};

/** Keeps the presentation palette in sync without sending or persisting the model. */
export const publishPresentationTheme = ({ channel, sourceId, theme }: {
  channel?: ChannelLike | null; sourceId: string; theme: Theme;
}): void => {
  (channel ?? publisherChannel)?.postMessage({ type: 'theme-updated', sourceId, theme } satisfies PresentationMessage);
};

const isPresentationViewState = (value: unknown): value is PresentationViewState => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return PRESENTATION_READING_OPTIONS.some(option => option.id === candidate.readingMode)
    && typeof candidate.showApplications === 'boolean'
    && (candidate.focusedDomainId === null || typeof candidate.focusedDomainId === 'string');
};

/** Subscribes to cross-window updates, with the native storage event as a fallback. */
export const subscribeToPresentationUpdates = ({
  onUpdate,
  onView,
  onSelection,
  onSelectionRequest,
  onTheme,
  sourceId,
  windowTarget = globalThis.window,
  channelFactory = typeof BroadcastChannel === 'undefined' ? undefined : (name: string) => new BroadcastChannel(name),
}: {
  onUpdate: () => void;
  onView?: (view: PresentationViewState) => void;
  onSelection?: (capabilityIds: string[]) => void;
  onSelectionRequest?: () => void;
  onTheme?: (theme: Theme) => void;
  sourceId: string;
  windowTarget?: WindowLike;
  channelFactory?: (name: string) => ChannelLike;
}): (() => void) => {
  const channel = channelFactory?.(PRESENTATION_CHANNEL_NAME);
  const onMessage = (event: MessageEvent<PresentationMessage>) => {
    if (!event.data || event.data.sourceId === sourceId) return;
    if (event.data.type === 'model-updated') onUpdate();
    if (event.data.type === 'view-updated' && isPresentationViewState(event.data.view)) onView?.(event.data.view);
    if (event.data.type === 'selection-updated'
      && Array.isArray(event.data.capabilityIds)
      && event.data.capabilityIds.every(id => typeof id === 'string')) onSelection?.(event.data.capabilityIds);
    if (event.data.type === 'selection-requested') onSelectionRequest?.();
    if (event.data.type === 'theme-updated' && (event.data.theme === 'light' || event.data.theme === 'dark')) onTheme?.(event.data.theme);
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === ACTIVE_MODEL_STORAGE_KEY) onUpdate();
    if (event.key === APP_THEME_STORAGE_KEY) onTheme?.(event.newValue === 'dark' ? 'dark' : 'light');
  };
  channel?.addEventListener('message', onMessage as EventListener);
  windowTarget?.addEventListener('storage', onStorage as EventListener);
  return () => {
    channel?.removeEventListener('message', onMessage as EventListener);
    channel?.close();
    windowTarget?.removeEventListener('storage', onStorage as EventListener);
  };
};
