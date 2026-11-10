import React, { useEffect, useRef, useState } from 'react';
import { Button } from './ui/Button.tsx';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '2.0.0';
const RELEASES_URL = 'https://github.com/Sims07/enterprise-capacity-mapper/releases';
const UPDATE_CHECK_INTERVAL_MS = 5 * 60 * 1000;
const ACTIVATION_TIMEOUT_MS = 15_000;

export default function PwaUpdateNotice(): React.ReactElement {
  const [updateReady, setUpdateReady] = useState(false);
  const [applying, setApplying] = useState(false);
  const [message, setMessage] = useState('');
  const applyingUpdate = useRef(false);
  const pendingWorker = useRef<ServiceWorker | null>(null);
  const cancelPending = useRef<(() => void) | null>(null);
  const reloadStarted = useRef(false);

  const reloadAfterActivation = () => {
    if (!applyingUpdate.current || reloadStarted.current) return;
    reloadStarted.current = true;
    cancelPending.current?.();
    cancelPending.current = null;
    window.location.reload();
  };

  const failUpdate = (text: string, canRetry: boolean) => {
    cancelPending.current?.();
    cancelPending.current = null;
    pendingWorker.current = null;
    applyingUpdate.current = false;
    setApplying(false);
    setUpdateReady(canRetry);
    setMessage(text);
  };

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    let registration: ServiceWorkerRegistration | undefined;
    let disposed = false;
    const detectWaitingWorker = (value: ServiceWorkerRegistration) => {
      if (!disposed && !applyingUpdate.current) {
        setUpdateReady(Boolean(value.waiting && navigator.serviceWorker.controller));
      }
    };
    const watchInstallingWorker = (value: ServiceWorkerRegistration) => {
      const worker = value.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed') detectWaitingWorker(value);
      });
    };
    const handleControllerChange = () => {
      // Ignore an unrelated controller change while another update is pending.
      if (pendingWorker.current && navigator.serviceWorker.controller === pendingWorker.current) {
        reloadAfterActivation();
      }
    };
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    navigator.serviceWorker.register('./sw.js').then(value => {
      if (disposed) return;
      registration = value;
      detectWaitingWorker(value);
      value.addEventListener('updatefound', () => watchInstallingWorker(value));
      watchInstallingWorker(value);
    }).catch(() => {
      if (!disposed) setMessage('Mise à jour indisponible pour le moment.');
    });
    const checkForUpdate = () => {
      if (document.visibilityState === 'visible' && registration) registration.update().catch(() => {});
    };
    window.addEventListener('focus', checkForUpdate);
    const interval = window.setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', checkForUpdate);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
      cancelPending.current?.();
      cancelPending.current = null;
    };
  }, []);

  const applyUpdate = async () => {
    if (applyingUpdate.current || !('serviceWorker' in navigator)) return;
    try {
      const registration = await navigator.serviceWorker.getRegistration('./');
      const worker = registration?.waiting;
      if (!worker) {
        setUpdateReady(false);
        setMessage('La nouvelle version n’est plus en attente. Rechargez la page pour vérifier.');
        return;
      }

      applyingUpdate.current = true;
      pendingWorker.current = worker;
      setApplying(true);
      setMessage('Installation de la mise à jour…');

      const onStateChange = () => {
        // Some browsers activate the worker without emitting controllerchange
        // to the current tab. Activation is sufficient to reload safely.
        if (worker.state === 'activated') reloadAfterActivation();
        else if (worker.state === 'redundant') {
          failUpdate('La mise à jour a été interrompue. Rechargez la page pour réessayer.', false);
        }
      };
      worker.addEventListener('statechange', onStateChange);
      const timeout = window.setTimeout(() => {
        if (worker.state === 'activated' || navigator.serviceWorker.controller === worker) {
          reloadAfterActivation();
        } else {
          failUpdate('La mise à jour n’a pas abouti. Réessayez ou rechargez la page.', true);
        }
      }, ACTIVATION_TIMEOUT_MS);
      cancelPending.current = () => {
        window.clearTimeout(timeout);
        worker.removeEventListener('statechange', onStateChange);
      };

      // Check for a race with activation before sending the message.
      if (worker.state === 'activated') reloadAfterActivation();
      else if (worker.state === 'redundant') onStateChange();
      else worker.postMessage({ type: 'SKIP_WAITING' });
    } catch {
      failUpdate('Impossible d’installer la mise à jour. Réessayez.', true);
    }
  };

  return (
    <div className="pwa-version" data-testid="pwa-version">
      <a href={RELEASES_URL} target="_blank" rel="noreferrer" aria-label="Consulter les nouvelles versions">v{APP_VERSION}</a>
      {updateReady && (
        <Button variant="secondary" className="pwa-update-button" data-testid="pwa-update-button" onClick={applyUpdate} disabled={applying}>
          {applying ? 'Mise à jour…' : 'Mettre à jour'}
        </Button>
      )}
      {message && <span className="pwa-update-message" role="status">{message}</span>}
    </div>
  );
}
