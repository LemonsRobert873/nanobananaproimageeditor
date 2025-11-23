import React, { useState, useEffect } from 'react';
import { X, Key, Eye, EyeOff } from 'lucide-react';
import Button from './Button';

interface KeySettingsProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (key: string) => void;
  currentKey: string;
}

const KeySettings: React.FC<KeySettingsProps> = ({ isOpen, onClose, onSave, currentKey }) => {
  const [key, setKey] = useState(currentKey);
  const [show, setShow] = useState(false);

  useEffect(() => {
    setKey(currentKey);
  }, [currentKey, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-950/50">
          <h3 className="text-zinc-100 font-medium flex items-center gap-2">
            <Key size={16} className="text-yellow-500" />
            API Key Configuration
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-200 transition-colors">
            <X size={18} />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <p className="text-sm text-zinc-400 leading-relaxed">
            To use Face Remix Studio, you need a Google Gemini API key. 
            Your key is stored locally in your browser and is not sent to any backend server.
          </p>
          
          <div className="space-y-2">
            <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Gemini API Key</label>
            <div className="relative">
              <input 
                type={show ? "text" : "password"}
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-10 pr-10 py-3 text-sm text-zinc-200 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 outline-none transition-all placeholder-zinc-700"
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
             <Button variant="ghost" onClick={onClose}>Cancel</Button>
             <Button onClick={() => onSave(key)}>Save Key</Button>
          </div>
          
          <div className="text-xs text-center text-zinc-600 pt-1">
            Don't have a key? <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-yellow-500 hover:underline">Get one here</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeySettings;