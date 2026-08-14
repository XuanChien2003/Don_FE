import { createContext, useCallback, useContext, useRef, useState } from 'react';

const ToastContext = createContext(null);
const DURATION = 3200;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const remove = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    clearTimeout(timers.current[id]);
    delete timers.current[id];
  }, []);

  const push = useCallback(
    (kind, message) => {
      if (!message) return;
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((list) => [...list, { id, kind, message }]);
      timers.current[id] = setTimeout(() => remove(id), DURATION);
    },
    [remove]
  );

  const api = useRef({
    success: (message) => push('success', message),
    error: (message) => push('error', message),
    info: (message) => push('info', message),
  }).current;

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="vtp-toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`vtp-toast vtp-toast-${t.kind}`}
            role="status"
            onClick={() => remove(t.id)}
          >
            <span className="vtp-toast-icon">{t.kind === 'success' ? '✓' : t.kind === 'error' ? '✕' : 'ℹ'}</span>
            <span className="vtp-toast-msg">{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
