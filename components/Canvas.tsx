
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Type, Copy, Download, User, Sparkles, X, ImagePlus, MessageSquare 
} from 'lucide-react';
import { ModeState, HistoryItem } from '../types';
import Button from './Button';

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
  handleCopyText
}) => {
  return (
    <section className="flex-1 flex flex-col bg-zinc-950 relative overflow-hidden">
      
      {/* Canvas Toolbar */}
      <motion.div 
         initial={{ y: -20, opacity: 0 }}
         animate={{ y: 0, opacity: 1 }}
         transition={{ delay: 0.2 }}
         className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950 z-10"
      >
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-widest">
            {currentState.generatedText ? 'Generated Prompt' : 'Result Canvas'}
        </h2>
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
                  onClick={handleCopyText}
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
                    onClick={() => currentState.generatedImage && handleDownload(currentState.generatedImage)}
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

      {/* Canvas Viewport */}
      <div className={`flex-1 flex items-center justify-center bg-[radial-gradient(#1f1f22_1px,transparent_1px)] [background-size:20px_20px] relative ${currentState.generatedText ? 'overflow-auto p-8' : 'overflow-hidden'}`}>
         
         {/* 1. Full Screen Progress UI (Images Only) */}
         <AnimatePresence mode="wait">
            {isGenerating && showFullProgress ? (
                <motion.div 
                   key="loading"
                   initial={{ opacity: 0, scale: 0.95 }}
                   animate={{ opacity: 1, scale: 1 }}
                   exit={{ opacity: 0, scale: 1.05 }}
                   className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm shadow-2xl max-w-md w-full"
                >
                    <div className="w-16 h-16 mx-auto bg-zinc-800 rounded-full flex items-center justify-center mb-6 relative">
                        <div className="absolute inset-0 rounded-full border-2 border-yellow-500/30 animate-ping"></div>
                        <motion.div
                           animate={{ rotate: 360 }}
                           transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        >
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
            ) : (
                /* 2. Content (Specific to Current Mode) */
                <motion.div 
                    key="content" 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="w-full h-full flex items-center justify-center"
                >
                    {/* TEXT RESULT VIEW */}
                    {currentState.generatedText ? (
                        <div className="w-full max-w-3xl h-full flex flex-col">
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl overflow-y-auto relative group"
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
                    ) : (
                        /* IMAGE RESULT VIEW (ZOOM/PAN REMOVED) */
                        <>
                            {currentState.comparisonImage && (
                                <motion.div 
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="absolute left-4 bottom-4 md:left-8 md:bottom-8 lg:top-1/2 lg:-translate-y-1/2 w-48 lg:w-64 bg-zinc-900 p-2 rounded-xl border border-zinc-700 shadow-2xl z-20 pointer-events-none"
                                >
                                <div className="relative group pointer-events-auto">
                                    <img src={currentState.comparisonImage} className="w-full rounded-lg" alt="Previous" />
                                    <button 
                                        onClick={() => updateCurrentState({ comparisonImage: null })} 
                                        className="absolute -top-3 -right-3 bg-zinc-800 text-white rounded-full p-1.5 border border-zinc-600 shadow-lg hover:bg-red-600 transition-colors"
                                    >
                                        <X size={14} />
                                    </button>
                                    <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] text-white/90 backdrop-blur-md font-medium">Previous</div>
                                </div>
                                </motion.div>
                            )}

                            {currentState.generatedImage ? (
                                <div className="w-full h-full flex items-center justify-center p-4">
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="relative inline-flex items-center justify-center shadow-2xl shadow-black rounded-lg ring-1 ring-zinc-800"
                                    >
                                        <button 
                                            onClick={() => updateCurrentState({ generatedImage: null })}
                                            className="absolute top-4 right-4 bg-black/60 hover:bg-red-500/90 text-white p-2 rounded-full backdrop-blur-sm transition-all z-20 opacity-0 group-hover:opacity-100"
                                            title="Close Image"
                                        >
                                            <X size={16} />
                                        </button>
                                        {/* Simplified Image Display (No Pan/Zoom) */}
                                        <img 
                                            src={currentState.generatedImage} 
                                            alt="Generated result" 
                                            className="max-w-full max-h-[85vh] w-auto h-auto object-contain bg-[#121212] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] rounded-lg shadow-lg" 
                                        />
                                    </motion.div>
                                </div>
                            ) : (
                                /* Placeholder only if no text result either */
                                !isGenerating && (
                                    <motion.div 
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-center space-y-6 max-w-md w-full opacity-60"
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
                                )
                            )}
                        </>
                    )}
                </motion.div>
            )}
         </AnimatePresence>

          {/* Mini Progress Widget */}
          <AnimatePresence>
            {isGenerating && !showFullProgress && (
                 <motion.div 
                    initial={{ opacity: 0, y: 20, x: 20 }}
                    animate={{ opacity: 1, y: 0, x: 0 }}
                    exit={{ opacity: 0, y: 20, x: 20 }}
                    className="absolute bottom-6 right-6 w-72 bg-zinc-900/90 border border-yellow-500/30 p-4 rounded-xl shadow-2xl backdrop-blur-md z-30"
                 >
                     <div className="flex items-center justify-between mb-3">
                         <div className="flex items-center gap-2 text-yellow-500">
                             <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}><Sparkles size={14}/></motion.span>
                             <span className="text-xs font-bold tracking-wide uppercase">Working...</span>
                         </div>
                         <span className="text-xs text-zinc-400 font-mono">{Math.floor(visualProgress)}%</span>
                     </div>
                     <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2 relative">
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

      {/* History Strip */}
      <motion.div 
         initial={{ y: 50, opacity: 0 }}
         animate={{ y: 0, opacity: 1 }}
         transition={{ delay: 0.3 }}
         className="h-28 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm flex items-center px-6 gap-4 overflow-x-auto"
      >
         {history.length === 0 ? (
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
               className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-colors relative group flex flex-col items-center justify-center ${
                 !isGenerating && (
                   (item.type === 'image' && currentState.generatedImage === item.url) || 
                   (item.type === 'text' && currentState.generatedText === item.text)
                 ) ? 'border-yellow-500 opacity-100' : 'border-zinc-800 opacity-60 hover:opacity-100'
               }`}
               title={item.type === 'image' ? 'View Image' : 'View Prompt Text'}
             >
               {item.type === 'image' ? (
                   <img src={item.url} className="w-full h-full object-cover" alt="History" />
               ) : (
                   <div className="w-full h-full bg-zinc-900 p-2 flex flex-col items-center justify-center text-zinc-500">
                       <MessageSquare size={20} className="mb-1 text-zinc-600 group-hover:text-yellow-500 transition-colors" />
                       <div className="w-full space-y-1">
                            <div className="h-1 w-full bg-zinc-800 rounded-full" />
                            <div className="h-1 w-3/4 bg-zinc-800 rounded-full" />
                            <div className="h-1 w-1/2 bg-zinc-800 rounded-full" />
                       </div>
                   </div>
               )}
               <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.type === 'text' && <div className="bg-zinc-950/80 p-1 rounded text-yellow-500"><Type size={10} /></div>}
               </div>
             </motion.button>
           ))
         )}
      </motion.div>

    </section>
  );
};

export default Canvas;
