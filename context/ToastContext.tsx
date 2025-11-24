
import React, { createContext, useContext, useState, useCallback } from 'react';
import { Toast, ToastType, ToastContextType } from '../types';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType) => {
    const id = Date.now().toString() + Math.random().toString();
    setToasts(prev => [...prev, { id, message, type }]);

    // Auto dismiss
    setTimeout(() => {
      removeToast(id);
    }, 5000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-6 left-6 z-[100] flex flex-col gap-2 pointer-events-none">
        <AnimatePresence>
          {toasts.map(toast => (
            <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};

const ToastItem: React.FC<{ toast: Toast; onRemove: () => void }> = ({ toast, onRemove }) => {
  const icons = {
    success: <CheckCircle className="text-green-500 w-5 h-5" />,
    error: <AlertCircle className="text-red-500 w-5 h-5" />,
    warning: <AlertTriangle className="text-yellow-500 w-5 h-5" />,
    info: <Info className="text-blue-500 w-5 h-5" />
  };

  const bgColors = {
    success: 'bg-zinc-900 border-green-900/30',
    error: 'bg-zinc-900 border-red-900/30',
    warning: 'bg-zinc-900 border-yellow-900/30',
    info: 'bg-zinc-900 border-blue-900/30'
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border shadow-xl max-w-sm backdrop-blur-md ${bgColors[toast.type]}`}
    >
      <div className="shrink-0 mt-0.5">{icons[toast.type]}</div>
      <div className="flex-1">
        <p className="text-sm text-zinc-200 font-medium leading-relaxed">{toast.message}</p>
      </div>
      <button 
        onClick={onRemove}
        className="shrink-0 text-zinc-500 hover:text-zinc-300 transition-colors"
      >
        <X size={16} />
      </button>
    </motion.div>
  );
};
