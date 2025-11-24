

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, AlertCircle, User, ImagePlus, Copy, X, 
  Maximize2, Settings, ChevronDown, ChevronUp, Sliders, RotateCw
} from 'lucide-react';
import { 
  GenerationMode, 
  ReferenceOperation, 
  AspectRatio, 
  Resolution, 
  ModeState 
} from '../types';
import { ASPECT_RATIOS, RESOLUTIONS } from '../constants';
import Button from './Button';
import FileUpload from './FileUpload';

interface SidebarProps {
  mode: GenerationMode;
  currentState: ModeState;
  updateCurrentState: (updates: Partial<ModeState>) => void;
  isGenerating: boolean;
  handleGenerate: () => void;
  handleRetry: () => void;
  error: string | null;
  width: number;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  mode, 
  currentState, 
  updateCurrentState, 
  isGenerating, 
  handleGenerate, 
  handleRetry,
  error,
  width
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTarget, setActiveTarget] = useState<'subject' | 'reference' | null>(null);
  
  const handleReferenceSelect = (file: File | null) => {
    let isLowRes = false;
    if (file) {
      const img = new Image();
      img.onload = () => {
        isLowRes = img.width < 512 || img.height < 512;
        updateCurrentState({ referenceImage: file, isRefLowRes: isLowRes });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = () => {
        updateCurrentState({ referenceImage: file, isRefLowRes: false });
        URL.revokeObjectURL(img.src);
      }
      img.src = URL.createObjectURL(file);
    } else {
      updateCurrentState({ referenceImage: null, isRefLowRes: false });
    }
  };

  // Clipboard Paste Listener
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
        // Ignore if pasting into a text field
        const target = document.activeElement as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        
        if (isInput) return;
  
        if (!activeTarget) return;
  
        const items = e.clipboardData?.items;
        if (!items) return;
  
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            e.preventDefault();
            const blob = items[i].getAsFile();
            if (blob) {
               const file = new File([blob], "pasted-image.png", { type: blob.type });
               if (activeTarget === 'subject') {
                   updateCurrentState({ subjectImage: file });
               } else if (activeTarget === 'reference') {
                   handleReferenceSelect(file);
               }
            }
            break;
          }
        }
      };
      window.addEventListener('paste', handlePaste);
      return () => window.removeEventListener('paste', handlePaste);
  }, [activeTarget, currentState]);

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const shortcutLabel = isMac ? 'Cmd+Enter' : 'Ctrl+Enter';

  // Use the error passed from props (which should be currentState.errorMessage from App)
  // or fall back to local error state if managed there (currently handled by App)
  const displayError = error || currentState.errorMessage;

  return (
    <aside 
      style={{ width }}
      className="flex-none flex flex-col border-r border-zinc-800 bg-zinc-950 overflow-y-auto"
    >
      <motion.div 
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
        className="p-6 space-y-8"
      >
        
        {/* Subject Image (Hidden for Text-to-Prompt) */}
        <AnimatePresence mode="popLayout">
            {mode !== GenerationMode.TEXT_TO_PROMPT && (
                <motion.section 
                    key="subject-input"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4 overflow-hidden"
                    onClick={() => setActiveTarget('subject')}
                >
                    <div className="flex items-center gap-2 text-zinc-100 font-medium">
                        <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs">1</div>
                        <div className="flex items-center">
                            {mode === GenerationMode.IMG_TO_PROMPT ? 'Input Image' : 'Subject Face'}
                            {mode !== GenerationMode.IMAGE_EDIT && <span className="text-yellow-500 ml-1">*</span>}
                            {mode === GenerationMode.IMAGE_EDIT && <span className="text-zinc-500 text-xs ml-2 font-normal">(Optional)</span>}
                        </div>
                    </div>
                    
                    {/* Image Edit Mode Status Indicator */}
                    {mode === GenerationMode.IMAGE_EDIT && (
                        <motion.div 
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mb-2"
                        >
                            {currentState.subjectImage ? (
                                <div className="flex items-center gap-2 text-xs text-green-400 bg-green-950/20 px-3 py-2 rounded-lg border border-green-900/50">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></span>
                                    <span className="font-medium">Identity-locked mode active</span>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-950/20 px-3 py-2 rounded-lg border border-blue-900/50">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 shadow-[0_0_5px_rgba(59,130,246,0.5)]"></span>
                                    <span className="font-medium">Prompt-only generation mode</span>
                                </div>
                            )}
                        </motion.div>
                    )}

                    <FileUpload 
                        label="" 
                        helperText={mode === GenerationMode.IMG_TO_PROMPT ? "Upload image to analyze." : "Clear front-facing photo of the subject."}
                        selectedFile={currentState.subjectImage}
                        onFileSelect={(f) => updateCurrentState({ subjectImage: f })}
                        isActive={activeTarget === 'subject'}
                        onActivate={() => setActiveTarget('subject')}
                    />
                </motion.section>
            )}
        </AnimatePresence>

        {/* Mode Specific Inputs */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-zinc-100 font-medium">
            <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs">
                {mode === GenerationMode.TEXT_TO_PROMPT ? '1' : '2'}
            </div>
            {mode === GenerationMode.IMAGE_EDIT ? 'Prompt Instructions' : 
             mode === GenerationMode.IMAGE_TO_IMAGE ? 'Reference & Operation' : 
             'Configuration'}
          </div>

          <motion.div 
             layout
             className="bg-zinc-900/40 rounded-xl p-4 border border-zinc-800/50 space-y-4"
          >
            
            {/* PROMPT GENERATOR TOGGLE - FIXED WITH MOTION */}
            {(mode === GenerationMode.IMG_TO_PROMPT || mode === GenerationMode.TEXT_TO_PROMPT) && (
                <div className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                    <div className="space-y-0.5">
                        <span className="text-sm font-medium text-zinc-200 block">Use Face Feature in Prompt</span>
                        <span className="text-xs text-zinc-500 block">
                            {currentState.useFaceFeature ? 'Strictly maintain face identity' : 'General portrait description'}
                        </span>
                    </div>
                    <button 
                        onClick={() => updateCurrentState({ useFaceFeature: !currentState.useFaceFeature })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${currentState.useFaceFeature ? 'bg-yellow-500' : 'bg-zinc-700'}`}
                    >
                        <motion.span 
                           className="absolute top-1 left-1 bg-white w-4 h-4 rounded-full shadow-sm"
                           initial={false}
                           animate={{ x: currentState.useFaceFeature ? 20 : 0 }}
                           transition={{ type: "spring", stiffness: 500, damping: 30 }}
                        />
                    </button>
                </div>
            )}

            {/* IMAGE REFERENCE UPLOAD */}
            <AnimatePresence>
                {mode === GenerationMode.IMAGE_TO_IMAGE && (
                <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                    onClick={() => setActiveTarget('reference')}
                >
                    <div>
                    <FileUpload 
                        label="Reference Image"
                        helperText="Clothing style or scene composition."
                        selectedFile={currentState.referenceImage}
                        onFileSelect={handleReferenceSelect}
                        required
                        className="mb-2"
                        isActive={activeTarget === 'reference'}
                        onActivate={() => setActiveTarget('reference')}
                    />
                    {currentState.isRefLowRes && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-yellow-500 text-xs bg-yellow-500/10 p-2 rounded border border-yellow-500/20 mb-2">
                        <AlertCircle size={12} />
                        <span>Low resolution reference. Results may vary.</span>
                        </motion.div>
                    )}
                    </div>

                    {/* REFERENCE STRENGTH SLIDER */}
                    <div className="space-y-2 p-3 bg-zinc-900 rounded-lg border border-zinc-800">
                        <div className="flex justify-between items-center">
                            <label className="text-xs font-medium text-zinc-300">Reference Strength</label>
                            <span className="text-xs text-yellow-500 font-bold">{currentState.refStrength}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="0" 
                            max="100" 
                            value={currentState.refStrength} 
                            onChange={(e) => updateCurrentState({ refStrength: parseInt(e.target.value) })}
                            className="w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-yellow-500 focus:outline-none focus:ring-0"
                        />
                        <div className="flex justify-between text-[10px] text-zinc-500">
                            <span>Creative</span>
                            <span>Balanced</span>
                            <span>Strict</span>
                        </div>
                    </div>
                    
                    <div className="space-y-2">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Operation</label>
                    <div className="grid grid-cols-1 gap-2">
                        {/* Operations Buttons */}
                        {[
                            { op: ReferenceOperation.APPLY_CLOTHING, label: 'Apply Clothing', desc: 'Put subject in reference outfit', icon: User },
                            { op: ReferenceOperation.REPLACE_FACE, label: 'Replace Face', desc: 'Swap face in reference scene', icon: ImagePlus },
                            { op: ReferenceOperation.REPLICATE_REFERENCE, label: 'Replicate Reference Image', desc: 'Recreate full scene with subject', icon: Copy },
                        ].map(item => (
                            <motion.button
                                key={item.op}
                                whileHover={{ scale: 1.01 }}
                                whileTap={{ scale: 0.99 }}
                                onClick={(e) => { e.stopPropagation(); updateCurrentState({ refOperation: item.op }); }}
                                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${
                                    currentState.refOperation === item.op
                                    ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-100' 
                                    : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                }`}
                            >
                                <item.icon size={18} className="mt-0.5 shrink-0" />
                                <div>
                                    <span className="block text-sm font-medium">{item.label}</span>
                                    <span className="block text-xs opacity-70 mt-0.5">{item.desc}</span>
                                </div>
                            </motion.button>
                        ))}
                    </div>
                    </div>
                </motion.div>
                )}
            </AnimatePresence>

            {/* TEXT INPUT AREA */}
            <div className="space-y-2">
               <div className="flex justify-between items-baseline">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                        {mode === GenerationMode.TEXT_TO_PROMPT ? 'Concept Description' : 
                        mode === GenerationMode.IMG_TO_PROMPT ? 'Additional Context (Optional)' : 
                        mode === GenerationMode.IMAGE_EDIT ? 'Description' : 'Refinement'}
                    </label>
               </div>
               <div className="relative group">
                    <textarea
                        value={currentState.textPrompt}
                        onChange={(e) => updateCurrentState({ textPrompt: e.target.value })}
                        placeholder={
                            mode === GenerationMode.TEXT_TO_PROMPT ? "e.g. A futuristic samurai in a neon city..." :
                            mode === GenerationMode.IMG_TO_PROMPT ? "e.g. Focus on the vintage car in the background..." :
                            "Describe the scene, lighting, style..."
                        }
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 outline-none resize-none min-h-[120px] transition-shadow"
                    />
                    <AnimatePresence>
                        {currentState.textPrompt && (
                            <motion.button 
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.8 }}
                                onClick={() => updateCurrentState({ textPrompt: '' })}
                                className="absolute top-3 right-3 p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
                                title="Clear Text"
                            >
                                <X size={14} />
                            </motion.button>
                        )}
                    </AnimatePresence>
               </div>
            </div>

            {/* ADVANCED SETTINGS (Negative Prompt) */}
            <div className="pt-2">
                <button 
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-yellow-500 transition-colors w-full"
                >
                    <Sliders size={14} />
                    <span>Advanced Settings</span>
                    {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                </button>
                
                <AnimatePresence>
                    {showAdvanced && (
                        <motion.div 
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="pt-3 pb-1 space-y-2">
                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Negative Prompt</label>
                                <textarea
                                    value={currentState.negativePrompt}
                                    onChange={(e) => updateCurrentState({ negativePrompt: e.target.value })}
                                    placeholder="e.g. blurry, distorted, bad hands, cartoon, text, watermark..."
                                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 placeholder-zinc-700 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 outline-none resize-none min-h-[80px]"
                                />
                                <p className="text-[10px] text-zinc-600">
                                    Elements to avoid in the generation.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

          </motion.div>
        </section>

        {/* Output Settings (Only for Image Generation Modes) */}
        <AnimatePresence>
            {(mode === GenerationMode.IMAGE_EDIT || mode === GenerationMode.IMAGE_TO_IMAGE) && (
                <motion.section 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-4 overflow-hidden"
                >
                <div className="flex items-center gap-2 text-zinc-100 font-medium">
                    <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs">3</div>
                    Image Settings
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                    <label className="text-xs text-zinc-500 font-medium ml-1">Aspect Ratio</label>
                    <div className="relative">
                        <select 
                        value={currentState.aspectRatio}
                        onChange={(e) => updateCurrentState({ aspectRatio: e.target.value as AspectRatio })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm appearance-none focus:border-yellow-500 outline-none text-zinc-300 transition-colors cursor-pointer hover:bg-zinc-800/50"
                        >
                        {ASPECT_RATIOS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                        </select>
                        <Maximize2 className="absolute right-3 top-3 text-zinc-600 pointer-events-none w-4 h-4" />
                    </div>
                    </div>
                    <div className="space-y-1.5">
                    <label className="text-xs text-zinc-500 font-medium ml-1">Resolution</label>
                    <div className="relative">
                        <select 
                        value={currentState.resolution}
                        onChange={(e) => updateCurrentState({ resolution: e.target.value as Resolution })}
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm appearance-none focus:border-yellow-500 outline-none text-zinc-300 transition-colors cursor-pointer hover:bg-zinc-800/50"
                        >
                        {RESOLUTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                        </select>
                        <Settings className="absolute right-3 top-3 text-zinc-600 pointer-events-none w-4 h-4" />
                    </div>
                    </div>
                </div>
                </motion.section>
            )}
        </AnimatePresence>

      </motion.div>

      {/* Footer Action */}
      <div className="mt-auto p-4 border-t border-zinc-800 bg-zinc-900/30 sticky bottom-0 backdrop-blur-sm space-y-3">
         <AnimatePresence>
            {displayError && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="bg-red-900/20 border border-red-800/50 rounded-lg p-2.5 flex items-start gap-2"
                >
                    <AlertCircle className="text-red-500 shrink-0 w-4 h-4 mt-0.5" />
                    <p className="text-xs text-red-200 leading-snug">{displayError}</p>
                </motion.div>
            )}
         </AnimatePresence>
        
        <Button 
          onClick={handleGenerate} 
          isLoading={isGenerating} 
          className="w-full py-2.5 text-sm font-semibold"
          title={`Generate ${shortcutLabel}`}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          {mode === GenerationMode.IMG_TO_PROMPT || mode === GenerationMode.TEXT_TO_PROMPT ? 'Generate Prompt' : 'Generate Image'}
        </Button>
        
        {/* RETRY BUTTON - Only visible on error */}
        {currentState.hasError && currentState.lastParams && !isGenerating && (
             <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
             >
                <Button 
                    variant="outline"
                    onClick={handleRetry}
                    className="w-full py-2 text-sm border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500"
                >
                    <RotateCw className="w-4 h-4 mr-2" />
                    Retry Generation
                </Button>
             </motion.div>
        )}

        <p className="text-center text-[10px] text-zinc-600">
          {(mode === GenerationMode.IMG_TO_PROMPT || mode === GenerationMode.TEXT_TO_PROMPT) 
            ? 'Uses Gemini 2.5 Flash' 
            : `Uses Nano Banana Pro (Gemini 3 Pro)`
          }
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;