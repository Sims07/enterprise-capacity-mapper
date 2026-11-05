import { afterEach, describe, expect, it, vi } from 'vitest';
import { ACTIVE_MODEL_STORAGE_KEY } from '../../services/storage.ts';
import { APP_THEME_STORAGE_KEY } from './appPreferences.ts';
import { PRESENTATION_CHANNEL_NAME, publishPresentationTheme, publishPresentationUpdate, publishPresentationView, subscribeToPresentationUpdates } from './presentationSync.ts';

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
  it('synchronise les options validées sans toucher au modèle métier et ignore les messages mal formés', () => {
    const view = { readingMode: 'maturity' as const, showApplications: true, focusedDomainId: 'domain-1' };
    publishPresentationView({ channel, sourceId: 'editor-1', view });
    expect(channel.postMessage).toHaveBeenCalledWith({ type: 'view-updated', sourceId: 'editor-1', view });
    const onView = vi.fn();
    const onUpdate = vi.fn();
    const unsubscribe = subscribeToPresentationUpdates({
      sourceId: 'presentation-1', windowTarget, channelFactory: () => channel, onUpdate, onView,
    });
    messageHandler?.({ data: { type: 'view-updated', sourceId: 'editor-1', view } } as MessageEvent);
    expect(onView).toHaveBeenCalledWith(view);
    messageHandler?.({ data: { type: 'view-updated', sourceId: 'presentation-1', view } } as MessageEvent);
    messageHandler?.({ data: { type: 'view-updated', sourceId: 'editor-1', view: { ...view, readingMode: 'invalid' } } } as MessageEvent);
    expect(onView).toHaveBeenCalledTimes(1);
    expect(onUpdate).not.toHaveBeenCalled();
    unsubscribe();
  });

  it('propage les changements de thème et accepte le repli storage sans boucle', () => {
    const onTheme = vi.fn();
    const unsubscribe = subscribeToPresentationUpdates({
      sourceId: 'presentation-1', windowTarget, channelFactory: () => channel,
      onUpdate: vi.fn(), onTheme,
    });
    publishPresentationTheme({ channel, sourceId: 'editor-1', theme: 'dark' });
    expect(channel.postMessage).toHaveBeenCalledWith({ type: 'theme-updated', sourceId: 'editor-1', theme: 'dark' });
    messageHandler?.({ data: { type: 'theme-updated', sourceId: 'editor-1', theme: 'dark' } } as MessageEvent);
    expect(onTheme).toHaveBeenLastCalledWith('dark');
    messageHandler?.({ data: { type: 'theme-updated', sourceId: 'presentation-1', theme: 'light' } } as MessageEvent);
    messageHandler?.({ data: { type: 'theme-updated', sourceId: 'editor-1', theme: 'invalid' } } as MessageEvent);
    expect(onTheme).toHaveBeenCalledTimes(1);
    storageHandler?.({ key: APP_THEME_STORAGE_KEY, newValue: 'light' } as StorageEvent);
    expect(onTheme).toHaveBeenLastCalledWith('light');
    storageHandler?.({ key: APP_THEME_STORAGE_KEY, newValue: null } as StorageEvent);
    expect(onTheme).toHaveBeenLastCalledWith('light');
    expect(onTheme).toHaveBeenCalledTimes(3);
    unsubscribe();
  });
});
