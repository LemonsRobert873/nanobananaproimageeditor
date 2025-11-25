

import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import KeySettings from './components/KeySettings';
import GuideModal from './components/GuideModal';
import ResetModal from './components/ResetModal';
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
  ModeState,
  SubjectItem,
  ActiveGeneration
} from './types';
import { ERRORS, MODELS } from './constants';
import { generateImage, generatePrompt } from './services/geminiService';
import { 
  getHistoryItems, 
  saveHistoryItem, 
  deleteHistoryItem, 
  clearAllHistory,
  saveStateImage,
  getStateImage,
  clearAllStateImages
} from './utils/indexedDB';
import { dataURLtoFile } from './utils/imageUtils';

// Default state template for a mode
const DEFAULT_MODE_STATE: ModeState = {
  subjects: [],
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
  refStrength: 100,
  negativePrompt: '',
  selectedModel: MODELS.PRO, // Default to Pro
  lastParams: null,
  hasError: false,
  errorMessage: null,
  // Generation State per mode
  isGenerating: false,
  progress: 0,
  progressStep: ''
};

// Keys for persistence
const STORAGE_KEYS = {
  ACTIVE_MODE: 'nanobanana_active_mode',
  SIDEBAR_WIDTH: 'nanobanana_sidebar_width',
  MODE_STATE_PREFIX: 'nanobanana_state_',
  IMAGE_PREFIX: 'img_'
};

// Keys for Quota
const QUOTA_KEYS = {
  COUNT: 'nb_quota_imageCount',
  DATE: 'nb_quota_lastResetDatePT'
};

// Helper to get current date in Pacific Time (PT)
const getCurrentPTDate = () => {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
};

function AppContent() {
  const { addToast } = useToast();

  // --- State: Global ---
  const [hasKey, setHasKey] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>('');
  const [showKeySettings, setShowKeySettings] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [mode, setMode] = useState<GenerationMode>(GenerationMode.IMAGE_EDIT);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isStateRestoring, setIsStateRestoring] = useState(true);
  
  // --- Daily Quota (PT) ---
  const [dailyImageCount, setDailyImageCount] = useState<number>(0);

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

  // State for Smooth Visual Progress (mapped by mode)
  const [visualProgressMap, setVisualProgressMap] = useState<Record<GenerationMode, number>>({
      [GenerationMode.IMAGE_EDIT]: 0,
      [GenerationMode.IMAGE_TO_IMAGE]: 0,
      [GenerationMode.IMG_TO_PROMPT]: 0,
      [GenerationMode.TEXT_TO_PROMPT]: 0,
  });

  // Derived: Active Generations for Global Progress Display
  const activeGenerations: ActiveGeneration[] = (Object.entries(modeStates) as [GenerationMode, ModeState][])
    .filter(([_, state]) => state.isGenerating)
    .map(([m, state]) => ({ 
        mode: m, 
        progress: visualProgressMap[m] || state.progress,
        step: state.progressStep,
        startedAt: state.startedAt || 0,
        model: state.selectedModel
    }))
    .sort((a, b) => a.startedAt - b.startedAt); // Oldest first, so newest can be stacked at bottom

  // Helper to get current mode data
  const currentState = modeStates[mode];

  // Helper to update specific mode data
  const updateModeState = (targetMode: GenerationMode, updates: Partial<ModeState>) => {
    setModeStates(prev => ({
      ...prev,
      [targetMode]: { ...prev[targetMode], ...updates }
    }));
  };

  const updateCurrentState = (updates: Partial<ModeState>) => {
      updateModeState(mode, updates);
  };

  // Safe mode switching that clears temporary view state
  const handleSetMode = (newMode: GenerationMode) => {
    if (newMode !== mode) {
        // Enforce strict per-mode isolation for "previous on left" view
        // Reset comparisonImage when entering the new mode
        // Note: We update the state via setModeStates callback to ensure it applies before render
        setModeStates(prev => ({
            ...prev,
            [newMode]: {
                ...prev[newMode],
                comparisonImage: null
            }
        }));
        setMode(newMode);
    }
  };

  // --- Global Escape Key Handling ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showGallery) return; // Gallery handles its own

        if (showKeySettings) {
          setShowKeySettings(false);
          return;
        }

        if (showGuide) {
          setShowGuide(false);
          return;
        }

        if (showResetModal) {
          setShowResetModal(false);
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showGallery, showKeySettings, showGuide, showResetModal]);

  // --- Initialization & Persistence ---
  
  // 1. Load History & Session
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

      // 2. Load History
      setIsHistoryLoading(true);
      try {
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
      
      // 3. Load Daily Quota (PT based)
      const ptDate = getCurrentPTDate();
      const storedDate = localStorage.getItem(QUOTA_KEYS.DATE);
      let count = 0;

      if (storedDate !== ptDate) {
          // Reset if new day or no date stored
          localStorage.setItem(QUOTA_KEYS.DATE, ptDate);
          localStorage.setItem(QUOTA_KEYS.COUNT, '0');
      } else {
          count = parseInt(localStorage.getItem(QUOTA_KEYS.COUNT) || '0', 10);
      }
      setDailyImageCount(count);

      sessionStorage.removeItem('nanobanana_session_count');
    };

    initApp();
  }, []);

  // 2. Load Application State
  useEffect(() => {
    const restoreState = async () => {
        setIsStateRestoring(true);
        try {
            // Restore Global Settings
            const savedWidth = localStorage.getItem(STORAGE_KEYS.SIDEBAR_WIDTH);
            if (savedWidth) {
                const w = parseInt(savedWidth, 10);
                if (!isNaN(w) && w > 240 && w < 1000) setSidebarWidth(w);
            }

            const savedMode = localStorage.getItem(STORAGE_KEYS.ACTIVE_MODE);
            if (savedMode && Object.values(GenerationMode).includes(savedMode as GenerationMode)) {
                setMode(savedMode as GenerationMode);
            }

            // Restore Mode States
            const restoredModes = { ...modeStates };
            const modes = Object.values(GenerationMode);

            for (const m of modes) {
                // Recover simple data from LocalStorage
                const savedJson = localStorage.getItem(`${STORAGE_KEYS.MODE_STATE_PREFIX}${m}`);
                if (savedJson) {
                    try {
                        const parsed = JSON.parse(savedJson);
                        // Merge parsed data into default state, but reset generation flags
                        restoredModes[m] = { 
                            ...restoredModes[m], 
                            ...parsed,
                            selectedModel: parsed.selectedModel || MODELS.PRO, // Restore model
                            isGenerating: false,
                            progress: 0,
                            progressStep: '',
                            comparisonImage: null // Always clear previous preview on reload
                        };
                    } catch (e) {
                        console.error(`Failed to parse state for ${m}`, e);
                    }
                }

                // Recover Subjects from IndexedDB
                if (restoredModes[m].subjects && Array.isArray(restoredModes[m].subjects)) {
                    const loadedSubjects: SubjectItem[] = [];
                    for (const s of restoredModes[m].subjects) {
                        const key = `${STORAGE_KEYS.IMAGE_PREFIX}${m}_subject_${s.id}`;
                        const file = await getStateImage(key);
                        loadedSubjects.push({ ...s, file });
                    }
                    restoredModes[m].subjects = loadedSubjects;
                } else if ((restoredModes[m] as any).subjectImage) {
                     // Legacy migration
                     const oldKey = `${STORAGE_KEYS.IMAGE_PREFIX}${m}_subject`;
                     const file = await getStateImage(oldKey);
                     if (file) {
                         const id = Date.now().toString();
                         restoredModes[m].subjects = [{ id, file, isActive: true }];
                     }
                }

                // Recover Reference Image
                const referenceKey = `${STORAGE_KEYS.IMAGE_PREFIX}${m}_reference`;
                const referenceFile = await getStateImage(referenceKey);
                if (referenceFile) restoredModes[m].referenceImage = referenceFile;
            }

            setModeStates(restoredModes);
        } catch (error) {
            console.error("Failed to restore app state:", error);
        } finally {
            setIsStateRestoring(false);
        }
    };

    restoreState();
  }, []);

  // 3. Persist State Watchers
  useEffect(() => {
      if (isStateRestoring) return;

      localStorage.setItem(STORAGE_KEYS.ACTIVE_MODE, mode);

      const stateToSave = { ...currentState };
      
      // Strip files and volatile generation state
      stateToSave.subjects = currentState.subjects.map(s => ({
          id: s.id,
          isActive: s.isActive,
          file: null as any
      }));

      delete (stateToSave as any).referenceImage;
      delete (stateToSave as any).generatedImage;
      delete (stateToSave as any).generatedText;
      delete (stateToSave as any).comparisonImage; 
      delete (stateToSave as any).lastParams;
      delete (stateToSave as any).hasError;
      delete (stateToSave as any).errorMessage;
      delete (stateToSave as any).isGenerating;
      delete (stateToSave as any).progress;
      delete (stateToSave as any).progressStep;
      delete (stateToSave as any).startedAt;

      // Persistence handles selectedModel via spread ...currentState

      localStorage.setItem(`${STORAGE_KEYS.MODE_STATE_PREFIX}${mode}`, JSON.stringify(stateToSave));

  }, [mode, currentState, isStateRestoring]);

  // 4. Persist Images Watchers
  useEffect(() => {
    if (isStateRestoring) return;

    const refFile = modeStates[mode].referenceImage;
    saveStateImage(`${STORAGE_KEYS.IMAGE_PREFIX}${mode}_reference`, refFile);

    const currentSubjects = modeStates[mode].subjects;
    currentSubjects.forEach(s => {
        saveStateImage(`${STORAGE_KEYS.IMAGE_PREFIX}${mode}_subject_${s.id}`, s.file);
    });

  }, [mode, modeStates, isStateRestoring]);

  // Smooth Progress Interpolation (Multi-Mode)
  useEffect(() => {
    let animationFrameId: number;
    
    const animate = () => {
      setVisualProgressMap(prev => {
         const nextMap = { ...prev };
         let changed = false;
         
         Object.values(GenerationMode).forEach(m => {
             const state = modeStates[m];
             if (state.isGenerating) {
                 const target = state.progress;
                 const current = prev[m] || 0;
                 const diff = target - current;
                 
                 if (target >= 100) {
                     nextMap[m] = 100;
                     changed = true;
                 } else if (Math.abs(diff) > 0.1) {
                     nextMap[m] = current + diff * 0.15;
                     changed = true;
                 } else if (Math.abs(diff) > 0) {
                     nextMap[m] = target;
                     changed = true;
                 }
             } else {
                 if (prev[m] !== 0 && prev[m] !== 100) {
                     nextMap[m] = 0; // Reset if not generating
                     changed = true;
                 }
             }
         });
         
         return changed ? nextMap : prev;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [modeStates]);


  // --- Resize Logic ---
  const startResizing = useCallback(() => setIsResizing(true), []);
  const stopResizing = useCallback(() => setIsResizing(false), []);

  useEffect(() => {
    if (!isResizing) return;

    const onMouseMove = (e: MouseEvent) => {
      const main = document.querySelector('main');
      const offset = main ? main.getBoundingClientRect().left : 0;
      let newWidth = e.clientX - offset;
      
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

  useEffect(() => {
    if (!isResizing) {
        localStorage.setItem(STORAGE_KEYS.SIDEBAR_WIDTH, sidebarWidth.toString());
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

  const handleResetApp = async (includeApiKey: boolean) => {
      await clearAllHistory();
      await clearAllStateImages();
      
      Object.values(STORAGE_KEYS).forEach(key => {
          localStorage.removeItem(key);
      });
      Object.values(GenerationMode).forEach(m => {
          localStorage.removeItem(`${STORAGE_KEYS.MODE_STATE_PREFIX}${m}`);
          localStorage.removeItem(`nanobanana_advanced_${m}`);
      });
      
      const ptDate = getCurrentPTDate();
      localStorage.setItem(QUOTA_KEYS.DATE, ptDate);
      localStorage.setItem(QUOTA_KEYS.COUNT, '0');
      sessionStorage.removeItem('nanobanana_session_count');

      if (includeApiKey) {
          localStorage.removeItem('gemini_api_key');
      }
      
      window.location.reload();
  };

  // --- CORE GENERATION HANDLER ---
  const handleGenerate = useCallback(async (isRetryArg: boolean | React.MouseEvent = false) => {
    const isRetry = isRetryArg === true;
    
    // Capture the mode initiating the request to ensure parallel safety
    const activeMode = mode; 
    const activeState = modeStates[activeMode];

    // Reset error state for this mode
    updateModeState(activeMode, { errorMessage: null, hasError: false });
    
    const currentImageRef = activeState.generatedImage;
    let paramsToUse: GenerateParams | PromptGenParams;

    // Validation
    const activeSubjectsWithFiles = activeState.subjects.filter(s => s.isActive && s.file !== null);

    if (!isRetry) {
        if (activeMode === GenerationMode.IMAGE_EDIT) {
             if (!activeState.textPrompt.trim() && activeSubjectsWithFiles.length === 0) {
                 const err = ERRORS.MISSING_PROMPT;
                 updateModeState(activeMode, { errorMessage: err });
                 addToast(err, 'error');
                 return; 
             }
        }
        if (activeMode === GenerationMode.IMAGE_TO_IMAGE) {
            if (activeSubjectsWithFiles.length === 0) {
                 const err = "At least one active subject with an image is required.";
                 updateModeState(activeMode, { errorMessage: err });
                 addToast(err, 'error');
                 return;
            }
            if (!activeState.referenceImage) {
                 const err = ERRORS.MISSING_REF;
                 updateModeState(activeMode, { errorMessage: err });
                 addToast(err, 'error');
                 return;
            }
        }
        if (activeMode === GenerationMode.IMG_TO_PROMPT && activeSubjectsWithFiles.length === 0) {
             const err = ERRORS.MISSING_SUBJECT;
             updateModeState(activeMode, { errorMessage: err });
             addToast(err, 'error');
             return;
        }
        if (activeMode === GenerationMode.TEXT_TO_PROMPT && !activeState.textPrompt.trim()) {
             const err = ERRORS.MISSING_PROMPT;
             updateModeState(activeMode, { errorMessage: err });
             addToast(err, 'error');
             return;
        }
    }

    // Set Generation State for specific mode
    updateModeState(activeMode, { 
        isGenerating: true, 
        progress: 0, 
        progressStep: "Initializing...",
        generatedText: null, // Clear previous text result immediately, image stays for comparison
        startedAt: Date.now() // Track when it started for ordering
    });

    const isImageGen = activeMode === GenerationMode.IMAGE_EDIT || activeMode === GenerationMode.IMAGE_TO_IMAGE;
    
    try {
      const onProgressCallback = (msg: string, val: number) => {
        // Update ONLY this mode's state
        setModeStates(prev => ({
            ...prev,
            [activeMode]: {
                ...prev[activeMode],
                progress: val,
                progressStep: msg
            }
        }));
      };

      if (isRetry && activeState.lastParams) {
          paramsToUse = { 
              ...activeState.lastParams,
              onProgress: onProgressCallback,
              apiKey: apiKey || undefined 
          } as GenerateParams | PromptGenParams;
      } else {
          if (isImageGen) {
              paramsToUse = {
                subjects: activeState.subjects,
                mode: activeMode,
                textPrompt: activeState.textPrompt,
                referenceImage: activeState.referenceImage || undefined,
                referenceOperation: activeState.refOperation,
                aspectRatio: activeState.aspectRatio,
                resolution: activeState.resolution,
                onProgress: onProgressCallback,
                apiKey: apiKey || undefined,
                refStrength: activeState.refStrength,
                negativePrompt: activeState.negativePrompt,
                modelName: activeState.selectedModel // Pass active model
              } as GenerateParams;
          } else {
              paramsToUse = {
                  mode: activeMode,
                  subjects: activeState.subjects,
                  textPrompt: activeState.textPrompt,
                  useFaceFeature: activeState.useFaceFeature,
                  onProgress: onProgressCallback,
                  apiKey: apiKey || undefined,
                  negativePrompt: activeState.negativePrompt
              } as PromptGenParams;
          }
      }

      // Save params
      const paramsForStorage = { ...paramsToUse };
      delete (paramsForStorage as any).onProgress;
      updateModeState(activeMode, { lastParams: paramsForStorage });

      if (isImageGen) {
          const imageUrl = await generateImage(paramsToUse as GenerateParams);
          
          // Complete
          updateModeState(activeMode, { progress: 100, progressStep: "Done!" });
          await new Promise(resolve => setTimeout(resolve, 300));

          // State update logic:
          setModeStates(prev => {
              return {
                  ...prev,
                  [activeMode]: {
                      ...prev[activeMode],
                      generatedImage: imageUrl,
                      comparisonImage: currentImageRef || prev[activeMode].comparisonImage,
                      isGenerating: false
                  }
              };
          });

          // Only auto-switch if this was the last interacted mode or we want to force attention
          setMode(activeMode); 
          
          // Quota Update - Only for Pro Model
          if (activeState.selectedModel === MODELS.PRO) {
              const currentPTDate = getCurrentPTDate();
              const lastResetDate = localStorage.getItem(QUOTA_KEYS.DATE);
              
              let currentBase = 0;
              if (lastResetDate !== currentPTDate) {
                  currentBase = 0;
                  localStorage.setItem(QUOTA_KEYS.DATE, currentPTDate);
              } else {
                  currentBase = parseInt(localStorage.getItem(QUOTA_KEYS.COUNT) || '0', 10);
              }

              const newVal = currentBase + 1;
              localStorage.setItem(QUOTA_KEYS.COUNT, newVal.toString());
              setDailyImageCount(newVal);
          }
          
          const newHistoryItem: GeneratedImage = {
            type: 'image',
            id: Date.now().toString(),
            url: imageUrl,
            timestamp: Date.now(),
            prompt: activeState.textPrompt || "Reference based generation",
            metadata: {
              mode: activeMode,
              textPrompt: activeState.textPrompt,
              aspectRatio: activeState.aspectRatio,
              resolution: activeState.resolution,
              referenceOperation: activeState.refOperation,
              refStrength: activeState.refStrength,
              negativePrompt: activeState.negativePrompt,
              model: activeState.selectedModel
            }
          };
          
          await saveHistoryItem(newHistoryItem);
          setHistory(prev => [newHistoryItem, ...prev]);
          addToast("Image generated successfully", 'success');

      } else {
          const promptText = await generatePrompt(paramsToUse as PromptGenParams);

          updateModeState(activeMode, { progress: 100, progressStep: "Done!" });
          await new Promise(resolve => setTimeout(resolve, 300));

          setMode(activeMode);

          updateModeState(activeMode, { 
              generatedText: promptText, 
              isGenerating: false,
              comparisonImage: null // No image comparison for text modes
          });
          
          const newHistoryItem: GeneratedText = {
            type: 'text',
            id: Date.now().toString(),
            text: promptText,
            timestamp: Date.now(),
            sourcePrompt: activeState.textPrompt || "Image analysis",
            metadata: {
              mode: activeMode,
              textPrompt: activeState.textPrompt,
              useFaceFeature: activeState.useFaceFeature,
              negativePrompt: activeState.negativePrompt
            }
          };
          
          await saveHistoryItem(newHistoryItem);
          setHistory(prev => [newHistoryItem, ...prev]);
          addToast("Prompt generated successfully", 'success');
      }
      
      updateModeState(activeMode, { hasError: false, errorMessage: null });

    } catch (err: any) {
      const msg = err.message || ERRORS.GENERIC;
      if (msg === ERRORS.AUTH_FAILED || msg === ERRORS.MISSING_KEY) {
        setHasKey(false);
        if (!apiKey && !(window as any).aistudio) {
            setShowKeySettings(true);
        }
      }
      updateModeState(activeMode, { 
          hasError: true, 
          errorMessage: msg,
          isGenerating: false,
          progress: 0 
      });
      addToast(msg, 'error');
    }
  }, [mode, modeStates, apiKey, dailyImageCount]); 

  const handleRetry = () => handleGenerate(true);

  // Keyboard Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (!currentState.isGenerating && !showKeySettings && !showGuide && !showGallery && !showResetModal) {
          e.preventDefault();
          handleGenerate();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGenerate, currentState.isGenerating, showKeySettings, showGuide, showGallery, showResetModal]);

  // --- HISTORY HANDLER ---
  const handleHistorySelect = (item: HistoryItem) => {
      // 1. Identify Target Mode
      const targetMode = item.metadata?.mode || GenerationMode.IMAGE_EDIT;
      
      // 2. Update Target Mode State with Content & Clear Comparison
      setModeStates(prev => ({
          ...prev,
          [targetMode]: {
              ...prev[targetMode],
              generatedImage: item.type === 'image' ? item.url : null,
              generatedText: item.type === 'text' ? item.text : null,
              comparisonImage: null // Clean slate on history load
          }
      }));

      // 3. Switch Mode
      setMode(targetMode);
      setShowGallery(false);
  };

  const handleDeleteHistoryItem = async (e: React.MouseEvent | null, itemId: string) => {
    if (e) e.stopPropagation();
    
    // Find item to check if it's currently displayed
    const itemToDelete = history.find(item => item.id === itemId);
    if (!itemToDelete) return;

    // Check if displayed in ANY mode, clear if so
    const impactedMode = itemToDelete.metadata?.mode;
    if (impactedMode) {
        const state = modeStates[impactedMode];
        const isDisplayed = 
            (itemToDelete.type === 'image' && itemToDelete.url === state.generatedImage) ||
            (itemToDelete.type === 'text' && itemToDelete.text === state.generatedText);
        
        if (isDisplayed) {
            updateModeState(impactedMode, { generatedImage: null, generatedText: null, comparisonImage: null });
        }
    }

    try {
      await deleteHistoryItem(itemId);
      setHistory(prev => prev.filter(item => item.id !== itemId));
      addToast('Item deleted', 'success');
    } catch (err) {
      addToast('Failed to delete item', 'error');
    }
  };

  const handleDeleteHistoryItems = async (ids: string[]) => {
      for (const id of ids) {
          await deleteHistoryItem(id);
      }
      
      const deletedSet = new Set(ids);
      const remainingHistory = history.filter(item => !deletedSet.has(item.id));
      setHistory(remainingHistory);
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
      updateModeState(GenerationMode.IMAGE_EDIT, { textPrompt: currentState.generatedText });
      handleSetMode(GenerationMode.IMAGE_EDIT);
      addToast('Prompt sent to Image Edit', 'success');
    }
  };

  const handleUseAsSubject = (url: string) => {
    if (currentState.subjects.length >= 5) {
        addToast('Max 5 subjects allowed. Remove one to add new.', 'warning');
        return;
    }
    const file = dataURLtoFile(url, 'generated-subject.png');
    const newSubject: SubjectItem = {
        id: Date.now().toString(),
        file: file,
        isActive: true
    };
    updateCurrentState({ subjects: [...currentState.subjects, newSubject] });
    addToast('Image added to Subjects', 'success');
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

      <ResetModal 
        isOpen={showResetModal}
        onClose={() => setShowResetModal(false)}
        onConfirm={handleResetApp}
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
        setMode={handleSetMode}
        showGuide={showGuide}
        setShowGuide={setShowGuide}
        hasKey={hasKey}
        handleKeyClick={handleKeyClick}
        onResetClick={() => setShowResetModal(true)}
        activeModel={currentState.selectedModel}
      />

      <main className="flex-1 flex overflow-hidden max-w-[1800px] mx-auto w-full relative">
        <Sidebar 
          mode={mode}
          currentState={currentState}
          updateCurrentState={updateCurrentState}
          isGenerating={currentState.isGenerating}
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
          activeGenerations={activeGenerations}
          history={history}
          handleHistorySelect={handleHistorySelect}
          handleDownload={handleDownload}
          handleUseAsSubject={handleUseAsSubject}
          handleSendToImageEdit={handleSendToImageEdit}
          handleCopyText={handleCopyText}
          dailyImageCount={dailyImageCount}
          onOpenGallery={() => setShowGallery(true)}
          isHistoryLoading={isHistoryLoading}
          isGalleryOpen={showGallery}
          isModalOpen={showGuide || showKeySettings || showResetModal}
          onDeleteCurrent={(id) => handleDeleteHistoryItem(null, id)}
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
