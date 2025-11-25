
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
    setToasts(prev => [{ id, message, type }, ...prev]); // Add new to front (top)

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
      {/* Updated Position: Top Right, Stacking Downwards, High Z-Index to sit above header */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none items-end w-full max-w-sm">
        <AnimatePresence mode="popLayout">
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
    success: 'bg-zinc-950/95 border-green-900/50',
    error: 'bg-zinc-950/95 border-red-900/50',
    warning: 'bg-zinc-950/95 border-yellow-900/50',
    info: 'bg-zinc-950/95 border-blue-900/50'
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={`pointer-events-auto flex items-start gap-3 p-3 rounded-xl border shadow-2xl backdrop-blur-md w-full ${bgColors[toast.type]}`}
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
