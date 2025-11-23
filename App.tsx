import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, Sparkles, AlertCircle, Download, 
  Layers, Type, Key, ImagePlus, User, Maximize2, Copy, X, 
  FileText, Wand2, MessageSquare, BookOpen
} from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import Button from './components/Button';
import FileUpload from './components/FileUpload';
import KeySettings from './components/KeySettings';
import GuideModal from './components/GuideModal';
import { 
  GenerationMode, 
  ReferenceOperation, 
  AspectRatio, 
  Resolution, 
  GeneratedImage,
  GeneratedText,
  HistoryItem,
  GenerateParams,
  PromptGenParams,
  ModeState
} from './types';
import { ASPECT_RATIOS, RESOLUTIONS, ERRORS } from './constants';
import { generateImage, generatePrompt } from './services/geminiService';

// Default state template for a mode
const DEFAULT_MODE_STATE: ModeState = {
  subjectImage: null,
  textPrompt: '',
  referenceImage: null,
  generatedImage: null,
  generatedText: null,
  comparisonImage: null,
  useFaceFeature: true,
  refOperation: ReferenceOperation.APPLY_CLOTHING,
  aspectRatio: AspectRatio.PORTRAIT_9_16,
  resolution: Resolution.RES_1K,
  isRefLowRes: false
};

function App() {
  // --- State: Global ---
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [showKeySettings, setShowKeySettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [mode, setMode] = useState<GenerationMode>(GenerationMode.IMAGE_EDIT);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  
  // --- State: Per Mode ---
  const [modeStates, setModeStates] = useState<Record<GenerationMode, ModeState>>({
    [GenerationMode.IMAGE_EDIT]: { ...DEFAULT_MODE_STATE },
    [GenerationMode.IMAGE_TO_IMAGE]: { ...DEFAULT_MODE_STATE },
    [GenerationMode.IMG_TO_PROMPT]: { ...DEFAULT_MODE_STATE },
    [GenerationMode.TEXT_TO_PROMPT]: { ...DEFAULT_MODE_STATE },
  });

  // --- State: Processing & View ---
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showFullProgress, setShowFullProgress] = useState<boolean>(false);
  const [progressStep, setProgressStep] = useState<string>('');
  const [visualProgress, setVisualProgress] = useState<number>(0);
  
  const serviceProgressRef = useRef<number>(0);

  // Helper to get current mode data
  const currentState = modeStates[mode];

  // Helper to update current mode data
  const updateCurrentState = (updates: Partial<ModeState>) => {
    setModeStates(prev => ({
      ...prev,
      [mode]: { ...prev[mode], ...updates }
    }));
  };

  // --- Effects ---
  useEffect(() => {
    const checkKey = async () => {
      let keyFound = false;

      // 1. Check for environment variable key safely
      try {
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
            keyFound = true;
        }
      } catch (e) {
        // process not defined or restricted, ignore
      }

      // 2. Check if we are in AI Studio environment
      if (!keyFound && (window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
        const has = await (window as any).aistudio.hasSelectedApiKey();
        if (has) {
          keyFound = true;
        }
      }
      
      // 3. Fallback: Check local storage for manually entered key
      const storedKey = localStorage.getItem('gemini_api_key');
      if (storedKey) {
        setApiKey(storedKey);
        keyFound = true;
      }

      setHasKey(keyFound);
    };
    checkKey();
  }, []);

  // Smooth Progress Interpolation
  useEffect(() => {
    let animationFrameId: number;
    
    const animate = () => {
      if (!isGenerating) return;

      setVisualProgress(current => {
        const target = serviceProgressRef.current;
        
        // If we haven't reached the target reported by the service
        if (current < target) {
          const diff = target - current;
          // Smoothly approach target (ease-out), but ensure a minimum step so it finishes
          return Math.min(target, current + Math.max(0.5, diff * 0.1));
        }
        
        // Fake "thinking" progress: Slowly creep up if waiting for server (e.g., stuck at 50% or 90%)
        // Cap at 99% so we don't show 100% prematurely
        if (current >= target && current < 99) {
          return current + 0.1; // Increased slightly to look more active
        }
        
        return current;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    if (isGenerating) {
      animationFrameId = requestAnimationFrame(animate);
    } else {
      if (currentState.generatedImage || currentState.generatedText) {
        setVisualProgress(100);
      } else {
        setVisualProgress(0);
      }
    }

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [isGenerating, currentState.generatedImage, currentState.generatedText]);

  // --- Handlers ---
  const handleKeyClick = async () => {
    // If in AI Studio, use their selector
    if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      const has = await (window as any).aistudio.hasSelectedApiKey();
      setHasKey(has);
    } else {
      // Otherwise use our manual input modal
      setShowKeySettings(true);
    }
  };

  const handleSaveKey = (key: string) => {
    setApiKey(key);
    if (key) {
      localStorage.setItem('gemini_api_key', key);
      setHasKey(true);
    } else {
      localStorage.removeItem('gemini_api_key');
      // Re-check env to see if we should still show as "Active"
      let envHasKey = false;
      try {
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
           envHasKey = true;
        }
      } catch(e) {}
      setHasKey(envHasKey);
    }
    setShowKeySettings(false);
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

  const handleGenerate = async () => {
    setError(null);
    updateCurrentState({ generatedText: null }); // Clear previous text for this mode

    // If generating new image, archive old one for comparison
    if (mode === GenerationMode.IMAGE_EDIT || mode === GenerationMode.IMAGE_TO_IMAGE) {
        if (currentState.generatedImage) {
            updateCurrentState({ comparisonImage: currentState.generatedImage, generatedImage: null });
        }
    }

    // Validation
    if (mode === GenerationMode.IMAGE_EDIT) {
       if (!currentState.textPrompt.trim()) return setError(ERRORS.MISSING_PROMPT);
    }
    
    if (mode === GenerationMode.IMAGE_TO_IMAGE) {
       if (!currentState.subjectImage) return setError(ERRORS.MISSING_SUBJECT);
       if (!currentState.referenceImage) return setError(ERRORS.MISSING_REF);
    }
    
    if (mode === GenerationMode.IMG_TO_PROMPT && !currentState.subjectImage) return setError(ERRORS.MISSING_SUBJECT);
    
    if (mode === GenerationMode.TEXT_TO_PROMPT && !currentState.textPrompt.trim()) return setError(ERRORS.MISSING_PROMPT);

    setIsGenerating(true);
    
    const isImageGen = mode === GenerationMode.IMAGE_EDIT || mode === GenerationMode.IMAGE_TO_IMAGE;
    if (isImageGen) setShowFullProgress(true);
    
    setVisualProgress(0);
    serviceProgressRef.current = 0;
    setProgressStep("Initializing...");

    try {
      if (isImageGen) {
          const params: GenerateParams = {
            subjectImage: currentState.subjectImage || undefined,
            mode,
            textPrompt: currentState.textPrompt,
            referenceImage: currentState.referenceImage || undefined,
            referenceOperation: currentState.refOperation,
            aspectRatio: currentState.aspectRatio,
            resolution: currentState.resolution,
            onProgress: (msg, val) => {
              setProgressStep(msg);
              serviceProgressRef.current = val;
            },
            apiKey: apiKey || undefined
          };

          const imageUrl = await generateImage(params);
          
          serviceProgressRef.current = 100;
          setProgressStep("Finishing up...");
          await new Promise(resolve => setTimeout(resolve, 600));

          updateCurrentState({ generatedImage: imageUrl });
          
          const newHistoryItem: GeneratedImage = {
            type: 'image',
            id: Date.now().toString(),
            url: imageUrl,
            timestamp: Date.now(),
            prompt: currentState.textPrompt || "Reference based generation"
          };
          setHistory(prev => [newHistoryItem, ...prev]);
      } else {
          const params: PromptGenParams = {
              mode,
              subjectImage: currentState.subjectImage || undefined,
              textPrompt: currentState.textPrompt,
              useFaceFeature: currentState.useFaceFeature,
              onProgress: (msg, val) => {
                  setProgressStep(msg);
                  serviceProgressRef.current = val;
              },
              apiKey: apiKey || undefined
          };
          const promptText = await generatePrompt(params);

          serviceProgressRef.current = 100;
          setProgressStep("Finalizing...");
          await new Promise(resolve => setTimeout(resolve, 600));

          updateCurrentState({ generatedText: promptText });
          
          const newHistoryItem: GeneratedText = {
            type: 'text',
            id: Date.now().toString(),
            text: promptText,
            timestamp: Date.now(),
            sourcePrompt: currentState.textPrompt || "Image analysis"
          };
          setHistory(prev => [newHistoryItem, ...prev]);
      }

    } catch (err: any) {
      const msg = err.message || ERRORS.GENERIC;
      if (msg === ERRORS.AUTH_FAILED || msg === ERRORS.MISSING_KEY) {
        setHasKey(false);
        if (!apiKey && !(window as any).aistudio) {
            setShowKeySettings(true);
        }
      }
      setError(msg);
      if (currentState.comparisonImage && !currentState.generatedImage) {
          updateCurrentState({ generatedImage: currentState.comparisonImage, comparisonImage: null });
      }
    } finally {
      setIsGenerating(false);
      setShowFullProgress(false);
      serviceProgressRef.current = 100;
    }
  };

  const handleHistorySelect = (item: HistoryItem) => {
    if (item.type === 'image') {
      updateCurrentState({ generatedImage: item.url, generatedText: null });
    } else if (item.type === 'text') {
      updateCurrentState({ generatedText: item.text, generatedImage: null });
    }
    
    if (isGenerating) setShowFullProgress(false);
  };

  const handleDownload = (url: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `nanobanana-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyText = () => {
      if (currentState.generatedText) {
          navigator.clipboard.writeText(currentState.generatedText);
      }
  };

  const handleSendToImageEdit = () => {
    if (currentState.generatedText) {
      setModeStates(prev => ({
        ...prev,
        [GenerationMode.IMAGE_EDIT]: {
          ...prev[GenerationMode.IMAGE_EDIT],
          textPrompt: currentState.generatedText!
        }
      }));
      setMode(GenerationMode.IMAGE_EDIT);
    }
  };

  const handleUseAsSubject = (url: string) => {
    const file = dataURLtoFile(url, 'generated-subject.png');
    updateCurrentState({ subjectImage: file });
  };

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-200 overflow-hidden font-sans">
      <KeySettings 
        isOpen={showKeySettings} 
        onClose={() => setShowKeySettings(false)} 
        onSave={handleSaveKey}
        currentKey={apiKey}
      />
      
      <GuideModal 
        isOpen={showGuide}
        onClose={() => setShowGuide(false)}
      />
      
      {/* --- Top Bar --- */}
      <motion.header 
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: "circOut" }}
        className="flex-none h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md z-20"
      >
        <div className="max-w-[1800px] mx-auto px-4 h-full flex items-center justify-between">
          
          {/* Logo */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="flex items-center gap-2 w-auto min-w-[200px] shrink-0"
          >
            <div className="text-2xl">
              🍌
            </div>
            <span className="font-semibold text-zinc-100 tracking-tight hidden md:inline whitespace-nowrap">NanoBanana Pro Studio</span>
          </motion.div>

          {/* Center Mode Tabs */}
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

          {/* Right API Key & Guide */}
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

      {/* --- Main Workspace --- */}
      <main className="flex-1 flex overflow-hidden max-w-[1800px] mx-auto w-full">
        
        {/* --- Left Column: Controls --- */}
        <aside className="w-full lg:w-[420px] xl:w-[460px] flex flex-col border-r border-zinc-800 bg-zinc-950 overflow-y-auto">
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
                
                {/* PROMPT GENERATOR TOGGLE - FIXED */}
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
                               initial={false}
                               animate={{ x: currentState.useFaceFeature ? 24 : 4 }}
                               transition={{ type: "spring", stiffness: 500, damping: 30 }}
                               className="inline-block h-4 w-4 rounded-full bg-white shadow-sm pointer-events-none" 
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
                    >
                        <div>
                        <FileUpload 
                            label="Reference Image"
                            helperText="Clothing style or scene composition."
                            selectedFile={currentState.referenceImage}
                            onFileSelect={handleReferenceSelect}
                            required
                            className="mb-2"
                        />
                        {currentState.isRefLowRes && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-yellow-500 text-xs bg-yellow-500/10 p-2 rounded border border-yellow-500/20 mb-2">
                            <AlertCircle size={12} />
                            <span>Low resolution reference. Results may vary.</span>
                            </motion.div>
                        )}
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
                                    onClick={() => updateCurrentState({ refOperation: item.op })}
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
          <div className="mt-auto p-6 border-t border-zinc-800 bg-zinc-900/30 sticky bottom-0 backdrop-blur-sm">
             <AnimatePresence>
                {error && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="mb-4 bg-red-900/20 border border-red-800/50 rounded-lg p-3 flex items-start gap-3"
                    >
                        <AlertCircle className="text-red-500 shrink-0 w-5 h-5 mt-0.5" />
                        <p className="text-sm text-red-200 leading-snug">{error}</p>
                    </motion.div>
                )}
             </AnimatePresence>
            
            <Button 
              onClick={handleGenerate} 
              isLoading={isGenerating} 
              className="w-full py-4 text-base font-semibold"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              {mode === GenerationMode.IMG_TO_PROMPT || mode === GenerationMode.TEXT_TO_PROMPT ? 'Generate Prompt' : 'Generate Image'}
            </Button>
            <p className="text-center text-xs text-zinc-600 mt-3">
              {(mode === GenerationMode.IMG_TO_PROMPT || mode === GenerationMode.TEXT_TO_PROMPT) ? 'Uses Gemini 2.5 Flash' : 'Uses Gemini 3 Pro (Nano Banana Pro)'}
            </p>
          </div>
        </aside>

        {/* --- Right Column: Canvas --- */}
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
                            /* IMAGE RESULT VIEW */
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

              {/* Mini Progress Widget (For Text Gen or minimized Image Gen) */}
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

          {/* History Strip (Global History) */}
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
                   {/* Type Indicator Icon Overlay */}
                   <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.type === 'text' && <div className="bg-zinc-950/80 p-1 rounded text-yellow-500"><Type size={10} /></div>}
                   </div>
                 </motion.button>
               ))
             )}
          </motion.div>

        </section>
      </main>
    </div>
  );
}

// Helper for "Use as Subject"
function dataURLtoFile(dataurl: string, filename: string) {
    let arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)?.[1];
    let bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

export default App;