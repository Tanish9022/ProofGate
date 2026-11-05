'use client';

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useReducer,
  useRef,
} from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

type Action =
  | { type: 'add'; toast: Toast }
  | { type: 'remove'; id: string };

function reducer(state: Toast[], action: Action): Toast[] {
  switch (action.type) {
    case 'add': return [...state, action.toast];
    case 'remove': return state.filter(t => t.id !== action.id);
  }
}

const ToastContext = createContext<(msg: string, type?: Toast['type']) => void>(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, []);
  const counterRef = useRef(0);

  const addToast = useCallback((message: string, type: Toast['type'] = 'success') => {
    const id = `toast-${++counterRef.current}`;
    dispatch({ type: 'add', toast: { id, message, type } });
    setTimeout(() => dispatch({ type: 'remove', id }), 5000);
  }, []);

  const typeClasses: Record<Toast['type'], string> = {
    success: 'bg-ink text-paper',
    error: 'bg-red-pen text-paper',
    info: 'bg-indigo text-paper',
  };

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {/* Toast region */}
      <div
        aria-live="polite"
        aria-atomic="false"
        className="fixed bottom-6 left-6 z-50 flex flex-col gap-2"
      >
        {toasts.map(t => (
          <div
            key={t.id}
            role="status"
            className={[
              'flex items-center gap-3 rounded-md px-4 py-3 shadow-dialog text-sm font-medium',
              typeClasses[t.type],
            ].join(' ')}
          >
            {t.message}
            <button
              onClick={() => dispatch({ type: 'remove', id: t.id })}
              className="ml-2 opacity-70 hover:opacity-100"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
