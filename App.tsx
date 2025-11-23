
import React, { useState, useEffect, useRef } from 'react';
import { 
  Settings, Sparkles, AlertCircle, Download, CheckCircle, 
  Layers, Type, Key, ImagePlus, User, Maximize2, Copy, X, 
  FileText, Wand2, ToggleLeft, ToggleRight, Trash2, ArrowRight,
  MessageSquare
} from 'lucide-react';
import Button from './components/Button';
import FileUpload from './components/FileUpload';
import KeySettings from './components/KeySettings';
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
      // Wrap in try/catch to avoid reference errors if process is not defined in browser
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
    // IMAGE_EDIT: Subject is now optional. If present -> Identity Edit. If absent -> Prompt Gen.
    if (mode === GenerationMode.IMAGE_EDIT) {
       if (!currentState.textPrompt.trim()) return setError(ERRORS.MISSING_PROMPT);
       // Note: We don't error on missing subject anymore for this mode.
    }
    
    if (mode === GenerationMode.IMAGE_TO_IMAGE) {
       if (!currentState.subjectImage) return setError(ERRORS.MISSING_SUBJECT);
       if (!currentState.referenceImage) return setError(ERRORS.MISSING_REF);
    }
    
    if (mode === GenerationMode.IMG_TO_PROMPT && !currentState.subjectImage) return setError(ERRORS.MISSING_SUBJECT);
    
    if (mode === GenerationMode.TEXT_TO_PROMPT && !currentState.textPrompt.trim()) return setError(ERRORS.MISSING_PROMPT);

    setIsGenerating(true);
    
    // Only show full progress screen for Image generation tasks
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
          
          // Force progress to 100% and wait a moment for animation to finish
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
          // PROMPT GENERATION MODES
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

          // Force progress to 100% and wait a moment for animation to finish
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
        // Prompt user to enter key if it failed due to auth
        if (!apiKey && !(window as any).aistudio) {
            setShowKeySettings(true);
        } else if ((window as any).aistudio) {
             // Let user know they need to reselect
             // (logic handled in catch mostly by UI state update)
        }
      }
      setError(msg);
      // If error, restore previous image if it was moved to comparison
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
      // If we are in a prompt gen mode, switch to an image mode to view it properly?
      // For now, assume user knows what they are doing. The Canvas renders based on state.
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
      
      {/* --- Top Bar --- */}
      <header className="flex-none h-16 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md z-20">
        <div className="max-w-[1800px] mx-auto px-4 h-full flex items-center justify-between">
          
          {/* Logo */}
          <div className="flex items-center gap-2 w-auto min-w-[200px] shrink-0">
            <div className="text-2xl">
              🍌
            </div>
            <span className="font-semibold text-zinc-100 tracking-tight hidden md:inline whitespace-nowrap">NanoBanana Pro Studio</span>
          </div>

          {/* Center Mode Tabs */}
          <div className="flex-1 max-w-2xl mx-4 overflow-x-auto no-scrollbar">
            <nav className="flex items-center bg-zinc-900/80 p-1 rounded-full border border-zinc-800 w-max mx-auto">
                {[
                    { id: GenerationMode.IMAGE_EDIT, label: 'Image Edit', icon: Type },
                    { id: GenerationMode.IMAGE_TO_IMAGE, label: 'Image to Image', icon: Layers },
                    { id: GenerationMode.IMG_TO_PROMPT, label: 'Img to Prompt', icon: FileText },
                    { id: GenerationMode.TEXT_TO_PROMPT, label: 'Text Prompt Gen', icon: Wand2 },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setMode(tab.id as GenerationMode)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all whitespace-nowrap ${
                            mode === tab.id
                            ? 'bg-yellow-500 text-zinc-950 shadow-sm' 
                            : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                        }`}
                    >
                        <tab.icon size={14} className="hidden sm:block" />
                        <span>{tab.label}</span>
                    </button>
                ))}
            </nav>
          </div>

          {/* Right API Key */}
          <div className="flex items-center justify-end w-48 shrink-0">
            <button 
              onClick={handleKeyClick}
              className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border transition-all ${
                hasKey 
                  ? 'border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-zinc-200' 
                  : 'border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10'
              }`}
            >
              <Key size={14} />
              <span className="hidden sm:inline">{hasKey ? 'API Key Active' : 'Set API Key'}</span>
              {hasKey && <div className="w-1.5 h-1.5 rounded-full bg-green-500 ml-1" />}
            </button>
          </div>
        </div>
      </header>

      {/* --- Main Workspace --- */}
      <main className="flex-1 flex overflow-hidden max-w-[1800px] mx-auto w-full">
        
        {/* --- Left Column: Controls --- */}
        <aside className="w-full lg:w-[420px] xl:w-[460px] flex flex-col border-r border-zinc-800 bg-zinc-950 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
          <div className="p-6 space-y-8">
            
            {/* Subject Image (Hidden for Text-to-Prompt) */}
            {mode !== GenerationMode.TEXT_TO_PROMPT && (
                <section className="space-y-4">
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
                    <div className="mb-2">
                        {currentState.subjectImage ? (
                            <div className="flex items-center gap-2 text-xs text-green-400 bg-green-950/20 px-3 py-2 rounded-lg border border-green-900/50">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0"></span>
                                <span className="font-medium">Identity-locked mode active</span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2 text-xs text-blue-400 bg-blue-950/20 px-3 py-2 rounded-lg border border-blue-900/50">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                                <span className="font-medium">Prompt-only generation mode</span>
                            </div>
                        )}
                    </div>
                )}

                <FileUpload 
                    label="" 
                    helperText={mode === GenerationMode.IMG_TO_PROMPT ? "Upload image to analyze." : "Clear front-facing photo of the subject."}
                    selectedFile={currentState.subjectImage}
                    onFileSelect={(f) => updateCurrentState({ subjectImage: f })}
                />
                </section>
            )}

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

              <div className="bg-zinc-900/40 rounded-xl p-4 border border-zinc-800/50 space-y-4">
                
                {/* PROMPT GENERATOR TOGGLE */}
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
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${currentState.useFaceFeature ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                )}

                {/* IMAGE REFERENCE UPLOAD */}
                {mode === GenerationMode.IMAGE_TO_IMAGE && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
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
                        <div className="flex items-center gap-2 text-yellow-500 text-xs bg-yellow-500/10 p-2 rounded border border-yellow-500/20 mb-2">
                          <AlertCircle size={12} />
                          <span>Low resolution reference. Results may vary.</span>
                        </div>
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
                            <button
                                key={item.op}
                                onClick={() => updateCurrentState({ refOperation: item.op })}
                                className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
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
                            </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

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
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 focus:ring-1 focus:ring-yellow-500 focus:border-yellow-500 outline-none resize-none min-h-[120px]"
                        />
                        {currentState.textPrompt && (
                            <button 
                                onClick={() => updateCurrentState({ textPrompt: '' })}
                                className="absolute top-3 right-3 p-1.5 text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-md transition-colors"
                                title="Clear Text"
                            >
                                <X size={14} />
                            </button>
                        )}
                   </div>
                </div>
              </div>
            </section>

            {/* Output Settings (Only for Image Generation Modes) */}
            {(mode === GenerationMode.IMAGE_EDIT || mode === GenerationMode.IMAGE_TO_IMAGE) && (
                <section className="space-y-4">
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
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm appearance-none focus:border-yellow-500 outline-none text-zinc-300"
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
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm appearance-none focus:border-yellow-500 outline-none text-zinc-300"
                        >
                        {RESOLUTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                        </select>
                        <Settings className="absolute right-3 top-3 text-zinc-600 pointer-events-none w-4 h-4" />
                    </div>
                    </div>
                </div>
                </section>
            )}

          </div>

          {/* Footer Action */}
          <div className="mt-auto p-6 border-t border-zinc-800 bg-zinc-900/30 sticky bottom-0 backdrop-blur-sm">
             {error && (
              <div className="mb-4 bg-red-900/20 border border-red-800/50 rounded-lg p-3 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-2">
                <AlertCircle className="text-red-500 shrink-0 w-5 h-5 mt-0.5" />
                <p className="text-sm text-red-200 leading-snug">{error}</p>
              </div>
            )}
            
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
          <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6 bg-zinc-950 z-10">
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
          </div>

          {/* Canvas Viewport */}
          <div className="flex-1 overflow-auto p-8 flex items-center justify-center bg-[radial-gradient(#1f1f22_1px,transparent_1px)] [background-size:20px_20px] relative">
             
             {/* 1. Full Screen Progress UI (Images Only) */}
             {isGenerating && showFullProgress ? (
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-8 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-300 shadow-2xl max-w-md w-full">
                   <div className="w-16 h-16 mx-auto bg-zinc-800 rounded-full flex items-center justify-center mb-6 relative">
                     <div className="absolute inset-0 rounded-full border-2 border-yellow-500/30 animate-ping"></div>
                     <Sparkles className="w-8 h-8 text-yellow-500 animate-pulse relative z-10" />
                   </div>
                   
                   <div className="space-y-4">
                      <h3 className="text-xl font-medium text-white text-center">{progressStep}</h3>
                      <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden relative">
                         <div 
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full transition-none"
                            style={{ width: `${Math.min(100, Math.max(0, visualProgress))}%` }}
                         />
                      </div>
                      <div className="flex justify-between text-xs text-zinc-500 font-medium uppercase tracking-wider">
                        <span>Processing</span>
                        <span>{Math.floor(visualProgress)}%</span>
                      </div>
                   </div>
                </div>
             ) : (
                /* 2. Content (Specific to Current Mode) */
                <>
                  {/* TEXT RESULT VIEW */}
                  {currentState.generatedText && (
                      <div className="w-full max-w-3xl h-full flex flex-col animate-in zoom-in-95 duration-300">
                          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 shadow-2xl overflow-y-auto custom-scrollbar relative group">
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
                          </div>
                      </div>
                  )}

                  {/* IMAGE RESULT VIEW */}
                  {!currentState.generatedText && (
                    <>
                        {currentState.comparisonImage && (
                            <div className="absolute left-4 bottom-4 md:left-8 md:bottom-8 lg:top-1/2 lg:-translate-y-1/2 w-48 lg:w-64 bg-zinc-900 p-2 rounded-xl border border-zinc-700 shadow-2xl z-20 animate-in slide-in-from-right-10 fade-in duration-500">
                            <div className="relative group">
                                <img src={currentState.comparisonImage} className="w-full rounded-lg" alt="Previous" />
                                <button 
                                    onClick={() => updateCurrentState({ comparisonImage: null })} 
                                    className="absolute -top-3 -right-3 bg-zinc-800 text-white rounded-full p-1.5 border border-zinc-600 shadow-lg hover:bg-red-600 transition-colors"
                                >
                                    <X size={14} />
                                </button>
                                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-[10px] text-white/90 backdrop-blur-md font-medium">Previous</div>
                            </div>
                            </div>
                        )}

                        {currentState.generatedImage ? (
                            <div className="relative group shadow-2xl shadow-black rounded-lg overflow-hidden ring-1 ring-zinc-800 max-h-full max-w-full animate-in zoom-in-95 duration-500">
                            <button 
                                onClick={() => updateCurrentState({ generatedImage: null })}
                                className="absolute top-4 right-4 bg-black/60 hover:bg-red-500/90 text-white p-2 rounded-full backdrop-blur-sm transition-all z-20 opacity-0 group-hover:opacity-100"
                                title="Close Image"
                            >
                                <X size={18} />
                            </button>
                            <img 
                                src={currentState.generatedImage} 
                                alt="Generated result" 
                                className="max-h-[calc(100vh-16rem)] object-contain bg-[#121212] bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" 
                            />
                            </div>
                        ) : (
                            /* Placeholder only if no text result either */
                            !isGenerating && (
                                <div className="text-center space-y-6 max-w-md w-full opacity-60">
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
                                </div>
                            )
                        )}
                    </>
                  )}

                  {/* Mini Progress Widget (For Text Gen or minimized Image Gen) */}
                  {isGenerating && !showFullProgress && (
                     <div className="absolute bottom-6 right-6 w-72 bg-zinc-900/90 border border-yellow-500/30 p-4 rounded-xl shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-4 duration-300 z-30">
                         <div className="flex items-center justify-between mb-3">
                             <div className="flex items-center gap-2 text-yellow-500">
                                 <span className="animate-spin"><Sparkles size={14}/></span>
                                 <span className="text-xs font-bold tracking-wide uppercase">Working...</span>
                             </div>
                             <span className="text-xs text-zinc-400 font-mono">{Math.floor(visualProgress)}%</span>
                         </div>
                         <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden mb-2">
                             <div 
                               className="h-full bg-yellow-500 transition-none" 
                               style={{width: `${visualProgress}%`}} 
                             />
                         </div>
                         <p className="text-[10px] text-zinc-500 truncate font-medium">{progressStep}</p>
                     </div>
                  )}
                </>
             )}
          </div>

          {/* History Strip (Global History) */}
          <div className="h-28 border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-sm flex items-center px-6 gap-4 overflow-x-auto">
             {history.length === 0 ? (
               <div className="text-xs text-zinc-600 font-medium w-full text-center">Your generated history will appear here</div>
             ) : (
               history.map(item => (
                 <button 
                   key={item.id}
                   onClick={() => handleHistorySelect(item)}
                   className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all relative group flex flex-col items-center justify-center ${
                     !isGenerating && (
                       (item.type === 'image' && currentState.generatedImage === item.url) || 
                       (item.type === 'text' && currentState.generatedText === item.text)
                     ) ? 'border-yellow-500 opacity-100' : 'border-zinc-800 opacity-60 hover:opacity-100 hover:border-zinc-600'
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
                 </button>
               ))
             )}
          </div>

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
