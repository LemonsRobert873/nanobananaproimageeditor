import React, { useState } from 'react';
import { RotateCcw, X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';

interface ResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (includeApiKey: boolean) => void;
}

const ResetModal: React.FC<ResetModalProps> = ({ isOpen, onClose, onConfirm }) => {
  const [includeApiKey, setIncludeApiKey] = useState(false);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden relative z-10"
            onClick={(e) => e.stopPropagation()}
          >
             <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/50">
              <h3 className="text-zinc-100 font-medium flex items-center gap-2">
                <RotateCcw size={16} className="text-yellow-500" />
                Reset NanoBanana Pro Studio?
              </h3>
              <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
               <div className="bg-yellow-900/10 border border-yellow-900/20 rounded-lg p-4 flex gap-3">
                   <AlertTriangle className="text-yellow-600 shrink-0" size={20} />
                   <div className="space-y-1">
                       <p className="text-sm text-yellow-500 font-medium">Warning: Irreversible Action</p>
                       <p className="text-xs text-yellow-200/70 leading-relaxed">
                           This will reset your workspace and clear all local data for this site. You will lose your history, settings, and cached content.
                       </p>
                   </div>
               </div>

               <div className="flex items-center justify-between p-4 bg-zinc-950 rounded-lg border border-zinc-800">
                   <div className="space-y-0.5">
                       <span className="text-sm font-medium text-zinc-200 block">Include API Key</span>
                       <span className="text-xs text-zinc-500 block">Also remove stored API key</span>
                   </div>
                   <button 
                        onClick={() => setIncludeApiKey(!includeApiKey)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${includeApiKey ? 'bg-red-500' : 'bg-zinc-700'}`}
                    >
                        <motion.span 
                           className="absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm"
                           initial={false}
                           animate={{ x: includeApiKey ? 20 : 0 }}
                           transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                    </button>
               </div>
               
               <div className="flex justify-end gap-3 pt-2">
                   <Button variant="ghost" onClick={onClose}>Cancel</Button>
                   <Button variant="danger" onClick={() => onConfirm(includeApiKey)}>Reset App</Button>
               </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ResetModal;