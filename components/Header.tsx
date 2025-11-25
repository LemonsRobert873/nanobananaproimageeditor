
import React from 'react';
import { motion, LayoutGroup, AnimatePresence } from 'framer-motion';
import { BookOpen, Key, Layers, Type, FileText, Wand2, RotateCcw, Sparkles } from 'lucide-react';
import { GenerationMode } from '../types';

interface HeaderProps {
  mode: GenerationMode;
  setMode: (mode: GenerationMode) => void;
  showGuide: boolean;
  setShowGuide: (show: boolean) => void;
  hasKey: boolean;
  handleKeyClick: () => void;
  onResetClick: () => void;
  activeGenerations: { mode: GenerationMode; progress: number }[];
}

const Header: React.FC<HeaderProps> = ({ 
  mode, 
  setMode, 
  setShowGuide, 
  hasKey, 
  handleKeyClick,
  onResetClick,
  activeGenerations
}) => {
  
  const getModeLabel = (m: GenerationMode) => {
      switch(m) {
          case GenerationMode.IMAGE_EDIT: return 'Edit';
          case GenerationMode.IMAGE_TO_IMAGE: return 'Img2Img';
          case GenerationMode.IMG_TO_PROMPT: return 'I2P';
          case GenerationMode.TEXT_TO_PROMPT: return 'T2P';
          default: return 'Gen';
      }
  };

  return (
    <motion.header 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}
      className="flex-none h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md z-40 relative w-full"
    >
      <div className="max-w-[1800px] mx-auto px-4 h-full flex items-center justify-between">
        
        {/* Left: Logo */}
        <div className="flex items-center gap-6 shrink-0">
          <motion.div 
            className="flex items-center gap-2"
          >
            <div className="text-2xl">🍌</div>
            <span className="font-semibold text-zinc-100 tracking-tight hidden lg:inline whitespace-nowrap">
              NanoBanana Pro Studio
            </span>
          </motion.div>
        </div>

        {/* Center: Mode Tabs */}
        <div className="flex-1 max-w-2xl mx-4 overflow-x-auto no-scrollbar">
          <LayoutGroup id="mode-tabs">
              <nav className="flex items-center bg-zinc-900/80 p-1 rounded-full border border-zinc-800 w-max mx-auto relative">
                  {[
                      { id: GenerationMode.IMAGE_EDIT, label: 'Image Edit', icon: Type },
                      { id: GenerationMode.IMAGE_TO_IMAGE, label: 'Image to Image', icon: Layers },
                      { id: GenerationMode.IMG_TO_PROMPT, label: 'Img to Prompt', icon: FileText },
                      { id: GenerationMode.TEXT_TO_PROMPT, label: 'Text Prompt Gen', icon: Wand2 },
                  ].map((tab) => {
                      const isActive = mode === tab.id;
                      return (
                          <button
                              key={tab.id}
                              onClick={() => setMode(tab.id as GenerationMode)}
                              className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition-colors whitespace-nowrap z-10 ${
                                  isActive ? 'text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
                              }`}
                          >
                              {isActive && (
                                  <motion.div
                                      layoutId="activeTab"
                                      className="absolute inset-0 bg-yellow-500 rounded-full shadow-sm"
                                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                      style={{ zIndex: -1 }}
                                  />
                              )}
                              <tab.icon size={14} className="hidden sm:block" />
                              <span>{tab.label}</span>
                          </button>
                      );
                  })}
              </nav>
          </LayoutGroup>
        </div>

        {/* Right: Global Progress & Actions */}
        <div className="flex items-center justify-end gap-3 w-auto shrink-0">
          
          {/* Global Mini Progress Indicator */}
          <AnimatePresence>
            {activeGenerations.length > 0 && (
                <motion.div 
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="flex items-center gap-2 mr-2"
                >
                    {activeGenerations.slice(0, 2).map((gen) => (
                         <motion.button
                            key={gen.mode}
                            layout
                            onClick={() => setMode(gen.mode)}
                            className="flex items-center gap-2 bg-zinc-900 border border-yellow-500/30 rounded-full px-3 py-1 text-[10px] font-medium text-zinc-300 hover:bg-zinc-800 hover:border-yellow-500 transition-colors"
                         >
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse" />
                            <span>{getModeLabel(gen.mode)}</span>
                            <span className="text-yellow-500">{Math.round(gen.progress)}%</span>
                         </motion.button>
                    ))}
                    {activeGenerations.length > 2 && (
                        <div className="w-6 h-6 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-[10px] text-zinc-500">
                            +{activeGenerations.length - 2}
                        </div>
                    )}
                </motion.div>
            )}
          </AnimatePresence>

          <button 
              onClick={onResetClick}
              className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all hover:scale-105"
              title="Reset Application"
          >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">Reset</span>
          </button>

          <button 
            onClick={() => setShowGuide(true)}
            className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-all hover:scale-105"
          >
            <BookOpen size={14} />
            <span className="hidden sm:inline">Guide</span>
          </button>

          <button 
            onClick={handleKeyClick}
            className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-all hover:scale-105 ${
              hasKey 
                ? 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200' 
                : 'border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10'
            }`}
          >
            <Key size={14} />
            <span className="hidden sm:inline">{hasKey ? 'API Key Active' : 'Set API Key'}</span>
            {hasKey && <div className="w-1.5 h-1.5 rounded-full bg-green-500 ml-1 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />}
          </button>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;
