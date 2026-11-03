import { afterEach, describe, expect, it, vi } from 'vitest';
import { ACTIVE_MODEL_STORAGE_KEY } from '../../services/storage.ts';
import { PRESENTATION_CHANNEL_NAME, publishPresentationUpdate, subscribeToPresentationUpdates } from './presentationSync.ts';

describe('presentationSync', () => {
  let messageHandler: EventListener | undefined;
  let storageHandler: EventListener | undefined;
  const channel = {
    postMessage: vi.fn(),
    addEventListener: vi.fn((_type: string, handler: EventListener) => { messageHandler = handler; }),
    removeEventListener: vi.fn(),
    close: vi.fn(),
  };
  const windowTarget = {
    addEventListener: vi.fn((_type: string, handler: EventListener) => { storageHandler = handler; }),
    removeEventListener: vi.fn(),
  };
  afterEach(() => vi.clearAllMocks());

  it('publishes only a lightweight invalidation message', () => {
    publishPresentationUpdate({ channel, sourceId: 'editor-1', now: 123 });
    expect(channel.postMessage).toHaveBeenCalledWith({ type: 'model-updated', sourceId: 'editor-1', timestamp: 123 });
  });

  it('refreshes on another window update and ignores its own message', () => {
    const onUpdate = vi.fn();
    const unsubscribe = subscribeToPresentationUpdates({
      sourceId: 'presentation-1', windowTarget, channelFactory: name => {
        expect(name).toBe(PRESENTATION_CHANNEL_NAME);
        return channel;
      }, onUpdate,
    });
    messageHandler?.({ data: { type: 'model-updated', sourceId: 'presentation-1', timestamp: 1 } } as MessageEvent);
    expect(onUpdate).not.toHaveBeenCalled();
    messageHandler?.({ data: { type: 'model-updated', sourceId: 'editor-1', timestamp: 2 } } as MessageEvent);
    expect(onUpdate).toHaveBeenCalledTimes(1);
    storageHandler?.({ key: ACTIVE_MODEL_STORAGE_KEY } as StorageEvent);
    expect(onUpdate).toHaveBeenCalledTimes(2);
    storageHandler?.({ key: 'unrelated-key' } as StorageEvent);
    expect(onUpdate).toHaveBeenCalledTimes(2);
    unsubscribe();
    expect(channel.close).toHaveBeenCalledOnce();
    expect(windowTarget.removeEventListener).toHaveBeenCalledWith('storage', expect.any(Function));
  });
});
