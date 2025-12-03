

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, AlertCircle, User, ImagePlus, Copy, X, 
  ChevronRight, Sliders, RotateCw, Plus, Trash2, CheckSquare, Square, Upload, Zap, ChevronDown
} from 'lucide-react';
import { 
  GenerationMode, 
  ReferenceOperation, 
  ModeState,
  SubjectItem,
  TemplateVersion
} from '../types';
import { MODELS, MAX_SUBJECTS } from '../constants';
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
  queueCount: number;
  handleGenerate: () => void;
  handleRetry: () => void;
  error: string | null;
  width: number;
  isProTheme: boolean;
}

type SectionKey = 'subject' | 'source' | 'reference' | 'prompt' | 'config';

// --- Switcher Components ---

const TopTemplateSwitcher = ({ version, onChange, isProTheme }: { version: TemplateVersion, onChange: (v: TemplateVersion) => void, isProTheme: boolean }) => {
    return (
        <div className="space-y-2">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1">Prompt Template</label>
            <div className="bg-zinc-950/50 rounded-lg p-1 flex relative border border-zinc-800">
                <div 
                    className={`absolute inset-y-1 w-1/2 rounded-md shadow-sm transition-all duration-300 ease-out ${
                         version === 'V2'
                            ? 'left-1/2 ' + (isProTheme ? 'bg-yellow-500' : 'bg-cyan-500')
                            : 'left-0 ' + (isProTheme ? 'bg-yellow-500' : 'bg-cyan-500')
                    }`}
                />
                <button
                    onClick={() => onChange('V1')}
                    className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-colors ${
                        version === 'V1' ? 'text-black' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    Template V1
                </button>
                <button
                    onClick={() => onChange('V2')}
                    className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-colors ${
                        version === 'V2' ? 'text-black' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                >
                    Template V2
                </button>
            </div>
        </div>
    )
}

const CompactButtonSwitcher = ({ version, onChange, isProTheme }: { version: TemplateVersion, onChange: (v: TemplateVersion) => void, isProTheme: boolean }) => {
    return (
        <div 
            className="flex bg-zinc-950/50 rounded p-0.5 border border-zinc-700/50 ml-auto shrink-0 z-20"
            onClick={(e) => e.stopPropagation()} 
        >
             {(['V1', 'V2'] as TemplateVersion[]).map(v => {
                 const isActive = version === v;
                 const activeClass = isProTheme ? 'bg-yellow-500 text-black' : 'bg-cyan-500 text-black';
                 return (
                     <button
                        key={v}
                        onClick={(e) => { e.stopPropagation(); onChange(v); }}
                        className={`px-2 py-0.5 text-[9px] font-bold rounded transition-all ${
                            isActive 
                            ? activeClass 
                            : 'text-zinc-500 hover:text-zinc-300'
                        }`}
                     >
                         {v}
                     </button>
                 );
             })}
        </div>
    );
};


const BackgroundEffects = React.memo(({ isProTheme }: { isProTheme: boolean }) => {
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
        <div key={isProTheme ? 'pro' : 'flash'} className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
             {/* Main Glow Pulse */}
             <motion.div 
                 className={`absolute inset-0 transition-colors duration-700 ${
                     isProTheme ? 'bg-yellow-950/5' : 'bg-cyan-950/5'
                 }`}
                 animate={{
                     boxShadow: isProTheme 
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
                     duration: isProTheme ? 4 : 1.5,
                     repeat: Infinity,
                     ease: "easeInOut"
                 }}
              />

             {particles.map((p) => (
                 <motion.div
                    key={p.id}
                    className="absolute"
                    style={{ left: `${p.x}%`, top: -30 }} // Start slightly above viewport
                    initial={{ 
                        opacity: 0,
                        rotate: 0,
                        top: '-5vh'
                    }}
                    animate={{ 
                        top: ['-5vh', '100vh'], 
                        opacity: isProTheme ? [0, 0.85, 0] : [0, 0.6, 0], 
                        rotate: 360
                    }}
                    transition={{
                        duration: isProTheme ? 25 : 12, 
                        repeat: Infinity,
                        delay: p.delay * 0.5, 
                        ease: "linear"
                    }}
                 >
                     {isProTheme ? (
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
});

const Sidebar: React.FC<SidebarProps> = React.memo(({ 
  mode, 
  currentState, 
  updateCurrentState, 
  queueCount, 
  handleGenerate, 
  handleRetry,
  error,
  width,
  isProTheme
}) => {
  const { addToast } = useToast();
  
  // Collapsible State
  const [collapsedSections, setCollapsedSections] = useState<Record<SectionKey, boolean>>({
    subject: false,
    source: false,
    reference: false,
    prompt: false,
    config: false
  });

  const [showAdvanced, setShowAdvanced] = useState(() => {
     if (typeof window !== 'undefined') {
         return localStorage.getItem(`nanobanana_advanced_${mode}`) === 'true';
     }
     return false;
  });
  
  const [activeTarget, setActiveTarget] = useState<'reference' | 'subject' | 'imageToText' | null>(null);
  const [focusedSubjectId, setFocusedSubjectId] = useState<string | null>(null);
  const [isDragOverSubjectSection, setIsDragOverSubjectSection] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

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

  // Auto-resize Textarea
  useEffect(() => {
    const textarea = textAreaRef.current;
    if (textarea) {
        textarea.style.height = 'auto';
        const scrollHeight = textarea.scrollHeight;
        const newHeight = Math.max(120, Math.min(scrollHeight, 350));
        textarea.style.height = `${newHeight}px`;
        textarea.style.overflowY = scrollHeight > 350 ? 'auto' : 'hidden';
    }
  }, [currentState.textPrompt, mode, collapsedSections.prompt]);
  
  const toggleSection = (key: SectionKey) => {
    setCollapsedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

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
      if (currentState.subjects.length >= MAX_SUBJECTS) {
          addToast(`Maximum ${MAX_SUBJECTS} subjects allowed`, 'warning');
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

  // Section Drag Handlers
  const handleSectionDragOver = (e: React.DragEvent) => {
      if (currentState.subjects.length < MAX_SUBJECTS) {
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

      const currentSubjectCount = currentState.subjects.length;
      if (currentSubjectCount >= MAX_SUBJECTS) {
          addToast(`Maximum ${MAX_SUBJECTS} subjects allowed`, 'warning');
          return;
      }

      // 1. Internal Drag (History/Canvas) - Single Image
      const internalUrl = e.dataTransfer.getData('application/x-nanobanana-image');
      if (internalUrl) {
           const file = dataURLtoFile(internalUrl, `dropped-subject-${Date.now()}.png`);
           if (file && file.type.startsWith('image/')) {
                const newSubject: SubjectItem = {
                    id: Date.now().toString() + Math.random().toString().slice(2, 5),
                    file: file,
                    isActive: true
                };
                updateCurrentState({ subjects: [...currentState.subjects, newSubject] });
                addToast("Subject added", 'success');
           }
           return;
      } 
      
      // 2. External Files - Multi-file support
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
           const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
           
           if (files.length === 0) return;

           const availableSlots = MAX_SUBJECTS - currentSubjectCount;
           const filesToAdd = files.slice(0, availableSlots);
           
           const newSubjects: SubjectItem[] = filesToAdd.map((file, index) => ({
                id: Date.now().toString() + Math.random().toString().slice(2, 5) + index,
                file: file,
                isActive: true
           }));

           if (newSubjects.length > 0) {
                updateCurrentState({ subjects: [...currentState.subjects, ...newSubjects] });
                
                if (files.length > availableSlots) {
                    addToast(`Added ${filesToAdd.length} subjects. Limit reached.`, 'warning');
                } else {
                    addToast(`${filesToAdd.length} subject${filesToAdd.length > 1 ? 's' : ''} added`, 'success');
                }
           }
      }
  };

  // Paste Logic
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
        const target = document.activeElement as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
        if (isInput) return;
  
        const items = e.clipboardData?.items;
        if (!items) return;
  
        let file: File | null = null;
        for (let i = 0; i < items.length; i++) {
          const item = items[i] as DataTransferItem;
          if (item.type.indexOf('image') !== -1) {
            const blob = item.getAsFile();
            if (blob) {
               file = new File([blob], "pasted-image.png", { type: blob.type });
               break;
            }
          }
        }

        if (file) {
             e.preventDefault();

             // Handle Image -> Text Prompt Source Paste
             if (activeTarget === 'imageToText') {
                 const newSub: SubjectItem = { id: '0', file, isActive: true };
                 updateCurrentState({ subjects: [newSub] });
                 addToast("Source image set", 'success');
                 return;
             }

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
             if (currentState.subjects.length < MAX_SUBJECTS && (!activeTarget || activeTarget === 'subject')) {
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
    window.addEventListener('paste', handlePaste as EventListener);
    return () => window.removeEventListener('paste', handlePaste as EventListener);
  }, [activeTarget, focusedSubjectId, currentState, mode]);

  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  const shortcutLabel = isMac ? 'Cmd+Enter' : 'Ctrl+Enter';
  const displayError = error || currentState.errorMessage;
  const isImageMode = mode === GenerationMode.IMAGE_EDIT || mode === GenerationMode.IMAGE_TO_IMAGE;
  const isPro = currentState.selectedModel === MODELS.PRO;
  
  const btnLabelBase = mode === GenerationMode.IMG_TO_PROMPT || mode === GenerationMode.TEXT_TO_PROMPT ? 'Generate Prompt' : 'Generate Image';
  const btnLabel = queueCount > 0 ? `${btnLabelBase} (${queueCount})` : btnLabelBase;
  const btnVariant = 'primary'; 

  const focusRing = isProTheme ? 'focus:ring-yellow-500 focus:border-yellow-500' : 'focus:ring-cyan-500 focus:border-cyan-500';
  const accentText = isProTheme ? 'text-yellow-500' : 'text-cyan-400';
  const accentHover = isProTheme ? 'hover:text-yellow-500 hover:border-yellow-500' : 'hover:text-cyan-400 hover:border-cyan-400';
  const activeSectionClass = isProTheme ? 'bg-yellow-500/5 ring-1 ring-yellow-500/50' : 'bg-cyan-500/5 ring-1 ring-cyan-500/50';

  return (
    <aside 
      style={{ width }}
      className="flex-none flex flex-col border-r border-zinc-800 bg-zinc-900 relative z-30 transition-all duration-300"
      onClick={() => {
          setFocusedSubjectId(null);
          setActiveTarget(null);
      }}
    >
      {/* Background Effects */}
      {isImageMode && <BackgroundEffects isProTheme={isProTheme} />}

      {/* Content */}
      <div className="flex-1 overflow-y-auto relative z-10 custom-scrollbar flex flex-col">
        <div className="p-4 space-y-4 min-h-full">
            
            {/* 0. CONFIGURATION SELECTOR (Model or Template) */}
            {isImageMode ? (
                <div className="space-y-2">
                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider px-1">Model Engine</label>
                    <div className="bg-zinc-950/50 rounded-lg p-1 flex relative border border-zinc-800">
                        <div 
                            className={`absolute inset-y-1 w-1/2 rounded-md shadow-sm transition-all duration-300 ease-out ${
                                isProTheme 
                                    ? 'left-1/2 bg-gradient-to-br from-yellow-500 to-yellow-600 shadow-yellow-900/20' 
                                    : 'left-0 bg-gradient-to-br from-cyan-500 to-blue-500 shadow-cyan-900/20'
                            }`}
                        />
                        <button
                            onClick={() => updateCurrentState({ selectedModel: MODELS.FLASH })}
                            className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-colors ${
                                !isProTheme ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            <Zap size={14} className={!isProTheme ? "fill-white" : ""} />
                            Flash
                        </button>
                        <button
                            onClick={() => updateCurrentState({ selectedModel: MODELS.PRO })}
                            className={`relative z-10 flex-1 flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-md transition-colors ${
                                isProTheme ? 'text-black' : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        >
                            <Sparkles size={14} className={isProTheme ? "fill-black/20" : ""} />
                            Pro
                        </button>
                    </div>
                </div>
            ) : (
                <TopTemplateSwitcher
                    version={mode === GenerationMode.IMG_TO_PROMPT ? currentState.templateVersionImageToText : currentState.templateVersionTextPrompt}
                    onChange={(v) => {
                        if (mode === GenerationMode.IMG_TO_PROMPT) updateCurrentState({ templateVersionImageToText: v });
                        else updateCurrentState({ templateVersionTextPrompt: v });
                    }}
                    isProTheme={isProTheme}
                />
            )}
            
            {/* 1. SUBJECT SECTION */}
            {isImageMode && (
                <CollapsibleSection
                    title="Subject"
                    isOpen={!collapsedSections.subject}
                    onToggle={() => toggleSection('subject')}
                    onHeaderClick={() => {
                        setActiveTarget('subject');
                        setFocusedSubjectId(null);
                    }}
                    isActiveDropTarget={activeTarget === 'subject' || isDragOverSubjectSection}
                    isProTheme={isProTheme}
                    onDrop={handleSectionDrop}
                    onDragOver={handleSectionDragOver}
                    onDragLeave={handleSectionDragLeave}
                    thumbnails={
                        collapsedSections.subject && (
                            <div className="flex items-center gap-1.5 mr-3">
                                {currentState.subjects.length === 0 ? (
                                    <div className="w-5 h-5 rounded bg-zinc-800/50 border border-zinc-800 border-dashed" />
                                ) : (
                                    currentState.subjects.map(s => (
                                        <MiniThumbnail 
                                            key={s.id} 
                                            file={s.file} 
                                            isGrayscale={!s.isActive} 
                                        />
                                    ))
                                )}
                            </div>
                        )
                    }
                >
                    <div className="space-y-3 pt-2">
                        <div className="flex items-center justify-between px-1">
                             <div className="text-xs text-zinc-500">
                                {currentState.subjects.length} / {MAX_SUBJECTS} Subjects
                             </div>
                             <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleAddEmptySubject();
                                }}
                                disabled={currentState.subjects.length >= MAX_SUBJECTS}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium border transition-all ${
                                    currentState.subjects.length >= MAX_SUBJECTS 
                                    ? 'bg-zinc-900 border-zinc-800 text-zinc-600 cursor-not-allowed' 
                                    : `bg-zinc-900 border-zinc-700 text-zinc-300 ${accentHover}`
                                }`}
                            >
                                <Plus size={12} /> Add
                            </button>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 px-1">
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
                                        isProTheme={isProTheme}
                                    />
                                ))}
                            </AnimatePresence>
                        </div>
                        
                        {currentState.subjects.length === 0 && (
                            <div className={`text-center p-4 border-2 border-dashed rounded-xl transition-colors mx-1 ${
                                isDragOverSubjectSection 
                                ? (isProTheme ? 'border-yellow-500 bg-yellow-500/5' : 'border-cyan-500 bg-cyan-500/5') 
                                : 'border-zinc-800 bg-zinc-900/30'
                            }`}>
                                <p className="text-xs text-zinc-500">Drop images here</p>
                            </div>
                        )}
                    </div>
                </CollapsibleSection>
            )}

            {/* 2. SOURCE IMAGE (Img to Prompt) */}
            {mode === GenerationMode.IMG_TO_PROMPT && (
                <CollapsibleSection
                    title="Source Image"
                    isOpen={!collapsedSections.source}
                    onToggle={() => toggleSection('source')}
                    onHeaderClick={() => setActiveTarget('imageToText')}
                    isActiveDropTarget={activeTarget === 'imageToText'}
                    isProTheme={isProTheme}
                    thumbnails={
                        collapsedSections.source && (
                             <MiniThumbnail 
                                file={currentState.subjects[0]?.file || null} 
                                isGrayscale={false} 
                             />
                        )
                    }
                >
                    <div className="pt-2">
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
                            isActive={activeTarget === 'imageToText'}
                            onActivate={() => setActiveTarget('imageToText')}
                            isProTheme={isProTheme}
                        />
                    </div>
                </CollapsibleSection>
            )}

            {/* 3. REFERENCE & OPERATION (Image to Image) */}
            {mode === GenerationMode.IMAGE_TO_IMAGE && (
                <CollapsibleSection
                    title="Reference & Operation"
                    isOpen={!collapsedSections.reference}
                    onToggle={() => toggleSection('reference')}
                    onHeaderClick={() => {
                        setActiveTarget('reference');
                        setFocusedSubjectId(null);
                    }}
                    isActiveDropTarget={activeTarget === 'reference'}
                    isProTheme={isProTheme}
                    thumbnails={
                        collapsedSections.reference && (
                            <MiniThumbnail 
                                file={currentState.referenceImage} 
                                isGrayscale={!currentState.referenceImage} 
                            />
                        )
                    }
                >
                    <div className="space-y-4 pt-2">
                         <FileUpload 
                            label=""
                            helperText="Scene composition or style source"
                            selectedFile={currentState.referenceImage}
                            onFileSelect={handleReferenceSelect}
                            required
                            className="mb-2"
                            isActive={activeTarget === 'reference'}
                            onActivate={() => {
                                setActiveTarget('reference');
                                setFocusedSubjectId(null);
                            }}
                            isProTheme={isProTheme}
                        />
                        
                        {currentState.isRefLowRes && (
                            <div className="flex items-center gap-2 text-yellow-500 text-xs bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                                <AlertCircle size={12} />
                                <span>Low resolution reference</span>
                            </div>
                        )}

                        <div className="space-y-2 p-3 bg-zinc-950/50 rounded-lg border border-zinc-800">
                            <div className="flex justify-between items-center">
                                <label className="text-xs font-medium text-zinc-400">Strength</label>
                                <span className={`text-xs font-bold ${accentText}`}>{currentState.refStrength}%</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" 
                                max="100" 
                                value={currentState.refStrength} 
                                onChange={(e) => updateCurrentState({ refStrength: parseInt(e.target.value) })}
                                className={`w-full h-1.5 bg-zinc-700 rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-0 ${isProTheme ? 'accent-yellow-500' : 'accent-cyan-500'}`}
                            />
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            {[
                                { op: ReferenceOperation.APPLY_CLOTHING, label: 'Apply Clothing', desc: 'Transfer outfit to subject', icon: User },
                                { op: ReferenceOperation.REPLACE_FACE, label: 'Replace Face', desc: 'Swap face in scene', icon: ImagePlus },
                                { op: ReferenceOperation.REPLICATE_REFERENCE, label: 'Replicate Reference', desc: 'Recreate scene structure', icon: Copy },
                            ].map(item => {
                                const isSelected = currentState.refOperation === item.op;
                                const isReplicate = item.op === ReferenceOperation.REPLICATE_REFERENCE;

                                return (
                                <button
                                    key={item.op}
                                    onClick={(e) => { e.stopPropagation(); updateCurrentState({ refOperation: item.op }); }}
                                    className={`flex items-center gap-3 p-2.5 rounded-lg border text-left transition-colors relative group ${
                                        isSelected
                                        ? (isProTheme ? 'bg-yellow-500/10 border-yellow-500/50 text-yellow-100' : 'bg-cyan-500/10 border-cyan-500/50 text-cyan-100')
                                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                    }`}
                                >
                                    <item.icon size={16} className="shrink-0" />
                                    <div className="flex-1 min-w-0">
                                        <span className="block text-xs font-bold">{item.label}</span>
                                        <span className="block text-[10px] opacity-70 truncate">{item.desc}</span>
                                    </div>
                                    
                                    {isReplicate && isSelected && (
                                        <CompactButtonSwitcher 
                                            version={currentState.templateVersionReplicateReference}
                                            onChange={(v) => updateCurrentState({ templateVersionReplicateReference: v })}
                                            isProTheme={isProTheme}
                                        />
                                    )}
                                </button>
                                )
                            })}
                        </div>
                    </div>
                </CollapsibleSection>
            )}

            {/* 4. PROMPT INSTRUCTIONS (Always Visible) */}
            <CollapsibleSection
                title="Prompt Instructions"
                isOpen={!collapsedSections.prompt}
                onToggle={() => toggleSection('prompt')}
                isProTheme={isProTheme}
                hasContentDot={!!currentState.textPrompt.trim()}
            >
                <div className="space-y-4 pt-2">
                    {(mode === GenerationMode.IMG_TO_PROMPT || mode === GenerationMode.TEXT_TO_PROMPT) && (
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-2.5 bg-zinc-950/50 rounded-lg border border-zinc-800">
                                <span className="text-xs font-medium text-zinc-300">Use Face Feature</span>
                                <button 
                                    onClick={() => updateCurrentState({ useFaceFeature: !currentState.useFaceFeature })}
                                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${currentState.useFaceFeature ? (isProTheme ? 'bg-yellow-500' : 'bg-cyan-500') : 'bg-zinc-700'}`}
                                >
                                    <motion.span 
                                    className="absolute top-1 left-1 bg-white w-3 h-3 rounded-full shadow-sm"
                                    initial={false}
                                    animate={{ x: currentState.useFaceFeature ? 16 : 0 }}
                                    />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="relative group">
                        <textarea
                            ref={textAreaRef}
                            value={currentState.textPrompt}
                            onChange={(e) => updateCurrentState({ textPrompt: e.target.value })}
                            placeholder={
                                mode === GenerationMode.TEXT_TO_PROMPT ? "e.g. A futuristic samurai..." :
                                mode === GenerationMode.IMG_TO_PROMPT ? "Context (Optional)..." :
                                "Describe the scene..."
                            }
                            className={`w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:ring-1 outline-none resize-none transition-shadow ${focusRing}`}
                            style={{ minHeight: '120px' }}
                        />
                        {currentState.textPrompt && (
                            <button 
                                onClick={() => updateCurrentState({ textPrompt: '' })}
                                className="absolute top-2 right-2 p-1 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded transition-colors"
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>

                    <div>
                        <button 
                            onClick={() => setShowAdvanced(!showAdvanced)}
                            className={`flex items-center gap-2 text-xs font-medium text-zinc-500 transition-colors ${isProTheme ? 'hover:text-yellow-500' : 'hover:text-cyan-400'}`}
                        >
                            <Sliders size={12} />
                            <span>Advanced Settings</span>
                            {showAdvanced ? <ChevronDown size={12} className="rotate-180" /> : <ChevronDown size={12} />}
                        </button>
                        
                        <AnimatePresence>
                            {showAdvanced && (
                                <motion.div 
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                >
                                    <div className="pt-3 space-y-1">
                                        <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Negative Prompt</label>
                                        <textarea
                                            value={currentState.negativePrompt}
                                            onChange={(e) => updateCurrentState({ negativePrompt: e.target.value })}
                                            placeholder="blurry, distorted, bad hands..."
                                            className={`w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-300 placeholder-zinc-700 focus:ring-1 outline-none resize-none min-h-[60px] ${focusRing}`}
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </CollapsibleSection>

            {/* 5. CONFIGURATION (Image Modes) */}
            {isImageMode && (
                <CollapsibleSection
                    title="Configuration"
                    isOpen={!collapsedSections.config}
                    onToggle={() => toggleSection('config')}
                    isProTheme={isProTheme}
                    summary={collapsedSections.config ? `${currentState.aspectRatio}` : undefined}
                >
                    <div className="space-y-4 pt-2">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Aspect Ratio</label>
                                <AspectRatioSelector 
                                    value={currentState.aspectRatio}
                                    onChange={(val) => updateCurrentState({ aspectRatio: val })}
                                    isPro={isProTheme}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Resolution</label>
                                <ResolutionSelector 
                                    value={currentState.resolution}
                                    onChange={(val) => updateCurrentState({ resolution: val })}
                                    disabled={!isPro} 
                                    isPro={isProTheme}
                                />
                            </div>
                        </div>
                    </div>
                </CollapsibleSection>
            )}

        </div>
      </div>

      {/* Footer */}
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
          key={`${mode}-${btnVariant}-${isProTheme}`} 
          onClick={handleGenerate} 
          variant={btnVariant}
          isProTheme={isProTheme}
          className="w-full py-2.5 text-sm font-semibold relative overflow-hidden"
          title={`Generate ${shortcutLabel}`}
        >
          {queueCount > 0 && (
             <motion.div 
                className="absolute inset-0 bg-white/10"
                initial={{ x: '-100%' }}
                animate={{ x: '100%' }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
             />
          )}
          <div className="relative flex items-center justify-center gap-2">
            {isImageMode && !isPro ? <Zap className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            <span>{btnLabel}</span>
          </div>
        </Button>
        
        {currentState.hasError && currentState.lastParams && queueCount === 0 && (
             <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2"
             >
                <Button 
                    variant="outline"
                    isProTheme={isProTheme}
                    onClick={handleRetry}
                    className="w-full py-2 text-sm border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500"
                >
                    <RotateCw className="w-4 h-4 mr-2" />
                    Retry Generation
                </Button>
             </motion.div>
        )}

        <p className={`text-center text-[10px] mt-2 transition-colors ${isProTheme ? 'text-zinc-600' : 'text-cyan-600/70'}`}>
          {isImageMode 
              ? `Uses: ${isPro ? 'NanoBanana Pro' : 'NanoBanana Flash'} (${currentState.selectedModel})`
              : 'Uses Gemini 2.5 Flash'
          }
        </p>
      </div>
    </aside>
  );
});

// --- Sub-Components ---

const CollapsibleSection: React.FC<{
    title: string;
    isOpen: boolean;
    onToggle: () => void;
    children: React.ReactNode;
    onHeaderClick?: () => void;
    thumbnails?: React.ReactNode;
    isActiveDropTarget?: boolean;
    isProTheme: boolean;
    onDrop?: (e: React.DragEvent) => void;
    onDragOver?: (e: React.DragEvent) => void;
    onDragLeave?: (e: React.DragEvent) => void;
    hasContentDot?: boolean;
    summary?: string;
}> = ({ 
    title, isOpen, onToggle, children, onHeaderClick, thumbnails, 
    isActiveDropTarget, isProTheme, onDrop, onDragOver, onDragLeave, hasContentDot, summary 
}) => {
    
    const activeClass = isProTheme ? 'bg-yellow-500/5 ring-1 ring-yellow-500/50' : 'bg-cyan-500/5 ring-1 ring-cyan-500/50';
    const dotColor = isProTheme ? 'bg-yellow-500' : 'bg-cyan-500';

    const [isOverflowVisible, setIsOverflowVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Delay allowing overflow to ensure animation has mostly finished
            // This prevents "popping" of content width during expansion
            const timer = setTimeout(() => setIsOverflowVisible(true), 300);
            return () => clearTimeout(timer);
        } else {
            setIsOverflowVisible(false);
        }
    }, [isOpen]);

    return (
        <motion.div
            layout
            className={`rounded-xl border transition-all duration-200 ${
                isActiveDropTarget 
                ? `${activeClass} border-transparent` 
                : 'bg-zinc-900/40 border-zinc-800 hover:border-zinc-700'
            }`}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
        >
            <div 
                className="flex items-center justify-between p-3 cursor-pointer select-none group"
                onClick={(e) => {
                    e.stopPropagation();
                    onToggle();
                    if(onHeaderClick) onHeaderClick();
                }}
            >
                <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs font-semibold uppercase tracking-wide transition-colors ${
                        isActiveDropTarget 
                        ? (isProTheme ? 'text-yellow-500' : 'text-cyan-400') 
                        : 'text-zinc-400 group-hover:text-zinc-200'
                    }`}>
                        {title}
                    </span>
                    {hasContentDot && !isOpen && (
                         <div className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
                    )}
                </div>
                
                <div className="flex items-center gap-3">
                    {summary && !isOpen && (
                        <span className="text-[10px] text-zinc-600 font-medium">{summary}</span>
                    )}
                    {thumbnails}
                    <ChevronRight 
                        size={14} 
                        className={`text-zinc-600 transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`} 
                    />
                </div>
            </div>
            
            <AnimatePresence initial={false}>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        style={{ overflow: isOverflowVisible ? 'visible' : 'hidden' }}
                        onAnimationComplete={(definition) => {
                             if (definition === "visible" || (typeof definition === 'object' && definition.height === 'auto')) {
                                setIsOverflowVisible(true);
                             }
                        }}
                    >
                        <div className="px-3 pb-3 pt-0">
                            {children}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

const MiniThumbnail: React.FC<{ file: File | null, isGrayscale: boolean }> = ({ file, isGrayscale }) => {
    const [src, setSrc] = useState<string | null>(null);
    useEffect(() => {
        if(!file) { setSrc(null); return; }
        const url = URL.createObjectURL(file);
        setSrc(url);
        return () => URL.revokeObjectURL(url);
    }, [file]);

    if (!src) return <div className="w-5 h-5 rounded bg-zinc-800 border border-zinc-700 border-dashed" />;

    return (
        <img 
            src={src} 
            alt="thumb" 
            className={`w-5 h-5 rounded object-cover border border-zinc-700 bg-black ${isGrayscale ? 'grayscale opacity-50' : ''}`} 
        />
    );
};

interface SubjectCardProps {
    subject: SubjectItem;
    isFocused: boolean;
    onUpdateFile: (file: File) => void;
    onToggle: () => void;
    onDelete: () => void;
    onFocus: () => void;
    isProTheme: boolean;
}

const SubjectCard: React.FC<SubjectCardProps> = ({ subject, isFocused, onUpdateFile, onToggle, onDelete, onFocus, isProTheme }) => {
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

    const ringClass = isProTheme ? 'ring-yellow-500/50 border-yellow-500' : 'ring-cyan-500/50 border-cyan-500';
    const activeBtnClass = isProTheme ? 'bg-yellow-500 text-black' : 'bg-cyan-500 text-black';

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
                ${isFocused ? `ring-2 ${ringClass}` : 'border-zinc-800 hover:border-zinc-700'}
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
                        ? `${activeBtnClass} shadow-sm` 
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
