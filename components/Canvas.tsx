

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Type, Copy, Download, User, Sparkles, X, ImagePlus, MessageSquare, Info, Grid3X3, Trash2
} from 'lucide-react';
import { ModeState, HistoryItem, GenerationMode, ActiveGeneration } from '../types';
import { MODELS } from '../constants';
import Button from './Button';
import { useToast } from '../context/ToastContext';

interface CanvasProps {
  currentState: ModeState;
  updateCurrentState: (updates: Partial<ModeState>) => void;
  activeGenerations: ActiveGeneration[];
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
  onDeleteCurrent?: (id: string) => void;
  isGenerating?: boolean;
}

const Canvas: React.FC<CanvasProps> = ({
  currentState,
  updateCurrentState,
  activeGenerations,
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
  isModalOpen = false,
  onDeleteCurrent,
}) => {
  const { addToast } = useToast();
  const [isZoomed, setIsZoomed] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);
  const clickTargetRef = useRef<{ x: number, y: number } | null>(null);

  const currentHistoryItem = history.find(item => 
    (item.type === 'image' && item.url === currentState.generatedImage) ||
    (item.type === 'text' && item.text === currentState.generatedText)
  );

  useEffect(() => {
    setIsZoomed(false);
    clickTargetRef.current = null;
  }, [currentState.generatedImage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isZoomed && !isGalleryOpen && !isModalOpen) {
           setIsZoomed(false);
           e.stopImmediatePropagation(); 
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isZoomed, isGalleryOpen, isModalOpen]);

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
  
  const handleDeleteClick = () => {
      if (currentHistoryItem && onDeleteCurrent) {
          onDeleteCurrent(currentHistoryItem.id);
      }
  };

  const getModeLabel = (mode: GenerationMode) => {
      switch(mode) {
          case GenerationMode.IMAGE_EDIT: return 'IMAGE EDIT';
          case GenerationMode.IMAGE_TO_IMAGE: return 'IMG TO IMG';
          case GenerationMode.IMG_TO_PROMPT: return 'IMG TO PROMPT';
          case GenerationMode.TEXT_TO_PROMPT: return 'TEXT PROMPT';
          default: return 'GENERATING...';
      }
  };

  return (
    <section className="flex-1 flex flex-col bg-zinc-950 relative overflow-hidden h-full">
      <motion.div 
         initial={{ y: -20, opacity: 0 }}
         animate={{ y: 0, opacity: 1 }}
         transition={{ delay: 0.2 }}
         className="flex-none h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950 z-20 relative"
      >
        <div className="flex items-center gap-4 min-w-0 flex-1">
            <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-widest whitespace-nowrap">
                {currentState.generatedText ? 'Generated Prompt' : 'Result Canvas'}
            </h2>
        </div>
        
        <div className="flex items-center gap-3">
          {currentState.generatedText ? (
             <>
               <Button 
                  variant="ghost"
                  onClick={handleSendToImageEdit}
                  className="h-8 px-3 text-xs gap-2 text-yellow-500 hover:text-yellow-400 hover:bg-yellow-500/10 border border-yellow-500/20"
               >
                  <Type size={14} /> Use in Image Edit
               </Button>
               <div className="w-px h-4 bg-zinc-800" />
               <Button 
                  variant="ghost"
                  onClick={onCopyText}
                  className="h-8 px-3 text-xs gap-2"
               >
                  <Copy size={14} /> Copy
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

          {(currentState.generatedImage || currentState.generatedText) && (
             <>
                <div className="w-px h-4 bg-zinc-800" />
                <button 
                onClick={() => setShowInfo(!showInfo)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-xs font-medium border ${
                    showInfo 
                    ? 'bg-yellow-500 border-yellow-500 text-zinc-950 shadow-[0_0_10px_rgba(234,179,8,0.3)]' 
                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                }`}
                title="Toggle Info"
                >
                    <Info size={14} />
                    <span>Info</span>
                </button>

                <button 
                    onClick={handleDeleteClick}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-md transition-all text-xs font-medium border bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-900/50 hover:bg-red-900/10"
                    title="Delete this result"
                >
                    <Trash2 size={14} />
                </button>
             </>
          )}
        </div>
      </motion.div>

      <div className="flex-1 min-h-0 relative bg-zinc-950 flex flex-col">
         <div className="absolute inset-0 bg-[radial-gradient(#1f1f22_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

         <div className="relative w-full h-full overflow-hidden flex">
            
            <div className="absolute bottom-6 right-6 z-30 flex flex-col items-end justify-end pointer-events-none gap-4 max-h-[50%] overflow-visible">
                 <AnimatePresence>
                    {activeGenerations.map((gen) => {
                         const isProModel = gen.model === MODELS.PRO;
                         const isImageGen = gen.mode === GenerationMode.IMAGE_EDIT || gen.mode === GenerationMode.IMAGE_TO_IMAGE;
                         const isFlash = isImageGen && !isProModel;

                         const accentColor = isFlash ? 'text-cyan-400' : 'text-yellow-500';
                         const borderColor = isFlash ? 'border-cyan-500/30' : 'border-yellow-500/30';
                         const barColor = isFlash ? 'bg-cyan-500' : 'bg-yellow-500';

                         return (
                             <motion.div 
                                key={gen.mode}
                                layout
                                initial={{ opacity: 0, x: 20, y: 20 }}
                                animate={{ opacity: 1, x: 0, y: 0 }}
                                exit={{ opacity: 0, x: 20, y: 20 }}
                                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                                className={`bg-zinc-900/95 border ${borderColor} p-4 rounded-xl shadow-2xl backdrop-blur-md w-64 pointer-events-auto`}
                             >
                                  <div className="flex items-center justify-between mb-2">
                                      <div className={`flex items-center gap-2 ${accentColor}`}>
                                          <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}><Sparkles size={14}/></motion.span>
                                          <span className="text-xs font-bold tracking-wide uppercase">{getModeLabel(gen.mode)}</span>
                                      </div>
                                      <span className="text-xs text-zinc-400 font-mono">{Math.round(gen.progress)}%</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2 relative">
                                      <motion.div 
                                        className={`absolute h-full ${barColor}`} 
                                        style={{width: `${gen.progress}%`}} 
                                      >
                                         <motion.div 
                                             className="absolute inset-0 bg-white/30"
                                             animate={{ x: ['-100%', '100%'] }}
                                             transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                         />
                                      </motion.div>
                                  </div>
                                  <p className="text-[10px] text-zinc-500 truncate font-medium">{gen.step}</p>
                             </motion.div>
                         );
                    })}
                 </AnimatePresence>
            </div>

            <div className="flex-1 relative overflow-hidden flex flex-col">
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

                {!currentState.generatedText && (
                    <div 
                        ref={viewportRef}
                        className="w-full h-full overflow-auto flex relative z-10 custom-scrollbar"
                    >
                        {!currentState.generatedImage && !currentState.isGenerating && (
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
                                            Select a mode, configure settings, and click Generate.
                                        </p>
                                    </div>
                                </div>
                            </motion.div>
                        )}

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
                                    isZoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'
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

                            {/* Model Version - New Field */}
                            {currentHistoryItem.metadata.model && (
                                <div className="space-y-1">
                                    <label className="text-xs uppercase tracking-wider text-zinc-500 font-semibold">Model Version</label>
                                    <div className="text-xs text-zinc-300 bg-zinc-950/50 p-2 rounded border border-zinc-800/50 font-mono break-all">
                                        {currentHistoryItem.metadata.model}
                                    </div>
                                </div>
                            )}
                            
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

            <div className="absolute inset-0 pointer-events-none z-20 flex flex-col justify-between p-4 sm:p-6">
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

                 <div className="flex items-end justify-between w-full">
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
                 </div>
            </div>
         </div>
      </div>

      <motion.div 
         initial={{ y: 50, opacity: 0 }}
         animate={{ y: 0, opacity: 1 }}
         transition={{ delay: 0.3 }}
         className="flex-none h-24 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm flex items-center z-20 relative"
      >
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
                        (
                        (item.type === 'image' && currentState.generatedImage === item.url) || 
                        (item.type === 'text' && currentState.generatedText === item.text)
                        ) ? 'border-yellow-500 opacity-100' : 'border-zinc-800 opacity-60 hover:opacity-100'
                    }`}
                    title={`View in ${item.metadata?.mode}`}
                    draggable={item.type === 'image'}
                    onDragStart={(e) => {
                        if (item.type === 'image') {
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
                 className="scale-90 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 px-4 py-2 rounded-xl shadow-lg flex flex-col items-center justify-center gap-1 cursor-help min-w-[140px]"
                 title="Daily Quota resets at 12:00 AM PT (Pacific Time)"
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