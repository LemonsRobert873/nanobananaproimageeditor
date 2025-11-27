
import React, { useState, useRef } from 'react';
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
  onTabDrop: (e: React.DragEvent, mode: GenerationMode) => void;
}

const Header: React.FC<HeaderProps> = ({ 
  mode, 
  setMode, 
  setShowGuide, 
  hasKey, 
  handleKeyClick,
  onResetClick,
  isProTheme,
  onTabDrop
}) => {
  const [dragOverMode, setDragOverMode] = useState<GenerationMode | null>(null);
  const dragTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleDragEnter = (targetMode: GenerationMode) => {
      if (mode === targetMode) return;
      
      setDragOverMode(targetMode);
      
      if (dragTimeoutRef.current) clearTimeout(dragTimeoutRef.current);
      
      // Start timer to switch mode
      dragTimeoutRef.current = setTimeout(() => {
          setMode(targetMode);
          setDragOverMode(null);
      }, 500); // 500ms delay for intentional hover
  };

  const handleDragLeave = (e: React.DragEvent) => {
      const currentTarget = e.currentTarget as HTMLElement;
      const relatedTarget = e.relatedTarget as HTMLElement;
      
      // Prevent cancelling if simply moving into a child element (like the icon or span)
      if (currentTarget.contains(relatedTarget)) return;

      if (dragTimeoutRef.current) {
          clearTimeout(dragTimeoutRef.current);
          dragTimeoutRef.current = null;
      }
      setDragOverMode(null);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault(); // Necessary to allow dropping and detect dragover
      e.dataTransfer.dropEffect = 'copy';
  };

  const onDrop = (e: React.DragEvent, targetMode: GenerationMode) => {
      e.preventDefault();
      // Clear timer if dropping directly
      if (dragTimeoutRef.current) {
          clearTimeout(dragTimeoutRef.current);
          dragTimeoutRef.current = null;
      }
      setDragOverMode(null);
      onTabDrop(e, targetMode);
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
                      { id: GenerationMode.IMAGE_TO_IMAGE, label: 'Image → Image', icon: Layers },
                      { id: GenerationMode.IMG_TO_PROMPT, label: 'Image → Text Prompt', icon: FileText },
                      { id: GenerationMode.TEXT_TO_PROMPT, label: 'Text Prompt', icon: Wand2 },
                  ].map((tab) => {
                      const isActive = mode === tab.id;
                      const isDragTarget = dragOverMode === tab.id;
                      
                      return (
                          <button
                              key={tab.id}
                              onClick={() => setMode(tab.id as GenerationMode)}
                              onDragEnter={() => handleDragEnter(tab.id as GenerationMode)}
                              onDragLeave={handleDragLeave}
                              onDragOver={handleDragOver}
                              onDrop={(e) => onDrop(e, tab.id as GenerationMode)}
                              className={`relative flex items-center gap-2 px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap z-10 ${
                                  isActive ? 'text-zinc-950' : 'text-zinc-400 hover:text-zinc-200'
                              } ${
                                  isDragTarget 
                                  ? (isProTheme ? 'bg-yellow-500/20 ring-2 ring-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.4)] text-yellow-500' : 'bg-cyan-500/20 ring-2 ring-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.4)] text-cyan-400') 
                                  : ''
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