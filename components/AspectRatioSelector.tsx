import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check, Square, RectangleVertical, RectangleHorizontal } from 'lucide-react';
import { AspectRatio } from '../types';
import { ASPECT_RATIOS } from '../constants';

interface AspectRatioSelectorProps {
  value: AspectRatio;
  onChange: (value: AspectRatio) => void;
  isPro?: boolean;
}

const AspectRatioSelector: React.FC<AspectRatioSelectorProps> = ({ value, onChange, isPro = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = ASPECT_RATIOS.find(opt => opt.value === value);

  // Group options
  const groups = {
    Square: ASPECT_RATIOS.filter(opt => opt.value === '1:1'),
    Portrait: ASPECT_RATIOS.filter(opt => ['3:4', '4:5', '9:16'].includes(opt.value)),
    Landscape: ASPECT_RATIOS.filter(opt => ['4:3', '16:9', '21:9'].includes(opt.value))
  };

  const getIcon = (ratioValue: string) => {
    if (ratioValue === '1:1') return <Square size={16} />;
    if (['3:4', '4:5', '9:16'].includes(ratioValue)) return <RectangleVertical size={16} />;
    return <RectangleHorizontal size={16} />;
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-zinc-900 border ${isOpen ? (isPro ? 'border-yellow-500' : 'border-cyan-500') : 'border-zinc-800'} rounded-lg px-3 py-2.5 text-sm flex items-center justify-between text-zinc-300 hover:bg-zinc-800/50 transition-colors`}
      >
        <div className="flex items-center gap-2 min-w-0">
            {selectedOption && <div className="shrink-0">{getIcon(selectedOption.value)}</div>}
            <span className="truncate text-left">{selectedOption?.label || 'Select Ratio'}</span>
        </div>
        <ChevronDown size={14} className={`text-zinc-500 transition-transform ${isOpen ? 'rotate-180' : ''} shrink-0 ml-2`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            style={{ transformOrigin: 'bottom center' }}
            className="absolute z-50 w-full bottom-full mb-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden max-h-64 overflow-y-auto custom-scrollbar"
          >
            {Object.entries(groups).map(([groupName, options]) => (
                options.length > 0 && (
                    <div key={groupName} className="p-1">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                            {groupName}
                        </div>
                        {options.map(opt => {
                            const isSelected = opt.value === value;
                            return (
                                <button
                                    type="button"
                                    key={opt.value}
                                    onClick={() => {
                                        onChange(opt.value as AspectRatio);
                                        setIsOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                                        isSelected 
                                        ? (isPro ? 'bg-yellow-500/10 text-yellow-500 font-medium' : 'bg-cyan-500/10 text-cyan-400 font-medium')
                                        : 'text-zinc-300 hover:bg-zinc-800'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <span className={isSelected ? (isPro ? 'text-yellow-500' : 'text-cyan-400') : 'text-zinc-500'}>
                                            {getIcon(opt.value)}
                                        </span>
                                        <span>{opt.label}</span>
                                    </div>
                                    {isSelected && <Check size={14} />}
                                </button>
                            );
                        })}
                    </div>
                )
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AspectRatioSelector;