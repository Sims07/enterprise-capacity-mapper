import React, { useEffect, useRef, useState } from 'react';

const APP_VERSION = import.meta.env.VITE_APP_VERSION || '2.0.0';
const RELEASES_URL = 'https://github.com/Sims07/enterprise-capacity-mapper/releases';

export default function PwaUpdateNotice() {
  const [updateReady, setUpdateReady] = useState(false);
  const [message, setMessage] = useState('');
  const applyingUpdate = useRef(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    let registration;
    let disposed = false;

    const detectWaitingWorker = value => {
      if (value?.waiting && navigator.serviceWorker.controller) setUpdateReady(true);
    };
    const watchInstallingWorker = value => {
      const worker = value?.installing;
      if (!worker) return;
      worker.addEventListener('statechange', () => {
        if (worker.state === 'installed') detectWaitingWorker(value);
      });
    };
    const handleControllerChange = () => {
      if (applyingUpdate.current) window.location.reload();
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
    navigator.serviceWorker.register('./sw.js')
      .then(value => {
        if (disposed) return;
        registration = value;
        detectWaitingWorker(value);
        value.addEventListener('updatefound', () => watchInstallingWorker(value));
        watchInstallingWorker(value);
      })
      .catch(() => setMessage('Mise à jour indisponible pour le moment.'));

    const checkForUpdate = () => {
      if (document.visibilityState === 'visible' && registration) {
        registration.update().catch(() => {});
      }
    };
    window.addEventListener('focus', checkForUpdate);
    const interval = window.setInterval(checkForUpdate, 5 * 60 * 1000);

    return () => {
      disposed = true;
      window.clearInterval(interval);
      window.removeEventListener('focus', checkForUpdate);
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  const applyUpdate = () => {
    const waiting = navigator.serviceWorker?.controller &&
      navigator.serviceWorker.getRegistration('./').then(registration => registration?.waiting);
    if (!waiting) return;
    Promise.resolve(waiting).then(worker => {
      if (!worker) {
        setMessage('La mise à jour est en cours de préparation. Réessayez dans un instant.');
        return;
      }
      applyingUpdate.current = true;
      worker.postMessage({ type: 'SKIP_WAITING' });
      setMessage('Installation de la mise à jour…');
    }).catch(() => setMessage('Impossible d’installer la mise à jour. Réessayez.'));
  };

  return (
    <div className="pwa-version" data-testid="pwa-version">
      <a href={RELEASES_URL} target="_blank" rel="noreferrer" aria-label="Consulter les nouvelles versions">
        v{APP_VERSION} · Versions
      </a>
      {updateReady && (
        <button type="button" className="pwa-update-button" data-testid="pwa-update-button" onClick={applyUpdate}>
          Mettre à jour
        </button>
      )}
      {message && <span className="pwa-update-message" role="status">{message}</span>}
    </div>
  );
}
