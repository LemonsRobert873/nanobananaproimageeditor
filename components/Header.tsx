
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, LayoutGroup } from 'framer-motion';
import { BookOpen, Key, Layers, Type, FileText, Wand2 } from 'lucide-react';
import { GenerationMode } from '../types';

interface HeaderProps {
  mode: GenerationMode;
  setMode: (mode: GenerationMode) => void;
  showGuide: boolean;
  setShowGuide: (show: boolean) => void;
  hasKey: boolean;
  handleKeyClick: () => void;
  isModalOpen?: boolean;
}

const Header: React.FC<HeaderProps> = ({ 
  mode, 
  setMode, 
  setShowGuide, 
  hasKey, 
  handleKeyClick,
  isModalOpen = false
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear the existing timer
  const stopTimer = useCallback(() => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  }, []);

  // Show the header
  const show = useCallback(() => {
    setIsVisible(true);
    stopTimer();
  }, [stopTimer]);

  // Start timer to hide the header
  const startTimer = useCallback(() => {
    stopTimer();
    if (isModalOpen) return;
    
    hideTimer.current = setTimeout(() => {
      setIsVisible(false);
    }, 2500); // 2.5s inactivity
  }, [stopTimer, isModalOpen]);

  // Handle updates when mode changes or modals open
  useEffect(() => {
    if (isModalOpen) {
      show();
    } else {
      // Resume timer if no modal and not hovering (handled by mouseLeave/Enter logic generally, 
      // but re-triggering ensures we don't get stuck)
      // We assume user is "active" if modal just closed, so we wait.
      startTimer();
    }
  }, [isModalOpen, show, startTimer]);

  useEffect(() => {
    show(); // Show on mode change
    // We don't necessarily want to start timer immediately on mode change, 
    // user might be hovering. mouseLeave will handle it.
  }, [mode, show]);

  // Initial load
  useEffect(() => {
    startTimer();
    return stopTimer;
  }, [startTimer, stopTimer]);

  return (
    <>
      {/* Trigger Zone (Hover/Tap to show) */}
      <div 
        className="fixed top-0 left-0 right-0 h-4 z-50 bg-transparent"
        onMouseEnter={show}
        onClick={show} // For touch devices
        role="presentation"
        aria-hidden="true"
      />

      <motion.header 
        // Layout & Animation
        // We use marginTop to collapse the space used by the header in the flex layout
        initial={{ marginTop: 0, opacity: 1 }}
        animate={{ 
          marginTop: isVisible ? 0 : -64, 
          opacity: isVisible ? 1 : 0 
        }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1.0] }}

        // Interaction handlers
        onMouseEnter={show}
        onMouseLeave={startTimer}
        onFocus={show} // Accessibility: show on keyboard focus
        onClick={show} // Clicking inside keeps it open
        
        className="flex-none h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md z-40 relative w-full"
      >
        <div className="max-w-[1800px] mx-auto px-4 h-full flex items-center justify-between">
          
          {/* Left: Logo */}
          <div className="flex items-center gap-6 shrink-0">
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
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

          {/* Right: API Key & Guide */}
          <motion.div 
             initial={{ opacity: 0, x: 20 }}
             animate={{ opacity: 1, x: 0 }}
             transition={{ delay: 0.1 }}
             className="flex items-center justify-end gap-3 w-auto shrink-0"
          >
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
          </motion.div>
        </div>
      </motion.header>
    </>
  );
};

export default Header;
