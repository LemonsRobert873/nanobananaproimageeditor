import React from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { BookOpen, Key, Layers, Type, FileText, Wand2, RotateCcw } from 'lucide-react';
import { GenerationMode } from '../types';

interface HeaderProps {
  mode: GenerationMode;
  setMode: (mode: GenerationMode) => void;
  showGuide: boolean;
  setShowGuide: (show: boolean) => void;
  hasKey: boolean;
  handleKeyClick: () => void;
  onResetClick: () => void;
  activeModel: string;
  isProTheme: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  mode, 
  setMode, 
  setShowGuide, 
  hasKey, 
  handleKeyClick,
  onResetClick,
  isProTheme
}) => {
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
            className="flex items-center gap-2 group cursor-default"
          >
            <div className="text-2xl transition-transform group-hover:rotate-12">🍌</div>
            <span className={`font-semibold tracking-tight hidden lg:inline whitespace-nowrap transition-all duration-300 ${
                isProTheme 
                ? 'text-white drop-shadow-[0_0_20px_rgba(234,179,8,0.8)]' 
                : 'text-white drop-shadow-[0_0_20px_rgba(34,211,238,0.9)]'
            }`}>
              NanoBanana <span className={`transition-colors duration-300 ${isProTheme ? "text-yellow-500" : "text-cyan-400"}`}>{isProTheme ? "Pro" : "Flash"}</span> Studio
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
                                      className={`absolute inset-0 rounded-full shadow-sm ${isProTheme ? 'bg-yellow-500' : 'bg-cyan-500'}`}
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

        {/* Right: Actions */}
        <div className="flex items-center justify-end gap-3 w-auto shrink-0">
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
                : (isProTheme 
                    ? 'border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10' 
                    : 'border-cyan-500/50 text-cyan-500 hover:bg-cyan-500/10')
            }`}
          >
            <Key size={14} />
            <span className="hidden sm:inline">{hasKey ? 'API Key: Active' : 'Set API Key'}</span>
            {hasKey && <div className="w-1.5 h-1.5 rounded-full bg-green-500 ml-1 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />}
          </button>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;