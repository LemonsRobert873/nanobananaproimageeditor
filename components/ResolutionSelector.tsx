
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Monitor, Image as ImageIcon, Sparkles } from 'lucide-react';
import { Resolution } from '../types';
import { RESOLUTIONS } from '../constants';

interface ResolutionSelectorProps {
  value: Resolution;
  onChange: (value: Resolution) => void;
}

const ResolutionSelector: React.FC<ResolutionSelectorProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = RESOLUTIONS.find(opt => opt.value === value);

  const getIcon = (resValue: string) => {
    if (resValue === '1K') return <ImageIcon size={16} />;
    if (resValue === '2K') return <Monitor size={16} />;
    return <Sparkles size={16} />;
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-zinc-900 border ${isOpen ? 'border-yellow-500' : 'border-zinc-800'} rounded-lg px-3 py-2.5 text-sm flex items-center justify-between text-zinc-300 hover:bg-zinc-800/50 transition-colors`}
      >
        <div className="flex items-center gap-2">
            {selectedOption && getIcon(selectedOption.value)}
            <span className="truncate">{selectedOption?.label || 'Select Resolution'}</span>
        </div>
        <ChevronDown size={14} className={`text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            style={{ transformOrigin: 'bottom center' }}
            className="absolute z-50 w-full bottom-full mb-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
          >
            <div className="p-1">
                <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                    Quality
                </div>
                {RESOLUTIONS.map(opt => {
                    const isSelected = opt.value === value;
                    return (
                        <button
                            type="button"
                            key={opt.value}
                            onClick={() => {
                                onChange(opt.value as Resolution);
                                setIsOpen(false);
                            }}
                            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                                isSelected 
                                ? 'bg-yellow-500/10 text-yellow-500 font-medium' 
                                : 'text-zinc-300 hover:bg-zinc-800'
                            }`}
                        >
                            <div className="flex items-center gap-3">
                                <span className={isSelected ? 'text-yellow-500' : 'text-zinc-500'}>
                                    {getIcon(opt.value)}
                                </span>
                                <span>{opt.label}</span>
                            </div>
                            {isSelected && <Check size={14} />}
                        </button>
                    );
                })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ResolutionSelector;
