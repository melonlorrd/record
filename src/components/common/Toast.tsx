import React from 'react';
import { useStore } from '../../store/storeContext';

export const Toast: React.FC = () => {
  const { toast, hideToast } = useStore();

  if (!toast) return null;

  return (
    <div className="toast-container" role="status" aria-live="polite">
      <div className="toast-card">
        <span className="toast-message">{toast.message}</span>
        {toast.onAction && toast.actionLabel && (
          <button
            type="button"
            className="toast-action-btn"
            onClick={() => {
              toast.onAction?.();
              hideToast();
            }}
          >
            {toast.actionLabel}
          </button>
        )}
        <button
          type="button"
          className="toast-close-btn"
          onClick={hideToast}
          aria-label="Close notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
};
