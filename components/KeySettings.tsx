import React, { useState, useEffect } from 'react';
import { X, Key, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from './Button';

interface KeySettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  currentKey: string;
  isProTheme?: boolean;
}

const KeySettings: React.FC<KeySettingsProps> = ({ isOpen, onClose, onSave, currentKey, isProTheme = true }) => {
  const [key, setKey] = useState(currentKey);
  const [show, setShow] = useState(false);
  const [isShake, setIsShake] = useState(false);

  useEffect(() => {
    setKey(currentKey);
  }, [currentKey, isOpen]);

  const handleSave = () => {
      if (!key.trim()) {
          setIsShake(true);
          setTimeout(() => setIsShake(false), 500);
          return;
      }
      onSave(key);
  };

  const focusClass = isProTheme ? 'focus:ring-yellow-500 focus:border-yellow-500' : 'focus:ring-cyan-500 focus:border-cyan-500';
  const iconColor = isProTheme ? 'text-yellow-500' : 'text-cyan-400';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                <Key size={16} className={iconColor} />
                API Key Configuration
              </h3>
              <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-zinc-400 leading-relaxed">
                To use NanoBanana Pro Studio, you need a Google Gemini API key. 
                Your key is stored locally in your browser and is not sent to any backend server.
              </p>
              
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Gemini API Key</label>
                <div className="relative">
                  <motion.input 
                    type={show ? "text" : "password"}
                    value={key}
                    onChange={(e) => setKey(e.target.value)}
                    placeholder="AIzaSy..."
                    animate={isShake ? { x: [-5, 5, -5, 5, 0] } : { x: 0 }}
                    transition={{ duration: 0.4 }}
                    className={`w-full bg-zinc-950 border ${isShake ? 'border-red-500' : 'border-zinc-800'} rounded-lg pl-10 pr-10 py-3 text-sm text-zinc-200 focus:ring-1 outline-none transition-colors placeholder-zinc-700 ${focusClass}`}
                  />
                  <Key className="absolute left-3 top-3.5 text-zinc-600 w-4 h-4" />
                  <button 
                    onClick={() => setShow(!show)}
                    className="absolute right-3 top-3 text-zinc-600 hover:text-zinc-400 p-1"
                  >
                    {show ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              
              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800/50 mt-4">
                 <Button variant="ghost" isProTheme={isProTheme} onClick={onClose}>Cancel</Button>
                 <Button isProTheme={isProTheme} onClick={handleSave}>Save Key</Button>
              </div>
              
              <div className="text-xs text-center text-zinc-600 pt-1">
                Don't have a key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className={`hover:underline ${isProTheme ? 'text-yellow-500' : 'text-cyan-400'}`}>Get one here</a>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default KeySettings;