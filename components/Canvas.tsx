
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Type, Copy, Download, User, Sparkles, X, ImagePlus, MessageSquare, Info, Grid3X3
} from 'lucide-react';
import { ModeState, HistoryItem, GenerationMode } from '../types';
import Button from './Button';
import { useToast } from '../context/ToastContext';

interface CanvasProps {
  currentState: ModeState;
  updateCurrentState: (updates: Partial<ModeState>) => void;
  isGenerating: boolean;
  showFullProgress: boolean;
  progressStep: string;
  visualProgress: number;
  history: HistoryItem[];
  handleHistorySelect: (item: HistoryItem) => void;
  handleDownload: (url: string) => void;
  handleUseAsSubject: (url: string) => void;
  handleSendToImageEdit: () => void;
  handleCopyText: () => void;
  dailyImageCount?: number;
  onOpenGallery?: () => void;
  isHistoryLoading?: boolean;
  isGalleryOpen?: boolean;
  isModalOpen?: boolean;
}

const Canvas: React.FC<CanvasProps> = ({
  currentState,
  updateCurrentState,
  isGenerating,
  showFullProgress,
  progressStep,
  visualProgress,
  history,
  handleHistorySelect,
  handleDownload,
  handleUseAsSubject,
  handleSendToImageEdit,
  handleCopyText,
  dailyImageCount = 0,
  onOpenGallery,
  isHistoryLoading = false,
  isGalleryOpen = false,
  isModalOpen = false
}) => {
  const { addToast } = useToast();
  const [isZoomed, setIsZoomed] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const clickTargetRef = useRef<{ x: number, y: number } | null>(null);

  // Find the history item that matches the current view to show its metadata
  const currentHistoryItem = history.find(item => 
    (item.type === 'image' && item.url === currentState.generatedImage) ||
    (item.type === 'text' && item.text === currentState.generatedText)
  );

  // Reset zoom state when the generated image changes
  useEffect(() => {
    setIsZoomed(false);
    clickTargetRef.current = null;
  }, [currentState.generatedImage]);

  // Handle Global Escape Key for Zoom Reset
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Priority 1: If Canvas is zoomed and no higher priority modal (Gallery/Guide) is open
        if (isZoomed && !isGalleryOpen && !isModalOpen) {
           setIsZoomed(false);
           e.stopImmediatePropagation(); // Handle locally, don't let App handle
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoomed, isGalleryOpen, isModalOpen]);

  // Handle scroll positioning after zoom toggles
  useEffect(() => {
    if (isZoomed && clickTargetRef.current && viewportRef.current) {
        const viewport = viewportRef.current;
        const img = viewport.querySelector('img');
        
        if (img) {
             const { x, y } = clickTargetRef.current;
             
             requestAnimationFrame(() => {
                 const viewportW = viewport.clientWidth;
                 const viewportH = viewport.clientHeight;
                 
                 const imgW = img.offsetWidth;
                 const imgH = img.offsetHeight;
                 const imgLeft = img.offsetLeft;
                 const imgTop = img.offsetTop;

                 const targetX = imgLeft + (imgW * x);
                 const targetY = imgTop + (imgH * y);

                 const scrollLeft = targetX - (viewportW / 2);
                 const scrollTop = targetY - (viewportH / 2);
                 
                 viewport.scrollTo({ left: scrollLeft, top: scrollTop, behavior: 'instant' });
                 clickTargetRef.current = null;
             });
        }
    } else if (!isZoomed && viewportRef.current) {
         viewportRef.current.scrollTo({ left: 0, top: 0, behavior: 'instant' });
    }
  }, [isZoomed]);

  const handleZoomClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (isGenerating) return;

    if (isZoomed) {
        setIsZoomed(false);
    } else {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        
        clickTargetRef.current = { x, y };
        setIsZoomed(true);
    }
  };

  const onCopyText = () => {
    handleCopyText();
    addToast('Prompt copied to clipboard', 'success');
  };

  const onDownload = (url: string) => {
    handleDownload(url);
    addToast('Download started', 'info');
  };

  return (
    <section className="flex-1 flex flex-col bg-zinc-950 relative overflow-hidden h-full">
      
      {/* 1. Canvas Toolbar (Header) */}
      <motion.div 
         initial={{ y: -20, opacity: 0 }}
         animate={{ y: 0, opacity: 1 }}
         transition={{ delay: 0.2 }}
         className="flex-none h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950 z-20 relative"
      >
        <div className="flex items-center gap-4">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-widest">
                {currentState.generatedText ? 'Generated Prompt' : 'Result Canvas'}
            </h2>
            {(currentState.generatedImage || currentState.generatedText) && (
                <button 
                  onClick={() => setShowInfo(!showInfo)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-xs font-medium border ${
                    showInfo 
                      ? 'bg-yellow-500 border-yellow-500 text-zinc-950 shadow-[0_0_10px_rgba(234,179,8,0.3)]' 
                      : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                  }`}
                  title="Toggle Metadata Inspector"
                >
                    <Info size={14} />
                    <span>{currentState.generatedText ? 'Text Info' : 'Image Info'}</span>
                </button>
            )}
        </div>
        
        <div className="flex items-center gap-2">
          {currentState.generatedText ? (
             <>
               <Button 
                  variant="ghost"
                  onClick={handleSendToImageEdit}
                  className="h-8 px-3 text-xs gap-2 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 border border-yellow-500/20"
               >
                  <Type size={14} /> Use in Image Edit
               </Button>
               <div className="w-px h-4 bg-zinc-800 mx-1" />
               <Button 
                  variant="ghost"
                  onClick={onCopyText}
                  className="h-8 px-3 text-xs gap-2"
               >
                  <Copy size={14} /> Copy Text
               </Button>
             </>
          ) : (
            <>
                <Button 
                    variant="ghost" 
                    disabled={!currentState.generatedImage} 
                    onClick={() => currentState.generatedImage && onDownload(currentState.generatedImage)}
                    className="h-8 px-3 text-xs gap-2"
                >
                    <Download size={14} /> Download
                </Button>
                <Button 
                    variant="ghost" 
                    disabled={!currentState.generatedImage} 
                    onClick={() => currentState.generatedImage && handleUseAsSubject(currentState.generatedImage)}
                    className="h-8 px-3 text-xs gap-2"
                >
                    <User size={14} /> Use as Subject
                </Button>
            </>
          )}
        </div>
      </motion.div>

      {/* 2. Canvas Viewport (Flexible Middle Area) */}
      <div className="flex-1 min-h-0 relative bg-zinc-950 flex flex-col">
         {/* Background Pattern */}
         <div className="absolute inset-0 bg-[radial-gradient(#1f1f22_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

         {/* Content Container */}
         <div className="relative w-full h-full overflow-hidden flex">
            
            {/* Loading Overlay */}
            <AnimatePresence mode="wait">
                {isGenerating && showFullProgress && (
                    <motion.div 
                       key="loading"
                       initial={{ opacity: 0 }}
                       animate={{ opacity: 1 }}
                       exit={{ opacity: 0 }}
                       className="absolute inset-0 z-30 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-8"
                    >
                        <motion.div 
                           className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-8 shadow-2xl max-w-md w-full"
                           initial={{ scale: 0.95 }}
                           animate={{ scale: 1 }}
                        >
                            <div className="w-16 h-16 mx-auto bg-zinc-800 rounded-full flex items-center justify-center mb-6 relative">
                                <div className="absolute inset-0 rounded-full border-2 border-yellow-500/30 animate-ping"></div>
                                <motion.div animate={{ rotate: 360 }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }}>
                                    <Sparkles className="w-8 h-8 text-yellow-500" />
                                </motion.div>
                            </div>
                            <div className="space-y-4">
                                <h3 className="text-xl font-medium text-white text-center">{progressStep}</h3>
                                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden relative">
                                    <motion.div 
                                        className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full"
                                        initial={{ width: 0 }}
                                        animate={{ width: `${Math.min(100, Math.max(0, visualProgress))}%` }}
                                        transition={{ ease: "linear" }}
                                    >
                                        <motion.div 
                                            className="absolute inset-0 bg-white/20"
                                            animate={{ x: ['-100%', '100%'] }}
                                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                        />
                                    </motion.div>
                                </div>
                                <div className="flex justify-between text-xs text-zinc-500 font-medium uppercase tracking-wider">
                                    <span>Processing</span>
                                    <span>{Math.floor(visualProgress)}%</span>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Display Area */}
            <div className="flex-1 relative overflow-hidden flex flex-col">
                {/* Text Result View */}
                {currentState.generatedText && (
                    <div className="w-full h-full overflow-auto p-8 flex justify-center relative z-10 custom-scrollbar">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="w-full max-w-3xl bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl h-fit relative group"
                        >
                            <button 
                                onClick={() => updateCurrentState({ generatedText: null })}
                                className="absolute top-4 right-4 text-zinc-500 hover:text-white transition-colors p-1"
                                title="Clear Result"
                            >
                                <X size={16} />
                            </button>
                            <pre className="whitespace-pre-wrap font-mono text-sm text-zinc-300 leading-relaxed">
                                {currentState.generatedText}
                            </pre>
                        </motion.div>
                    </div>
                )}

                {/* Image Result View with Zoom */}
                {!currentState.generatedText && (
                    <div 
                        ref={viewportRef}
                        className="w-full h-full overflow-auto flex relative z-10 custom-scrollbar"
                    >
                        {/* Placeholder */}
                        {!currentState.generatedImage && !isGenerating && (
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="m-auto text-center space-y-6 max-w-md w-full opacity-60 p-4"
                            >
                                <div className="space-y-4">
                                    <div className="w-20 h-20 bg-zinc-900 rounded-2xl mx-auto flex items-center justify-center border border-zinc-800 rotate-3 group hover:rotate-6 transition-transform duration-300">
                                        <ImagePlus className="w-10 h-10 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                                    </div>
                                    <div>
                                        <h3 className="text-zinc-300 font-medium text-lg">Ready to create</h3>
                                        <p className="text-zinc-500 text-sm mt-2 max-w-xs mx-auto">
                                            Select a mode above to start generating images or prompts.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Generated Image */}
                        {currentState.generatedImage && (
                            <img 
                                onClick={handleZoomClick}
                                src={currentState.generatedImage} 
                                alt="Generated result" 
                                draggable={!isZoomed}
                                onDragStart={(e) => {
                                    if (currentState.generatedImage) {
                                        e.dataTransfer.setData('application/x-nanobanana-image', currentState.generatedImage);
                                        e.dataTransfer.effectAllowed = 'copy';
                                    }
                                }}
                                className={`m-auto transition-transform duration-200 ease-out shadow-lg block ${
                                    isGenerating ? 'cursor-wait' : (isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in')
                                }`}
                                style={isZoomed ? {
                                    height: '200%',
                                    width: 'auto',
                                    maxWidth: 'none',
                                    maxHeight: 'none',
                                    flexShrink: 0
                                } : {
                                    maxWidth: '100%',
                                    maxHeight: '100%',
                                    width: 'auto',
                                    height: 'auto',
                                    objectFit: 'contain'
                                }}
                            />
                        )}
                    </div>
                )}
            </div>

            {/* Metadata Inspector Panel */}
            <AnimatePresence>
                {showInfo && currentHistoryItem?.metadata && (
                    <motion.div 
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 320, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="h-full border-l border-zinc-800 bg-zinc-900/80 backdrop-blur-md overflow-hidden flex flex-col relative z-20 shrink-0"
                    >
                         <div className="p-4 border-b border-zinc-800 flex justify-between items-center w-[320px]">
                            <h3 className="font-medium text-sm text-zinc-200">Metadata Inspector</h3>
                            <button onClick={() => setShowInfo(false)} className="text-zinc-500 hover:text-white">
                                <X size={14} />
                            </button>
                         </div>
                         <div className="flex-1 overflow-y-auto p-4 space-y-6 w-[320px] custom-scrollbar">
                            <div className="space-y-1">
                                <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Generation Mode</label>
                                <div className="text-sm text-zinc-300 font-medium bg-zinc-950/50 p-2 rounded border border-zinc-800/50">
                                    {currentHistoryItem.metadata.mode}
                                </div>
                            </div>
                            
                            {/* Ref Strength Display - Only for Image To Image Mode */}
                            {currentHistoryItem.metadata.mode === GenerationMode.IMAGE_TO_IMAGE && currentHistoryItem.metadata.refStrength !== undefined && (
                                <div className="space-y-1">
                                    <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Ref Strength</label>
                                    <div className="text-sm text-yellow-500 font-medium bg-zinc-950/50 p-2 rounded border border-zinc-800/50 flex items-center justify-between">
                                        <span>{currentHistoryItem.metadata.refStrength}%</span>
                                        <span className="text-xs text-zinc-500">
                                            {currentHistoryItem.metadata.refStrength >= 80 ? 'Strict' : currentHistoryItem.metadata.refStrength <= 40 ? 'Creative' : 'Balanced'}
                                        </span>
                                    </div>
                                </div>
                            )}

                            {currentHistoryItem.metadata.aspectRatio && (
                                <div className="space-y-1">
                                    <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Settings</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-zinc-950/50 p-2 rounded border border-zinc-800/50">
                                            <div className="text-xs text-zinc-500">Ratio</div>
                                            <div className="text-sm text-zinc-300">{currentHistoryItem.metadata.aspectRatio}</div>
                                        </div>
                                        {currentHistoryItem.metadata.resolution && (
                                            <div className="bg-zinc-950/50 p-2 rounded border border-zinc-800/50">
                                                <div className="text-xs text-zinc-500">Resolution</div>
                                                <div className="text-sm text-zinc-300">{currentHistoryItem.metadata.resolution}</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {currentHistoryItem.metadata.referenceOperation && (
                                <div className="space-y-1">
                                    <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Ref Operation</label>
                                    <div className="text-sm text-zinc-300 bg-zinc-950/50 p-2 rounded border border-zinc-800/50 break-words">
                                        {currentHistoryItem.metadata.referenceOperation}
                                    </div>
                                </div>
                            )}

                            {currentHistoryItem.metadata.textPrompt && (
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Prompt</label>
                                        <button 
                                            onClick={() => {
                                                navigator.clipboard.writeText(currentHistoryItem.metadata.textPrompt!);
                                                addToast('Copied to clipboard', 'info');
                                            }}
                                            className="text-[10px] flex items-center gap-1.5 text-zinc-500 hover:text-yellow-500 transition-colors px-2 py-0.5 rounded bg-zinc-800/50 hover:bg-zinc-800"
                                        >
                                            <Copy size={10} /> Copy
                                        </button>
                                    </div>
                                    <div className="text-xs text-zinc-400 bg-zinc-950/50 p-3 rounded border border-zinc-800/50 leading-relaxed max-h-60 overflow-y-auto whitespace-pre-wrap">
                                        {currentHistoryItem.metadata.textPrompt}
                                    </div>
                                </div>
                            )}

                            {/* Negative Prompt Display */}
                            {currentHistoryItem.metadata.negativePrompt && (
                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs uppercase tracking-wider text-red-400 font-semibold">Negative Prompt</label>
                                    </div>
                                    <div className="text-xs text-red-200/80 bg-red-950/20 p-3 rounded border border-red-900/30 leading-relaxed max-h-40 overflow-y-auto whitespace-pre-wrap">
                                        {currentHistoryItem.metadata.negativePrompt}
                                    </div>
                                </div>
                            )}
                            
                            <div className="space-y-1 pt-4 border-t border-zinc-800/50">
                                <label className="text-xs uppercase tracking-wider text-zinc-600 font-semibold">Generated On</label>
                                <div className="text-xs text-zinc-500">
                                    {new Date(currentHistoryItem.timestamp).toLocaleString()}
                                </div>
                            </div>
                         </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Viewport Overlays (Comparison, Close, Mini Progress) */}
            <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 sm:p-6">
                 {/* Top Row: Close Button (Disabled when Info panel is open to prevent duplicate buttons) */}
                 <div className="flex justify-end mr-8">
                    {currentState.generatedImage && !currentState.generatedText && !showInfo && (
                        <motion.button 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            onClick={(e) => { e.stopPropagation(); updateCurrentState({ generatedImage: null }); }}
                            className="pointer-events-auto bg-black/50 hover:bg-red-500/90 text-white p-2 rounded-full backdrop-blur-sm transition-all shadow-lg hover:scale-105 active:scale-95"
                            title="Close Image"
                        >
                            <X size={16} />
                        </motion.button>
                    )}
                 </div>

                 {/* Bottom Row: Comparison & Mini-Progress */}
                 <div className="flex items-end justify-between w-full">
                     {/* Comparison Image */}
                     <div className="pointer-events-auto">
                        {currentState.comparisonImage && !currentState.generatedText && (
                            <motion.div 
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="w-32 sm:w-48 bg-zinc-900 p-2 rounded-xl border border-zinc-700 shadow-2xl relative group"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <img src={currentState.comparisonImage} draggable="false" className="w-full rounded-lg" alt="Previous" />
                                <button 
                                    onClick={(e) => { e.stopPropagation(); updateCurrentState({ comparisonImage: null }); }} 
                                    className="absolute -top-2 -right-2 bg-zinc-800 text-white rounded-full p-1.5 border border-zinc-600 shadow-lg hover:bg-red-600 transition-colors"
                                >
                                    <X size={12} />
                                </button>
                                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white/90 backdrop-blur-md font-medium">Previous</div>
                            </motion.div>
                        )}
                     </div>

                     {/* Mini Progress Widget */}
                     <div className="pointer-events-auto">
                         <AnimatePresence>
                            {isGenerating && !showFullProgress && (
                                 <motion.div 
                                    initial={{ opacity: 0, y: 20, x: 20 }}
                                    animate={{ opacity: 1, y: 0, x: 0 }}
                                    exit={{ opacity: 0, y: 20, x: 20 }}
                                    className="w-64 bg-zinc-900/90 border border-yellow-500/30 p-3 rounded-xl shadow-2xl backdrop-blur-md"
                                 >
                                     <div className="flex items-center justify-between mb-2">
                                         <div className="flex items-center gap-2 text-yellow-500">
                                             <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}><Sparkles size={12}/></motion.span>
                                             <span className="text-[10px] font-bold tracking-wide uppercase">Processing...</span>
                                         </div>
                                         <span className="text-[10px] text-zinc-400 font-mono">{Math.floor(visualProgress)}%</span>
                                     </div>
                                     <div className="w-full h-1 bg-zinc-800 rounded-full overflow-hidden mb-1 relative">
                                         <motion.div 
                                           className="absolute h-full bg-yellow-500" 
                                           style={{width: `${visualProgress}%`}} 
                                         >
                                            <motion.div 
                                                className="absolute inset-0 bg-white/30"
                                                animate={{ x: ['-100%', '100%'] }}
                                                transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                            />
                                         </motion.div>
                                     </div>
                                     <p className="text-[10px] text-zinc-500 truncate font-medium">{progressStep}</p>
                                 </motion.div>
                              )}
                          </AnimatePresence>
                     </div>
                 </div>
            </div>
         </div>
      </div>

      {/* 3. History Strip (Footer) */}
      <motion.div 
         initial={{ y: 50, opacity: 0 }}
         animate={{ y: 0, opacity: 1 }}
         transition={{ delay: 0.3 }}
         className="flex-none h-24 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm flex items-center z-20 relative"
      >
         {/* View All Button */}
         <div className="shrink-0 h-full flex items-center pl-4 pr-2 border-r border-zinc-800/30">
            <button 
                onClick={onOpenGallery}
                className="flex flex-col items-center justify-center gap-1.5 w-16 h-16 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:text-white text-zinc-500 transition-colors group"
                title="View Full Gallery"
            >
                <Grid3X3 size={18} className="group-hover:text-yellow-500 transition-colors" />
                <span className="text-[10px] font-medium">View All</span>
            </button>
         </div>

         <div className="flex-1 overflow-x-auto h-full flex items-center px-4 gap-4 custom-scrollbar">
            {isHistoryLoading ? (
                // Skeletons
                Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="shrink-0 w-16 h-16 rounded-lg bg-zinc-900 border border-zinc-800 relative overflow-hidden">
                        <motion.div 
                            className="absolute inset-0 bg-gradient-to-r from-transparent via-zinc-800/30 to-transparent"
                            animate={{ x: ['-100%', '100%'] }}
                            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                        />
                    </div>
                ))
            ) : history.length === 0 ? (
                <div className="text-xs text-zinc-600 font-medium w-full text-center">Your generated history will appear here</div>
            ) : (
                history.map(item => (
                    <motion.button 
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.05, borderColor: '#EAB308' }}
                    key={item.id}
                    onClick={() => handleHistorySelect(item)}
                    className={`shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-colors relative group flex flex-col items-center justify-center ${
                        !isGenerating && (
                        (item.type === 'image' && currentState.generatedImage === item.url) || 
                        (item.type === 'text' && currentState.generatedText === item.text)
                        ) ? 'border-yellow-500 opacity-100' : 'border-zinc-800 opacity-60 hover:opacity-100'
                    }`}
                    title={item.type === 'image' ? 'View Image' : 'View Prompt Text'}
                    draggable={item.type === 'image'}
                    onDragStart={(e) => {
                        if (item.type === 'image') {
                        // We must use React.DragEvent to avoid TS errors or cast it
                        const dragEvent = e as unknown as React.DragEvent;
                        dragEvent.dataTransfer.setData('application/x-nanobanana-image', item.url);
                        dragEvent.dataTransfer.effectAllowed = 'copy';
                        }
                    }}
                    >
                    {item.type === 'image' ? (
                        <img src={item.url} draggable="false" className="w-full h-full object-cover" alt="History" />
                    ) : (
                        <div className="w-full h-full bg-zinc-900 p-2 flex flex-col items-center justify-center text-zinc-500">
                            <MessageSquare size={20} className="mb-1 text-zinc-600 group-hover:text-yellow-500 transition-colors" />
                            <div className="w-full space-y-1">
                                <div className="h-1 w-full bg-zinc-800 rounded-full" />
                                <div className="h-1 w-3/4 bg-zinc-800 rounded-full" />
                            </div>
                        </div>
                    )}
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        {item.type === 'text' && (
                            <div className="bg-zinc-950/80 p-1 rounded text-yellow-500 shadow-sm flex items-center justify-center">
                                <Type size={10} />
                            </div>
                        )}
                    </div>
                    </motion.button>
                ))
            )}
         </div>

         <div className="shrink-0 h-full flex items-center px-6 border-l border-zinc-800/30 bg-zinc-900/10">
              <div 
                 className="bg-zinc-950/80 backdrop-blur-md border border-zinc-800 px-4 py-2 rounded-xl shadow-lg flex flex-col items-center justify-center gap-1 cursor-help min-w-[140px]"
                 title="Resets daily at 12:00 AM PT (Pacific Time)"
              >
                 <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest leading-tight text-center">Today Generated</span>
                 <span className="text-zinc-200 font-bold text-sm leading-none text-center">Images : {dailyImageCount}</span>
              </div>
         </div>
      </motion.div>

    </section>
  );
};

export default Canvas;
