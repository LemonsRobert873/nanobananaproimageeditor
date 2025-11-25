

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, AlertCircle, User, ImagePlus, Copy, X, 
  ChevronDown, ChevronUp, Sliders, RotateCw, Plus, Trash2, CheckSquare, Square, Upload, Zap
} from 'lucide-react';
import { 
  GenerationMode, 
  ReferenceOperation, 
  ModeState,
  SubjectItem
} from '../types';
import { MODELS } from '../constants';
import Button from './Button';
import FileUpload from './FileUpload';
import AspectRatioSelector from './AspectRatioSelector';
import ResolutionSelector from './ResolutionSelector';
import { useToast } from '../context/ToastContext';
import { dataURLtoFile } from '../utils/imageUtils';

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
  const { addToast } = useToast();
  const [showAdvanced, setShowAdvanced] = useState(() => {
     if (typeof window !== 'undefined') {
         return localStorage.getItem(`nanobanana_advanced_${mode}`) === 'true';
     }
     return false;
  });
  
  const [activeTarget, setActiveTarget] = useState<'reference' | 'subject' | null>(null);
  const [focusedSubjectId, setFocusedSubjectId] = useState<string | null>(null);
  const [isDragOverSubjectSection, setIsDragOverSubjectSection] = useState(false);

  useEffect(() => {
      const saved = localStorage.getItem(`nanobanana_advanced_${mode}`) === 'true';
      setShowAdvanced(saved);
      setFocusedSubjectId(null);
      setActiveTarget(null);
      setIsDragOverSubjectSection(false);
  }, [mode]);

  useEffect(() => {
      localStorage.setItem(`nanobanana_advanced_${mode}`, showAdvanced.toString());
  }, [showAdvanced, mode]);
  
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

  const handleAddEmptySubject = () => {
      if (currentState.subjects.length >= 5) {
          addToast("Maximum 5 subjects allowed", 'warning');
          return;
      }
      const newSubject: SubjectItem = {
          id: Date.now().toString() + Math.random().toString().slice(2, 5),
          file: null, 
          isActive: true
      };
      updateCurrentState({ subjects: [...currentState.subjects, newSubject] });
  };

  const handleUpdateSubjectFile = (id: string, file: File) => {
      updateCurrentState({ 
          subjects: currentState.subjects.map(s => 
              s.id === id ? { ...s, file, isActive: true } : s
          ) 
      });
  };

  const handleRemoveSubject = (id: string) => {
      updateCurrentState({ subjects: currentState.subjects.filter(s => s.id !== id) });
      if (focusedSubjectId === id) setFocusedSubjectId(null);
  };

  const handleToggleSubject = (id: string) => {
      updateCurrentState({ 
          subjects: currentState.subjects.map(s => 
              s.id === id ? { ...s, isActive: !s.isActive } : s
          ) 
      });
  };

  const handleSectionDragOver = (e: React.DragEvent) => {
      if (currentState.subjects.length < 5) {
          e.preventDefault();
          e.stopPropagation();
          setIsDragOverSubjectSection(true);
          e.dataTransfer.dropEffect = 'copy';
      } else {
          setIsDragOverSubjectSection(false);
      }
  };

  const handleSectionDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOverSubjectSection(false);
  };

  const handleSectionDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOverSubjectSection(false);

      if (currentState.subjects.length >= 5) {
          addToast("Maximum 5 subjects allowed", 'warning');
          return;
      }

      let file: File | null = null;
      const internalUrl = e.dataTransfer.getData('application/x-nanobanana-image');
      if (internalUrl) {
           file = dataURLtoFile(internalUrl, `dropped-subject-${Date.now()}.png`);
      } else if (e.dataTransfer.files && e.dataTransfer.files[0]) {
           file = e.dataTransfer.files[0];
      }

      if (file && file.type.startsWith('image/')) {
          const newSubject: SubjectItem = {
              id: Date.now().toString() + Math.random().toString().slice(2, 5),
              file: file,
              isActive: true
          };
          updateCurrentState({ subjects: [...currentState.subjects, newSubject] });
          addToast("Subject added", 'success');
      }
  };

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
        const target = document.activeElement as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (isInput) return;
  
        const items = e.clipboardData?.items;
        if (!items) return;
  
        let file: File | null = null;
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.indexOf('image') !== -1) {
            const blob = items[i].getAsFile();
            if (blob) {
               file = new File([blob], "pasted-image.png", { type: blob.type });
               break;
            }
          }
        }

        if (file) {
             e.preventDefault();
             if (focusedSubjectId) {
                 const subjectExists = currentState.subjects.find(s => s.id === focusedSubjectId);
                 if (subjectExists) {
                     handleUpdateSubjectFile(focusedSubjectId, file);
                     return;
                 }
             }
             if (activeTarget === 'reference') {
                 handleReferenceSelect(file);
                 return;
             }
             if (currentState.subjects.length < 5 && (!activeTarget || activeTarget === 'subject')) {
                  const newSubject: SubjectItem = {
                      id: Date.now().toString() + Math.random().toString().slice(2, 5),
                      file: file,
                      isActive: true
                  };
                  updateCurrentState({ subjects: [...currentState.subjects, newSubject] });
                  addToast("Subject added from clipboard", 'success');
                  return;
             }
        }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [activeTarget, focusedSubjectId, currentState]);

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const shortcutLabel = isMac ? 'Cmd+Enter' : 'Ctrl+Enter';
  const displayError = error || currentState.errorMessage;
  const isImageMode = mode === GenerationMode.IMAGE_EDIT || mode === GenerationMode.IMAGE_TO_IMAGE;
  const isPro = currentState.selectedModel === MODELS.PRO;
  
  return (
    <aside 
      style={{ width }}
      className="flex-none flex flex-col border-r border-zinc-800 bg-zinc-950 relative z-30 transition-all duration-300"
      onClick={() => {
          setFocusedSubjectId(null);
          setActiveTarget(null);
      }}
    >
      {/* ==========================================
          VISUAL EFFECTS LAYER
         ========================================== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          {/* Main Glow Pulse (Full Area) */}
          <motion.div 
             className={`absolute inset-0 transition-colors duration-700 ${
                 isPro ? 'bg-yellow-950/5' : 'bg-cyan-950/5'
             }`}
             animate={{
                 boxShadow: isPro 
                    ? [
                        'inset 0 0 30px -5px rgba(234,179,8,0.1)', 
                        'inset 0 0 60px -5px rgba(234,179,8,0.25)', 
                        'inset 0 0 30px -5px rgba(234,179,8,0.1)'
                      ]
                    : [
                        'inset 0 0 40px -5px rgba(6,182,212,0.15)', 
                        'inset 0 0 80px -5px rgba(6,182,212,0.25)', 
                        'inset 0 0 40px -5px rgba(6,182,212,0.15)'
                      ]
             }}
             transition={{
                 duration: isPro ? 4 : 1.5, // Flash is faster
                 repeat: Infinity,
                 ease: "easeInOut"
             }}
          />

          {/* Right Border Accent (Extends to right side as requested) */}
          <motion.div
            className="absolute inset-y-0 right-0 w-[1px]"
            animate={{
                boxShadow: isPro 
                    ? ['-2px 0 10px 1px rgba(234,179,8,0.3)', '-4px 0 20px 2px rgba(234,179,8,0.6)', '-2px 0 10px 1px rgba(234,179,8,0.3)']
                    : ['-2px 0 15px 1px rgba(6,182,212,0.2)', '-4px 0 30px 2px rgba(6,182,212,0.4)', '-2px 0 15px 1px rgba(6,182,212,0.2)']
            }}
            transition={{
                duration: isPro ? 3 : 1,
                repeat: Infinity,
                ease: "easeInOut"
            }}
          />
          
          {/* Falling Particles */}
          <BackgroundEffects isPro={isPro} />
      </div>

      {/* ==========================================
          SCROLLABLE CONTENT LAYER
         ========================================== */}
      <div className="flex-1 overflow-y-auto relative z-10 custom-scrollbar flex flex-col">
        <div className="p-6 space-y-8 min-h-full">
            <AnimatePresence mode="popLayout">
                {isImageMode && (
                    <motion.section 
                        key="subject-input"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                        className={`space-y-4 overflow-hidden rounded-xl p-2 -m-2 transition-colors ${isDragOverSubjectSection ? 'bg-yellow-500/10 ring-2 ring-yellow-500/30' : ''}`}
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveTarget('subject');
                        }}
                        onDragOver={handleSectionDragOver}
                        onDragLeave={handleSectionDragLeave}
                        onDrop={handleSectionDrop}
                    >
                        <div className="flex items-center justify-between px-1">
                            <div className="flex items-center gap-2 text-zinc-100 font-medium">
                                <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs">1</div>
                                <div className="flex items-center">
                                    Subject
                                    <span className="text-zinc-500 text-xs ml-1 font-normal">(Subject Face)</span>
                                </div>
                            </div>
                            
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddEmptySubject();
                                }}
                                disabled={currentState.subjects.length >= 5}
                                className={`p-1.5 rounded-lg border transition-all ${
                                    currentState.subjects.length >= 5 
                                    ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed' 
                                    : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-yellow-500 hover:border-yellow-500'
                                }`}
                                title={currentState.subjects.length >= 5 ? "Max 5 subjects" : "Add Subject"}
                            >
                                <Plus size={16} />
                            </button>
                        </div>

                        {mode === GenerationMode.IMAGE_EDIT && (
                            <motion.div 
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-2 px-1"
                            >
                                {currentState.subjects.filter(s => s.isActive && s.file !== null).length > 0 ? (
                                    <div className="flex items-center gap-2 text-xs text-green-400 bg-green-950/20 px-3 py-2 rounded-lg border border-green-900/50">
                                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0 shadow-[0_0_5px_rgba(34,197,94,0.5)]"></span>
                                        <span className="font-medium">
                                            {currentState.subjects.filter(s => s.isActive && s.file !== null).length} Subject(s) Active
                                        </span>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-950/20 px-3 py-2 rounded-lg border border-blue-900/50">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0 shadow-[0_0_5px_rgba(59,130,246,0.5)]"></span>
                                        <span className="font-medium">Prompt-only generation mode</span>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 px-1">
                            <AnimatePresence>
                                {currentState.subjects.map((subject) => (
                                    <SubjectCard 
                                        key={subject.id}
                                        subject={subject}
                                        isFocused={focusedSubjectId === subject.id}
                                        onUpdateFile={(file) => handleUpdateSubjectFile(subject.id, file)}
                                        onToggle={() => handleToggleSubject(subject.id)}
                                        onDelete={() => handleRemoveSubject(subject.id)}
                                        onFocus={() => setFocusedSubjectId(subject.id)}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>

                        {currentState.subjects.length === 0 && (
                            <div className={`text-center p-6 border-2 border-dashed rounded-xl transition-colors mx-1 ${isDragOverSubjectSection ? 'border-yellow-500 bg-yellow-500/5' : 'border-zinc-800 bg-zinc-900/30'}`}>
                                <p className="text-sm text-zinc-500">{isDragOverSubjectSection ? 'Drop to add subject' : 'Click + or drop image here'}</p>
                            </div>
                        )}
                        
                        {currentState.subjects.length > 0 && currentState.subjects.length < 5 && isDragOverSubjectSection && (
                            <div className="absolute inset-0 bg-yellow-500/5 pointer-events-none rounded-xl border-2 border-yellow-500/30 z-10 flex items-center justify-center">
                                <div className="bg-zinc-900/90 text-yellow-500 px-3 py-1.5 rounded-lg shadow-lg text-xs font-bold flex items-center gap-2">
                                    <Plus size={14} /> Add New Subject
                                </div>
                            </div>
                        )}

                    </motion.section>
                )}
                
                {mode === GenerationMode.IMG_TO_PROMPT && (
                    <motion.section 
                        key="single-subject"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-2"
                    >
                        <div className="flex items-center gap-2 text-zinc-100 font-medium">
                            <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs">1</div>
                            Source Image
                        </div>
                        <FileUpload 
                            label=""
                            helperText="Image to analyze"
                            selectedFile={currentState.subjects[0]?.file || null}
                            onFileSelect={(file) => {
                                const newSub = { id: '0', file, isActive: true };
                                updateCurrentState({ subjects: [newSub] });
                            }}
                            required
                            className="mb-2"
                            isActive={activeTarget === 'subject'}
                            onActivate={() => setActiveTarget('subject')}
                        />
                    </motion.section>
                )}
            </AnimatePresence>

            <section className="space-y-4">
            <div className="flex items-center gap-2 text-zinc-100 font-medium">
                <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs">
                    {isImageMode || mode === GenerationMode.IMG_TO_PROMPT ? '2' : '1'}
                </div>
                {mode === GenerationMode.IMAGE_EDIT ? 'Prompt Instructions' : 
                mode === GenerationMode.IMAGE_TO_IMAGE ? 'Reference & Operation' : 
                'Configuration'}
            </div>

            <motion.div 
                layout
                className={`bg-zinc-900/40 rounded-xl p-4 border transition-colors duration-500 space-y-4 ${
                    isPro ? 'border-yellow-500/20' : 'border-cyan-500/20'
                }`}
            >
                
                {isImageMode && (
                    <div className="bg-zinc-950/50 rounded-lg p-1 flex relative mb-4">
                        <div 
                            className={`absolute inset-y-1 w-1/2 rounded-md shadow-sm transition-all duration-300 ease-out ${
                                isPro 
                                    ? 'left-1/2 bg-gradient-to-br from-yellow-500 to-yellow-600 shadow-yellow-900/20' 
                                    : 'left-0 bg-gradient-to-br from-cyan-500 to-blue-500 shadow-cyan-900/20'
                            }`}
                        />
                        <button
                            onClick={() => updateCurrentState({ selectedModel: MODELS.FLASH })}
                            className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                !isPro ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            <Zap size={14} className={!isPro ? "fill-white" : ""} />
                            Flash
                        </button>
                        <button
                            onClick={() => updateCurrentState({ selectedModel: MODELS.PRO })}
                            className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-1.5 text-xs font-medium rounded-md transition-colors ${
                                isPro ? 'text-black' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            <Sparkles size={14} className={isPro ? "fill-black/20" : ""} />
                            Pro
                        </button>
                    </div>
                )}

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

                <AnimatePresence>
                    {mode === GenerationMode.IMAGE_TO_IMAGE && (
                    <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 overflow-hidden"
                        onClick={(e) => {
                            e.stopPropagation();
                            setActiveTarget('reference');
                            setFocusedSubjectId(null);
                        }}
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
                            onActivate={() => {
                                setActiveTarget('reference');
                                setFocusedSubjectId(null);
                            }}
                        />
                        {currentState.isRefLowRes && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-yellow-500 text-xs bg-yellow-500/10 p-2 rounded border border-yellow-500/20 mb-2">
                            <AlertCircle size={12} />
                            <span>Low resolution reference. Results may vary.</span>
                            </motion.div>
                        )}
                        </div>

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
                            {[
                                { op: ReferenceOperation.APPLY_CLOTHING, label: 'Apply Clothing', desc: 'Put subject(s) in reference outfit', icon: User },
                                { op: ReferenceOperation.REPLACE_FACE, label: 'Replace Face', desc: 'Swap face in reference scene', icon: ImagePlus },
                                { op: ReferenceOperation.REPLICATE_REFERENCE, label: 'Replicate Reference Image', desc: 'Recreate full scene with subject(s)', icon: Copy },
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
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

            </motion.div>
            </section>

            <AnimatePresence>
                {isImageMode && (
                    <motion.section 
                        initial={{ opacity: 0, height: 0, overflow: 'hidden' }}
                        animate={{ opacity: 1, height: 'auto', transitionEnd: { overflow: 'visible' } }}
                        exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                        className="space-y-4"
                    >
                    <div className="flex items-center gap-2 text-zinc-100 font-medium">
                        <div className="w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center text-xs">
                            3
                        </div>
                        Image Settings
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                        <label className="text-xs text-zinc-500 font-medium ml-1">Aspect Ratio</label>
                        <AspectRatioSelector 
                            value={currentState.aspectRatio}
                            onChange={(val) => updateCurrentState({ aspectRatio: val })}
                        />
                        </div>
                        <div className="space-y-1.5">
                        <label className="text-xs text-zinc-500 font-medium ml-1">Resolution</label>
                        <ResolutionSelector 
                            value={currentState.resolution}
                            onChange={(val) => updateCurrentState({ resolution: val })}
                            disabled={!isPro}
                        />
                        </div>
                    </div>
                    </motion.section>
                )}
            </AnimatePresence>
        </div>
      </div>

      {/* ==========================================
          FOOTER LAYER
         ========================================== */}
      <div className="flex-none p-4 border-t border-zinc-800 bg-zinc-950/80 backdrop-blur-md z-20">
         <AnimatePresence>
            {displayError && (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="bg-red-900/20 border border-red-800/50 rounded-lg p-2.5 flex items-start gap-2 mb-2"
                >
                    <AlertCircle className="text-red-500 shrink-0 w-4 h-4 mt-0.5" />
                    <p className="text-xs text-red-200 leading-snug">{displayError}</p>
                </motion.div>
            )}
         </AnimatePresence>
        
        <Button 
          onClick={handleGenerate} 
          isLoading={isGenerating} 
          className="w-full py-2.5 text-sm font-semibold relative overflow-hidden"
          title={`Generate ${shortcutLabel}`}
        >
          <motion.div 
             className="absolute inset-0 bg-white/20"
             initial={{ x: '-100%' }}
             animate={{ x: isGenerating ? '100%' : '-100%' }}
             transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
          />
          <div className="relative flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4" />
            <span>{mode === GenerationMode.IMG_TO_PROMPT || mode === GenerationMode.TEXT_TO_PROMPT ? 'Generate Prompt' : 'Generate Image'}</span>
          </div>
        </Button>
        
        {currentState.hasError && currentState.lastParams && !isGenerating && (
             <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2"
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

        <p className={`text-center text-[10px] mt-2 transition-colors ${isPro ? 'text-zinc-600' : 'text-cyan-600/70'}`}>
          {isImageMode 
              ? `Uses: ${isPro ? 'NanoBanana Pro' : 'NanoBanana Flash'} (${currentState.selectedModel})`
              : 'Uses Gemini 2.5 Flash'
          }
        </p>
      </div>
    </aside>
  );
};

const BackgroundEffects = ({ isPro }: { isPro: boolean }) => {
    // Static set of particles
    const particles = [
        { id: 1, x: 20, delay: 0, size: 12 },
        { id: 2, x: 50, delay: 5, size: 16 },
        { id: 3, x: 80, delay: 2, size: 10 },
        { id: 4, x: 10, delay: 8, size: 14 },
        { id: 5, x: 70, delay: 12, size: 11 },
        { id: 6, x: 40, delay: 15, size: 13 },
        { id: 7, x: 90, delay: 18, size: 15 },
        { id: 8, x: 30, delay: 20, size: 12 },
    ];
    
    // Add key to force re-mount on prop change
    return (
        <div key={isPro ? 'pro' : 'flash'} className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
             {particles.map((p) => (
                 <motion.div
                    key={p.id}
                    className="absolute"
                    style={{ left: `${p.x}%`, top: -30 }} // Start slightly above viewport
                    initial={{ 
                        opacity: 0,
                        rotate: 0,
                        top: '-5vh' // Start slightly closer for immediate effect
                    }}
                    animate={{ 
                        top: ['-5vh', '100vh'], // Fall full viewport height
                        opacity: isPro ? [0, 0.4, 0] : [0, 0.6, 0], 
                        rotate: 360
                    }}
                    transition={{
                        duration: isPro ? 25 : 12, // Flash falls faster 
                        repeat: Infinity,
                        // Randomize delays slightly less to ensure some start immediately
                        delay: p.delay * 0.5, 
                        ease: "linear"
                    }}
                 >
                     {isPro ? (
                         <Sparkles 
                            size={p.size} 
                            className="text-yellow-500/30 fill-yellow-500/10" 
                         />
                     ) : (
                         <Zap 
                            size={p.size} 
                            className="text-cyan-400/50 fill-cyan-400/20" 
                         />
                     )}
                 </motion.div>
             ))}
        </div>
    );
};

interface SubjectCardProps {
    subject: SubjectItem;
    isFocused: boolean;
    onUpdateFile: (file: File) => void;
    onToggle: () => void;
    onDelete: () => void;
    onFocus: () => void;
}

const SubjectCard: React.FC<SubjectCardProps> = ({ subject, isFocused, onUpdateFile, onToggle, onDelete, onFocus }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    useEffect(() => {
        if (subject.file) {
            const url = URL.createObjectURL(subject.file);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        } else {
            setPreviewUrl(null);
        }
    }, [subject.file]);

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation(); 
        onFocus();
        
        let file: File | null = null;
        const internalUrl = e.dataTransfer.getData('application/x-nanobanana-image');
        if (internalUrl) {
             file = dataURLtoFile(internalUrl, `dropped-on-card-${Date.now()}.png`);
        } else if (e.dataTransfer.files && e.dataTransfer.files[0]) {
             file = e.dataTransfer.files[0];
        }

        if (file && file.type.startsWith('image/')) {
            onUpdateFile(file);
        }
    };

    return (
        <motion.div
            layout
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => {
                e.stopPropagation();
                onFocus();
                if (!subject.file) inputRef.current?.click();
            }}
            onDragOver={(e) => { e.preventDefault(); onFocus(); }}
            onDrop={handleDrop}
            className={`
                aspect-square relative rounded-xl border-2 overflow-hidden group cursor-pointer transition-all
                ${isFocused ? 'ring-2 ring-yellow-500/50 border-yellow-500' : 'border-zinc-800 hover:border-zinc-700'}
                ${!subject.file ? 'bg-zinc-900 border-dashed' : 'bg-black'}
                ${subject.file && !subject.isActive ? 'opacity-50 grayscale' : ''}
            `}
        >
            <input 
                ref={inputRef}
                type="file" 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => {
                    if (e.target.files?.[0]) {
                        onUpdateFile(e.target.files[0]);
                    }
                }}
            />

            {previewUrl ? (
                <img 
                    src={previewUrl} 
                    alt="Subject" 
                    className="w-full h-full object-cover pointer-events-none" 
                />
            ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-600 gap-2 p-2 text-center">
                    <Upload size={20} />
                    <span className="text-[10px] font-medium leading-tight">Drop or Click</span>
                </div>
            )}

            <div className="absolute top-0 left-0 p-1.5 z-10">
                 <button
                    onClick={(e) => {
                        e.stopPropagation();
                        if (subject.file) onToggle();
                    }}
                    disabled={!subject.file}
                    className={`p-1 rounded-md transition-colors ${
                        subject.isActive && subject.file 
                        ? 'bg-yellow-500 text-black shadow-sm' 
                        : 'bg-black/40 text-white/50 hover:bg-black/60 hover:text-white backdrop-blur-sm'
                    }`}
                 >
                     {subject.isActive && subject.file ? <CheckSquare size={14} /> : <Square size={14} />}
                 </button>
            </div>

            <div className="absolute top-0 right-0 p-1.5 z-10">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="p-1 rounded-md bg-black/40 text-white/50 hover:bg-red-500 hover:text-white backdrop-blur-sm transition-colors"
                >
                    <Trash2 size={14} />
                </button>
            </div>

            {subject.file && (
                <div 
                   onClick={(e) => {
                       e.stopPropagation();
                       inputRef.current?.click();
                       onFocus();
                   }}
                   className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                    <span className="text-white text-xs font-medium flex items-center gap-1">
                        <ImagePlus size={14} /> Replace
                    </span>
                </div>
            )}
        </motion.div>
    );
};

export default Sidebar;