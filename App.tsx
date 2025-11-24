
import React, { useState, useEffect, useRef, useCallback } from 'react';
import KeySettings from './components/KeySettings';
import GuideModal from './components/GuideModal';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
import GalleryModal from './components/GalleryModal';
import { ToastProvider, useToast } from './context/ToastContext';
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
import { getHistoryItems, saveHistoryItem, deleteHistoryItem } from './utils/indexedDB';
import { dataURLtoFile } from './utils/imageUtils';

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
  isRefLowRes: false,
  refStrength: 70,
  negativePrompt: '',
  lastParams: null,
  hasError: false,
  errorMessage: null
};

function AppContent() {
  const { addToast } = useToast();

  // --- State: Global ---
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [showKeySettings, setShowKeySettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [mode, setMode] = useState<GenerationMode>(GenerationMode.IMAGE_EDIT);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [hasCompletedFirstGeneration, setHasCompletedFirstGeneration] = useState<boolean>(false);
  
  // --- Session Quota ---
  const [sessionImageCount, setSessionImageCount] = useState<number>(0);

  // --- Sidebar Resize State ---
  const [sidebarWidth, setSidebarWidth] = useState<number>(420);
  const [isResizing, setIsResizing] = useState<boolean>(false);

  // --- State: Per Mode ---
  const [modeStates, setModeStates] = useState<Record<GenerationMode, ModeState>>({
    [GenerationMode.IMAGE_EDIT]: { ...DEFAULT_MODE_STATE },
    [GenerationMode.IMAGE_TO_IMAGE]: { ...DEFAULT_MODE_STATE },
    [GenerationMode.IMG_TO_PROMPT]: { ...DEFAULT_MODE_STATE },
    [GenerationMode.TEXT_TO_PROMPT]: { ...DEFAULT_MODE_STATE },
  });

  // --- State: Processing & View ---
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
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
    const initApp = async () => {
      // 1. Check API Key
      let keyFound = false;
      try {
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
            keyFound = true;
        }
      } catch (e) {}

      if (!keyFound && (window as any).aistudio && (window as any).aistudio.hasSelectedApiKey) {
        const has = await (window as any).aistudio.hasSelectedApiKey();
        if (has) keyFound = true;
      }
      
      const storedKey = localStorage.getItem('gemini_api_key');
      if (storedKey) {
        setApiKey(storedKey);
        keyFound = true;
      }
      setHasKey(keyFound);

      // 2. Load History from IndexedDB with Delay for Skeleton
      setIsHistoryLoading(true);
      try {
          // Minimal delay to prevent flicker if it loads instantly
          const [loadedHistory] = await Promise.all([
             getHistoryItems(),
             new Promise(resolve => setTimeout(resolve, 800)) 
          ]);
          setHistory(loadedHistory);
      } catch (error) {
          console.error("Failed to load history", error);
      } finally {
          setIsHistoryLoading(false);
      }
      
      // 3. Load Session Quota
      const savedSessionCount = sessionStorage.getItem('nanobanana_session_count');
      if (savedSessionCount) {
        setSessionImageCount(parseInt(savedSessionCount, 10) || 0);
      }
    };

    initApp();

    // Check if user has previously generated an image
    const firstGen = localStorage.getItem('nanobanana_first_gen_complete');
    if (firstGen === 'true') {
      setHasCompletedFirstGeneration(true);
    }
    
    // Load saved sidebar width
    const savedWidth = localStorage.getItem('nanobanana_sidebar_width');
    if (savedWidth) {
      const w = parseInt(savedWidth, 10);
      if (!isNaN(w) && w > 240 && w < 1000) {
        setSidebarWidth(w);
      }
    }
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

  // Restore full progress overlay if content is closed during generation
  useEffect(() => {
    if (isGenerating && !currentState.generatedImage && !currentState.generatedText) {
      setShowFullProgress(true);
    }
  }, [isGenerating, currentState.generatedImage, currentState.generatedText]);

  // --- Resize Logic ---
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);

  useEffect(() => {
    if (!isResizing) return;

    const onMouseMove = (e: MouseEvent) => {
      // Calculate width based on mouse position
      const main = document.querySelector('main');
      const offset = main ? main.getBoundingClientRect().left : 0;
      let newWidth = e.clientX - offset;
      
      // Constraints
      if (newWidth < 300) newWidth = 300;
      if (newWidth > 800) newWidth = 800;
      if (newWidth > window.innerWidth * 0.7) newWidth = window.innerWidth * 0.7;
      
      setSidebarWidth(newWidth);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', stopResizing);
    
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [isResizing, stopResizing]);

  // Save width when resizing stops
  useEffect(() => {
    if (!isResizing) {
        localStorage.setItem('nanobanana_sidebar_width', sidebarWidth.toString());
    }
  }, [isResizing, sidebarWidth]);


  // --- Handlers ---
  const handleKeyClick = async () => {
    if ((window as any).aistudio && (window as any).aistudio.openSelectKey) {
      await (window as any).aistudio.openSelectKey();
      const has = await (window as any).aistudio.hasSelectedApiKey();
      setHasKey(has);
      if(has) addToast('API Key connected successfully', 'success');
    } else {
      setShowKeySettings(true);
    }
  };

  const handleSaveKey = (key: string) => {
    setApiKey(key);
    if (key) {
      localStorage.setItem('gemini_api_key', key);
      setHasKey(true);
      addToast('API Key saved locally', 'success');
    } else {
      localStorage.removeItem('gemini_api_key');
      let envHasKey = false;
      try {
        if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
           envHasKey = true;
        }
      } catch(e) {}
      setHasKey(envHasKey);
      addToast('API Key removed', 'info');
    }
    setShowKeySettings(false);
  };

  const handleGenerate = useCallback(async (isRetryArg: boolean | React.MouseEvent = false) => {
    const isRetry = isRetryArg === true;
    updateCurrentState({ errorMessage: null, hasError: false });
    
    const currentImageRef = currentState.generatedImage;
    let paramsToUse: GenerateParams | PromptGenParams;

    if (!isRetry) {
        if (mode === GenerationMode.IMAGE_EDIT && !currentState.textPrompt.trim()) {
             updateCurrentState({ errorMessage: ERRORS.MISSING_PROMPT });
             addToast(ERRORS.MISSING_PROMPT, 'error');
             return; 
        }
        if (mode === GenerationMode.IMAGE_TO_IMAGE) {
            if (!currentState.subjectImage) {
                 updateCurrentState({ errorMessage: ERRORS.MISSING_SUBJECT });
                 addToast(ERRORS.MISSING_SUBJECT, 'error');
                 return;
            }
            if (!currentState.referenceImage) {
                 updateCurrentState({ errorMessage: ERRORS.MISSING_REF });
                 addToast(ERRORS.MISSING_REF, 'error');
                 return;
            }
        }
        if (mode === GenerationMode.IMG_TO_PROMPT && !currentState.subjectImage) {
             updateCurrentState({ errorMessage: ERRORS.MISSING_SUBJECT });
             addToast(ERRORS.MISSING_SUBJECT, 'error');
             return;
        }
        if (mode === GenerationMode.TEXT_TO_PROMPT && !currentState.textPrompt.trim()) {
             updateCurrentState({ errorMessage: ERRORS.MISSING_PROMPT });
             addToast(ERRORS.MISSING_PROMPT, 'error');
             return;
        }
    }

    setIsGenerating(true);
    const isImageGen = mode === GenerationMode.IMAGE_EDIT || mode === GenerationMode.IMAGE_TO_IMAGE;
    
    if (isImageGen) {
        setShowFullProgress(!currentState.generatedImage);
    } else {
        setShowFullProgress(!currentState.generatedText);
    }
    
    setVisualProgress(0);
    serviceProgressRef.current = 0;
    setProgressStep("Initializing...");
    updateCurrentState({ generatedText: null });

    try {
      if (isRetry && currentState.lastParams) {
          paramsToUse = { 
              ...currentState.lastParams,
              onProgress: (msg, val) => {
                setProgressStep(msg);
                serviceProgressRef.current = val;
              },
              apiKey: apiKey || undefined 
          } as GenerateParams | PromptGenParams;
      } else {
          if (isImageGen) {
              paramsToUse = {
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
                refStrength: currentState.refStrength,
                negativePrompt: currentState.negativePrompt
              } as GenerateParams;
          } else {
              paramsToUse = {
                  mode,
                  subjectImage: currentState.subjectImage || undefined,
                  textPrompt: currentState.textPrompt,
                  useFaceFeature: currentState.useFaceFeature,
                  onProgress: (msg, val) => {
                      setProgressStep(msg);
                      serviceProgressRef.current = val;
                  },
                  apiKey: apiKey || undefined,
                  negativePrompt: currentState.negativePrompt
              } as PromptGenParams;
          }
      }

      const paramsForStorage = { ...paramsToUse };
      delete (paramsForStorage as any).onProgress;
      updateCurrentState({ lastParams: paramsForStorage });

      if (isImageGen) {
          const imageUrl = await generateImage(paramsToUse as GenerateParams);
          
          serviceProgressRef.current = 100;
          setProgressStep("Finishing up...");
          await new Promise(resolve => setTimeout(resolve, 600));

          if (!hasCompletedFirstGeneration) {
            setHasCompletedFirstGeneration(true);
            localStorage.setItem('nanobanana_first_gen_complete', 'true');
          }

          updateCurrentState({ 
            generatedImage: imageUrl,
            comparisonImage: currentImageRef || currentState.comparisonImage 
          });
          
          setSessionImageCount(prev => {
            const newVal = prev + 1;
            sessionStorage.setItem('nanobanana_session_count', newVal.toString());
            return newVal;
          });
          
          const newHistoryItem: GeneratedImage = {
            type: 'image',
            id: Date.now().toString(),
            url: imageUrl,
            timestamp: Date.now(),
            prompt: currentState.textPrompt || "Reference based generation",
            metadata: {
              mode,
              textPrompt: currentState.textPrompt,
              aspectRatio: currentState.aspectRatio,
              resolution: currentState.resolution,
              referenceOperation: currentState.refOperation,
              refStrength: currentState.refStrength,
              negativePrompt: currentState.negativePrompt
            }
          };
          
          await saveHistoryItem(newHistoryItem);
          setHistory(prev => [newHistoryItem, ...prev]);
          addToast("Image generated successfully", 'success');

      } else {
          const promptText = await generatePrompt(paramsToUse as PromptGenParams);

          serviceProgressRef.current = 100;
          setProgressStep("Finalizing...");
          await new Promise(resolve => setTimeout(resolve, 600));

          updateCurrentState({ generatedText: promptText });
          
          const newHistoryItem: GeneratedText = {
            type: 'text',
            id: Date.now().toString(),
            text: promptText,
            timestamp: Date.now(),
            sourcePrompt: currentState.textPrompt || "Image analysis",
            metadata: {
              mode,
              textPrompt: currentState.textPrompt,
              useFaceFeature: currentState.useFaceFeature,
              negativePrompt: currentState.negativePrompt
            }
          };
          
          await saveHistoryItem(newHistoryItem);
          setHistory(prev => [newHistoryItem, ...prev]);
          addToast("Prompt generated successfully", 'success');
      }
      
      updateCurrentState({ hasError: false, errorMessage: null });

    } catch (err: any) {
      const msg = err.message || ERRORS.GENERIC;
      if (msg === ERRORS.AUTH_FAILED || msg === ERRORS.MISSING_KEY) {
        setHasKey(false);
        if (!apiKey && !(window as any).aistudio) {
            setShowKeySettings(true);
        }
      }
      updateCurrentState({ hasError: true, errorMessage: msg });
      addToast(msg, 'error');

    } finally {
      setIsGenerating(false);
      setShowFullProgress(false);
      serviceProgressRef.current = 100;
    }
  }, [mode, currentState, apiKey, hasCompletedFirstGeneration]);

  const handleRetry = () => handleGenerate(true);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (!isGenerating && !showKeySettings && !showGuide && !showGallery) {
          e.preventDefault();
          handleGenerate();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGenerate, isGenerating, showKeySettings, showGuide, showGallery]);

  const handleHistorySelect = (item: HistoryItem) => {
    if (item.type === 'image') {
      updateCurrentState({ generatedImage: item.url, generatedText: null });
    } else if (item.type === 'text') {
      updateCurrentState({ generatedText: item.text, generatedImage: null });
    }
    if (isGenerating) setShowFullProgress(false);
  };

  const handleDeleteHistoryItem = async (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    const itemToDelete = history.find(item => item.id === itemId);
    if (!itemToDelete) return;

    const isDisplayed = 
      (itemToDelete.type === 'image' && itemToDelete.url === currentState.generatedImage) ||
      (itemToDelete.type === 'text' && itemToDelete.text === currentState.generatedText);

    try {
      await deleteHistoryItem(itemId);
      const updatedHistory = history.filter(item => item.id !== itemId);
      setHistory(updatedHistory);

      if (isDisplayed) {
        if (updatedHistory.length > 0) {
          const nextItem = updatedHistory[0];
          if (nextItem.type === 'image') {
            updateCurrentState({ generatedImage: nextItem.url, generatedText: null });
          } else {
            updateCurrentState({ generatedText: nextItem.text, generatedImage: null });
          }
        } else {
          updateCurrentState({ generatedImage: null, generatedText: null });
        }
      }
      addToast('Item deleted', 'success');
    } catch (err) {
      addToast('Failed to delete item', 'error');
    }
  };

  const handleDeleteHistoryItems = async (ids: string[]) => {
      for (const id of ids) {
          await deleteHistoryItem(id);
      }
      const updatedHistory = history.filter(item => !ids.includes(item.id));
      setHistory(updatedHistory);
      
      // If current item was deleted, clear view
      const currentId = history.find(item => 
          (item.type === 'image' && item.url === currentState.generatedImage) ||
          (item.type === 'text' && item.text === currentState.generatedText)
      )?.id;

      if (currentId && ids.includes(currentId)) {
           updateCurrentState({ generatedImage: null, generatedText: null });
      }
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
      addToast('Prompt sent to Image Edit', 'success');
    }
  };

  const handleUseAsSubject = (url: string) => {
    const file = dataURLtoFile(url, 'generated-subject.png');
    updateCurrentState({ subjectImage: file });
    addToast('Image set as Subject', 'success');
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

      <GalleryModal
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        history={history}
        onDeleteItems={handleDeleteHistoryItems}
        onDownloadImage={(url) => handleDownload(url)}
      />
      
      <Header 
        mode={mode}
        setMode={setMode}
        showGuide={showGuide}
        setShowGuide={setShowGuide}
        hasKey={hasKey}
        handleKeyClick={handleKeyClick}
        isModalOpen={showGuide || showKeySettings || showGallery}
        autoHideEnabled={hasCompletedFirstGeneration}
      />

      <main className="flex-1 flex overflow-hidden max-w-[1800px] mx-auto w-full relative">
        <Sidebar 
          mode={mode}
          currentState={currentState}
          updateCurrentState={updateCurrentState}
          isGenerating={isGenerating}
          handleGenerate={handleGenerate}
          handleRetry={handleRetry}
          error={currentState.errorMessage}
          width={sidebarWidth}
        />
        
        <div 
          className={`w-1.5 -ml-[3px] z-50 cursor-col-resize flex-none transition-colors hover:bg-yellow-500 active:bg-yellow-500 ${isResizing ? 'bg-yellow-500' : 'bg-transparent'}`}
          onMouseDown={startResizing}
          onDoubleClick={() => setSidebarWidth(420)}
          title="Drag to resize"
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
          handleDeleteHistoryItem={handleDeleteHistoryItem}
          handleDownload={handleDownload}
          handleUseAsSubject={handleUseAsSubject}
          handleSendToImageEdit={handleSendToImageEdit}
          handleCopyText={handleCopyText}
          sessionImageCount={sessionImageCount}
          onOpenGallery={() => setShowGallery(true)}
          isHistoryLoading={isHistoryLoading}
        />
        
        {isResizing && (
           <div className="fixed inset-0 z-[100] cursor-col-resize bg-transparent select-none" />
        )}
      </main>
    </div>
  );
}

function App() {
    return (
        <ToastProvider>
            <AppContent />
        </ToastProvider>
    );
}

export default App;
