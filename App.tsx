
import React, { useState, useEffect, useRef } from 'react';
import KeySettings from './components/KeySettings';
import GuideModal from './components/GuideModal';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
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
import { ERRORS } from './constants';
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

      try {
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
            keyFound = true;
        }
      } catch (e) {}

      if (!keyFound && (window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
        const has = await (window as any).aistudio.hasSelectedApiKey();
        if (has) {
          keyFound = true;
        }
      }
      
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
        
        if (current < target) {
          const diff = target - current;
          return Math.min(target, current + Math.max(0.5, diff * 0.1));
        }
        
        if (current >= target && current < 99) {
          return current + 0.1;
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
    if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      const has = await (window as any).aistudio.hasSelectedApiKey();
      setHasKey(has);
    } else {
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

  const handleGenerate = async () => {
    setError(null);
    updateCurrentState({ generatedText: null });

    if (mode === GenerationMode.IMAGE_EDIT || mode === GenerationMode.IMAGE_TO_IMAGE) {
        if (currentState.generatedImage) {
            updateCurrentState({ comparisonImage: currentState.generatedImage, generatedImage: null });
        }
    }

    // Validation
    if (mode === GenerationMode.IMAGE_EDIT && !currentState.textPrompt.trim()) return setError(ERRORS.MISSING_PROMPT);
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
            apiKey: apiKey || undefined,
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
          // Text modes
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
      
      <Header 
        mode={mode}
        setMode={setMode}
        showGuide={showGuide}
        setShowGuide={setShowGuide}
        hasKey={hasKey}
        handleKeyClick={handleKeyClick}
        isModalOpen={showGuide || showKeySettings}
      />

      {/* --- Main Workspace --- */}
      <main className="flex-1 flex overflow-hidden max-w-[1800px] mx-auto w-full">
        
        <Sidebar 
          mode={mode}
          currentState={currentState}
          updateCurrentState={updateCurrentState}
          isGenerating={isGenerating}
          handleGenerate={handleGenerate}
          error={error}
        />

        <Canvas 
          currentState={currentState}
          updateCurrentState={updateCurrentState}
          isGenerating={isGenerating}
          showFullProgress={showFullProgress}
          progressStep={progressStep}
          visualProgress={visualProgress}
          history={history}
          handleHistorySelect={handleHistorySelect}
          handleDownload={handleDownload}
          handleUseAsSubject={handleUseAsSubject}
          handleSendToImageEdit={handleSendToImageEdit}
          handleCopyText={handleCopyText}
        />
        
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
