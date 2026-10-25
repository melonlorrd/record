import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export const ReloadPrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      // Periodically check for updates every 60 minutes
      if (r) {
        setInterval(() => {
          void r.update();
        }, 60 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.warn('Service worker registration error', error);
    },
  });

  if (!needRefresh) {
    return null;
  }

  return (
    <div className="reload-prompt-banner" role="alert">
      <div className="reload-prompt-content">
        <span className="reload-prompt-text">
          🚀 A new version of Record is available!
        </span>
        <div className="reload-prompt-actions">
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => void updateServiceWorker(true)}
          >
            Update & Reload
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => setNeedRefresh(false)}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
