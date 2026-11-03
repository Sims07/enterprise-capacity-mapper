import { ACTIVE_MODEL_STORAGE_KEY } from '../../services/storage.ts';

export const PRESENTATION_CHANNEL_NAME = 'enterprise-capacity-mapper:presentation:v1';
const publisherChannel: ChannelLike | null = typeof BroadcastChannel === 'undefined'
  ? null
  : new BroadcastChannel(PRESENTATION_CHANNEL_NAME);

type PresentationMessage = { type: 'model-updated'; sourceId: string; timestamp: number };
type ChannelLike = Pick<BroadcastChannel, 'postMessage' | 'addEventListener' | 'removeEventListener' | 'close'>;
type WindowLike = Pick<Window, 'addEventListener' | 'removeEventListener'>;

/** Publishes a lightweight invalidation signal; the persisted JSON remains the source of truth. */
export const publishPresentationUpdate = ({ channel, sourceId, now = Date.now() }: {
  channel?: ChannelLike | null; sourceId: string; now?: number;
}): void => {
  (channel ?? publisherChannel)?.postMessage({ type: 'model-updated', sourceId, timestamp: now } satisfies PresentationMessage);
};

/** Subscribes to cross-window updates, with the native storage event as a fallback. */
export const subscribeToPresentationUpdates = ({
  onUpdate,
  sourceId,
  windowTarget = globalThis.window,
  channelFactory = typeof BroadcastChannel === 'undefined' ? undefined : (name: string) => new BroadcastChannel(name),
}: {
  onUpdate: () => void;
  sourceId: string;
  windowTarget?: WindowLike;
  channelFactory?: (name: string) => ChannelLike;
}): (() => void) => {
  const channel = channelFactory?.(PRESENTATION_CHANNEL_NAME);
  const onMessage = (event: MessageEvent<PresentationMessage>) => {
    if (event.data?.type === 'model-updated' && event.data.sourceId !== sourceId) onUpdate();
  };
  const onStorage = (event: StorageEvent) => {
    if (event.key === ACTIVE_MODEL_STORAGE_KEY) onUpdate();
  };
  channel?.addEventListener('message', onMessage as EventListener);
  windowTarget?.addEventListener('storage', onStorage as EventListener);
  return () => {
    channel?.removeEventListener('message', onMessage as EventListener);
    channel?.close();
    windowTarget?.removeEventListener('storage', onStorage as EventListener);
  };
};
