import React, { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Canvas from './components/Canvas';
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
  ActiveGeneration,
  GenerationJob
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

// Lazy Load Heavy Modals
const KeySettings = lazy(() => import('./components/KeySettings'));
const GuideModal = lazy(() => import('./components/GuideModal'));
const ResetModal = lazy(() => import('./components/ResetModal'));
const GalleryModal = lazy(() => import('./components/GalleryModal'));

// Default state template for a mode
const DEFAULT_MODE_STATE: ModeState = {
  subjects: [],
  textPrompt: '',
  referenceImage: null,
  generatedImage: null,
  generatedText: null,
  activeHistoryId: null,
  useFaceFeature: true,
  refOperation: ReferenceOperation.APPLY_CLOTHING,
  aspectRatio: AspectRatio.PORTRAIT_9_16,
  resolution: Resolution.RES_1K,
  isRefLowRes: false,
  refStrength: 100,
  negativePrompt: '',
  selectedModel: MODELS.PRO, // Default to Pro
  // Template Versions Defaults
  templateVersionImageToText: 'V2',
  templateVersionTextPrompt: 'V2',
  templateVersionReplicateReference: 'V2',
  lastParams: null,
  hasError: false,
  errorMessage: null,
  // Queue System
  queue: []
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
  
  // Lazy load trackers to prevent fetching until needed
  const [modalsLoaded, setModalsLoaded] = useState({
    key: false,
    guide: false,
    reset: false,
    gallery: false
  });

  // Load tracker effects
  useEffect(() => { if(showKeySettings) setModalsLoaded(p => ({...p, key: true})); }, [showKeySettings]);
  useEffect(() => { if(showGuide) setModalsLoaded(p => ({...p, guide: true})); }, [showGuide]);
  useEffect(() => { if(showResetModal) setModalsLoaded(p => ({...p, reset: true})); }, [showResetModal]);
  useEffect(() => { if(showGallery) setModalsLoaded(p => ({...p, gallery: true})); }, [showGallery]);

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

  // Track currently processing jobs to prevent double-execution in effect
  const processingJobIdsRef = useRef<Set<string>>(new Set());
  // Track cancelled jobs to ignore results
  const cancelledJobIdsRef = useRef<Set<string>>(new Set());

  // State for Smooth Visual Progress (mapped by mode)
  const [visualProgressMap, setVisualProgressMap] = useState<Record<GenerationMode, number>>({
      [GenerationMode.IMAGE_EDIT]: 0,
      [GenerationMode.IMAGE_TO_IMAGE]: 0,
      [GenerationMode.IMG_TO_PROMPT]: 0,
      [GenerationMode.TEXT_TO_PROMPT]: 0,
  });

  // Derived: Active Generations for Global Progress Display
  const activeGenerations: ActiveGeneration[] = (Object.entries(modeStates) as [GenerationMode, ModeState][])
    .flatMap(([m, state]) => 
        state.queue.map(j => ({
            id: j.id,
            mode: m,
            status: j.status,
            // Use visual progress if processing, otherwise 0
            progress: j.status === 'processing' ? (visualProgressMap[m] || j.progress) : 0,
            step: j.status === 'processing' ? j.progressStep : 'Waiting in queue...',
            startedAt: j.startedAt || j.createdAt, // For timer
            createdAt: j.createdAt, // For stable sorting
            model: (j.params as any).modelName // Hacky cast, but safe in context
        }))
    )
    .sort((a, b) => b.createdAt - a.createdAt);

  // Helper to get current mode data
  const currentState = modeStates[mode];

  // --- Theme Logic ---
  const isImageMode = mode === GenerationMode.IMAGE_EDIT || mode === GenerationMode.IMAGE_TO_IMAGE;
  const isProTheme = isImageMode && currentState.selectedModel === MODELS.PRO;

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

  // Safe mode switching
  const handleSetMode = (newMode: GenerationMode) => {
    if (newMode !== mode) {
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
      } catch (e) {
        console.error(e)
      }

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
                        // Merge parsed data into default state, ensure queue is empty (do not resume stuck jobs)
                        restoredModes[m] = { 
                            ...restoredModes[m], 
                            ...parsed,
                            selectedModel: parsed.selectedModel || MODELS.PRO, // Restore model
                            // Ensure template versions are restored or default to V2
                            templateVersionImageToText: parsed.templateVersionImageToText || 'V2',
                            templateVersionTextPrompt: parsed.templateVersionTextPrompt || 'V2',
                            templateVersionReplicateReference: parsed.templateVersionReplicateReference || 'V2',
                            queue: [] // Reset queue
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
      
      // Strip files and volatile queue state
      stateToSave.subjects = currentState.subjects.map(s => ({
          id: s.id,
          isActive: s.isActive,
          file: null as any
      }));

      delete (stateToSave as any).referenceImage;
      delete (stateToSave as any).generatedImage;
      delete (stateToSave as any).generatedText;
      delete (stateToSave as any).activeHistoryId;
      delete (stateToSave as any).lastParams;
      delete (stateToSave as any).hasError;
      delete (stateToSave as any).errorMessage;
      delete (stateToSave as any).queue; // Never persist the queue

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
             // Find active job progress
             const activeJob = state.queue.find(j => j.status === 'processing');
             
             if (activeJob) {
                 const target = activeJob.progress;
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
  
  // --- DRAG TO SWITCH MODE HANDLER ---
  const handleTabDrop = async (e: React.DragEvent, targetMode: GenerationMode) => {
      e.preventDefault();
      
      // 1. Switch Mode immediately
      if (mode !== targetMode) {
          setMode(targetMode);
      }

      // 2. Extract File
      let file: File | null = null;
      const internalUrl = e.dataTransfer.getData('application/x-nanobanana-image');
      
      if (internalUrl) {
           file = dataURLtoFile(internalUrl, `dropped-tab-${Date.now()}.png`);
      } else if (e.dataTransfer.files && e.dataTransfer.files[0]) {
           file = e.dataTransfer.files[0];
      }

      // If no file (just hover switch without drop, or invalid drag), we are done.
      if (!file || !file.type.startsWith('image/')) return;
      
      // 3. Update Target Mode State with "Default" logic
      // We use setModeStates function update to ensure we have latest state
      setModeStates(prev => {
          const state = prev[targetMode];
          const updates: Partial<ModeState> = {};
          let message = "";
          
          if (targetMode === GenerationMode.IMAGE_EDIT) {
               if (state.subjects.length < 5) {
                   const newSub = { id: Date.now().toString(), file, isActive: true };
                   updates.subjects = [...state.subjects, newSub];
                   message = "Image added to Subjects";
               } else {
                   addToast("Max 5 subjects allowed", 'warning');
                   return prev; // No changes
               }
          } else if (targetMode === GenerationMode.IMAGE_TO_IMAGE) {
               // Async check for resolution would require side effect.
               // For drag-to-switch speed, we just set the file.
               // Check resolution asynchronously:
               const img = new Image();
               img.onload = () => {
                   const isLow = img.width < 512 || img.height < 512;
                   updateModeState(targetMode, { isRefLowRes: isLow });
                   URL.revokeObjectURL(img.src);
               };
               img.src = URL.createObjectURL(file);
               
               updates.referenceImage = file;
               message = "Image set as Reference";

          } else if (targetMode === GenerationMode.IMG_TO_PROMPT) {
               const newSub = { id: '0', file, isActive: true };
               updates.subjects = [newSub];
               message = "Image set as Source";
          } else {
               addToast("This mode does not accept images", 'info');
               return prev;
          }

          if (message) addToast(message, 'success');

          return {
              ...prev,
              [targetMode]: { ...state, ...updates }
          };
      });
  };

  // --- JOB CANCELLATION HANDLER ---
  const handleCancelJob = (mode: GenerationMode, jobId: string) => {
    // 1. Mark as cancelled so processJob knows to ignore result
    cancelledJobIdsRef.current.add(jobId);

    // 2. Remove from queue immediately (UI update)
    setModeStates(prev => {
        const queue = prev[mode].queue.filter(j => j.id !== jobId);
        return { ...prev, [mode]: { ...prev[mode], queue } };
    });
    
    // Mode label helper
    const modeLabel = mode === GenerationMode.IMAGE_EDIT ? "Image Edit" : 
                      mode === GenerationMode.IMAGE_TO_IMAGE ? "Image to Image" :
                      mode === GenerationMode.IMG_TO_PROMPT ? "Image to Prompt" : "Text Prompt";
                      
    addToast(`${modeLabel} generation cancelled`, 'info');
  };

  // --- JOB PROCESSING LOGIC ---
  const processJob = useCallback(async (mode: GenerationMode, job: GenerationJob) => {
      if (processingJobIdsRef.current.has(job.id)) return;
      processingJobIdsRef.current.add(job.id);

      // Check cancellation before starting
      if (cancelledJobIdsRef.current.has(job.id)) {
          cancelledJobIdsRef.current.delete(job.id);
          processingJobIdsRef.current.delete(job.id);
          return;
      }

      const startTime = Date.now();

      // 1. Update status to processing
      setModeStates(prev => {
          // Double check if job still exists in queue
          const exists = prev[mode].queue.some(j => j.id === job.id);
          if (!exists) return prev;

          const queue = prev[mode].queue.map(j => 
            j.id === job.id ? { ...j, status: 'processing' as const, startedAt: startTime } : j
          );
          return { ...prev, [mode]: { ...prev[mode], queue } };
      });

      const isImageGen = mode === GenerationMode.IMAGE_EDIT || mode === GenerationMode.IMAGE_TO_IMAGE;
      
      try {
          const onProgressCallback = (msg: string, val: number) => {
             // If job removed from queue (cancelled), this state update effectively does nothing relevant
             setModeStates(prev => {
                const queue = prev[mode].queue.map(j => 
                    j.id === job.id ? { ...j, progress: val, progressStep: msg } : j
                );
                return { ...prev, [mode]: { ...prev[mode], queue } };
             });
          };

          const paramsToUse = { 
              ...job.params,
              onProgress: onProgressCallback,
              apiKey: apiKey || undefined 
          } as GenerateParams | PromptGenParams;

          if (isImageGen) {
              const imageUrl = await generateImage(paramsToUse as GenerateParams);

              // Check Cancellation
              if (cancelledJobIdsRef.current.has(job.id)) {
                  cancelledJobIdsRef.current.delete(job.id);
                  return;
              }

              const duration = Date.now() - startTime;
              const newItemId = Date.now().toString();

              // Complete 100%
              setModeStates(prev => {
                  const queue = prev[mode].queue.map(j => 
                      j.id === job.id ? { ...j, progress: 100, progressStep: "Done!" } : j
                  );
                  return { ...prev, [mode]: { ...prev[mode], queue } };
              });
              
              await new Promise(resolve => setTimeout(resolve, 300));

              // Quota Update - Only for Pro Model (accessing params directly safely here)
              if ((job.params as GenerateParams).modelName === MODELS.PRO) {
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
                id: newItemId,
                url: imageUrl,
                timestamp: Date.now(),
                prompt: (job.params as GenerateParams).textPrompt || "Reference based generation",
                metadata: {
                  mode: mode,
                  textPrompt: (job.params as GenerateParams).textPrompt,
                  aspectRatio: (job.params as GenerateParams).aspectRatio,
                  resolution: (job.params as GenerateParams).resolution,
                  referenceOperation: mode === GenerationMode.IMAGE_TO_IMAGE ? (job.params as GenerateParams).referenceOperation : undefined,
                  refStrength: mode === GenerationMode.IMAGE_TO_IMAGE ? (job.params as GenerateParams).refStrength : undefined,
                  negativePrompt: (job.params as GenerateParams).negativePrompt,
                  model: (job.params as GenerateParams).modelName,
                  duration: duration,
                  templateVersion: (job.params as GenerateParams).templateVersion // Store version used
                }
              };
              
              await saveHistoryItem(newHistoryItem);
              setHistory(prev => [newHistoryItem, ...prev]);

              // Update Mode State with new image and active ID
              setModeStates(prev => ({
                  ...prev,
                  [mode]: {
                      ...prev[mode],
                      generatedImage: imageUrl,
                      activeHistoryId: newItemId,
                      queue: prev[mode].queue.filter(j => j.id !== job.id)
                  }
              }));

              addToast("Image generated successfully", 'success');

          } else {
              const promptText = await generatePrompt(paramsToUse as PromptGenParams);

              // Check Cancellation
              if (cancelledJobIdsRef.current.has(job.id)) {
                  cancelledJobIdsRef.current.delete(job.id);
                  return;
              }

              const duration = Date.now() - startTime;
              const newItemId = Date.now().toString();

              setModeStates(prev => {
                  const queue = prev[mode].queue.map(j => 
                      j.id === job.id ? { ...j, progress: 100, progressStep: "Done!" } : j
                  );
                  return { ...prev, [mode]: { ...prev[mode], queue } };
              });

              await new Promise(resolve => setTimeout(resolve, 300));

              const newHistoryItem: GeneratedText = {
                type: 'text',
                id: newItemId,
                text: promptText,
                timestamp: Date.now(),
                sourcePrompt: (job.params as PromptGenParams).textPrompt || "Image analysis",
                metadata: {
                  mode: mode,
                  textPrompt: (job.params as PromptGenParams).textPrompt,
                  useFaceFeature: (job.params as PromptGenParams).useFaceFeature,
                  negativePrompt: (job.params as PromptGenParams).negativePrompt,
                  duration: duration,
                  templateVersion: (job.params as PromptGenParams).templateVersion // Store version
                }
              };
              
              await saveHistoryItem(newHistoryItem);
              setHistory(prev => [newHistoryItem, ...prev]);

              setModeStates(prev => ({
                  ...prev,
                  [mode]: {
                      ...prev[mode],
                      generatedText: promptText,
                      activeHistoryId: newItemId,
                      queue: prev[mode].queue.filter(j => j.id !== job.id)
                  }
              }));
              
              addToast("Prompt generated successfully", 'success');
          }
          
          updateModeState(mode, { hasError: false, errorMessage: null });

      } catch (err: any) {
          // Check cancellation in error block
          if (cancelledJobIdsRef.current.has(job.id)) {
             cancelledJobIdsRef.current.delete(job.id);
             return;
          }

          const msg = err.message || ERRORS.GENERIC;
          if (msg === ERRORS.AUTH_FAILED || msg === ERRORS.MISSING_KEY) {
            setHasKey(false);
            if (!apiKey && !(window as any).aistudio) {
                setShowKeySettings(true);
            }
          }
          // Remove faulty job and set error
          setModeStates(prev => ({ 
              ...prev, 
              [mode]: { 
                  ...prev[mode], 
                  queue: prev[mode].queue.filter(j => j.id !== job.id),
                  hasError: true, 
                  errorMessage: msg
              } 
          }));
          addToast(msg, 'error');
      } finally {
          processingJobIdsRef.current.delete(job.id);
      }
  }, [apiKey]);

  // Queue Watcher Effect
  useEffect(() => {
     Object.values(GenerationMode).forEach(modeVal => {
         const m = modeVal as GenerationMode;
         const state = modeStates[m];
         
         if (state.queue.length > 0) {
             const head = state.queue[0];
             // If head is queued, start it. If processing, do nothing (wait).
             // We only allow 1 active per mode for now.
             if (head.status === 'queued') {
                 processJob(m, head);
             }
         }
     });
  }, [modeStates, processJob]);


  // --- CORE GENERATION HANDLER ---
  const handleGenerate = useCallback(async (isRetryArg: boolean | React.MouseEvent = false) => {
    const isRetry = isRetryArg === true;
    
    // Capture the mode initiating the request to ensure parallel safety
    const activeMode = mode; 
    const activeState = modeStates[activeMode];

    // Reset error state for this mode only if not already processing something else?
    // Actually better to clear error when user acts
    updateModeState(activeMode, { errorMessage: null, hasError: false });
    
    let paramsToUse: Omit<GenerateParams, 'onProgress'> | Omit<PromptGenParams, 'onProgress'>;

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
            // Check specific operation
            const isReplicate = activeState.refOperation === ReferenceOperation.REPLICATE_REFERENCE;

            if (activeSubjectsWithFiles.length === 0 && !isReplicate) {
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

    const isImageGen = activeMode === GenerationMode.IMAGE_EDIT || activeMode === GenerationMode.IMAGE_TO_IMAGE;
    
    if (isRetry && activeState.lastParams) {
          paramsToUse = { ...activeState.lastParams };
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
                apiKey: apiKey || undefined,
                refStrength: activeState.refStrength,
                negativePrompt: activeState.negativePrompt,
                modelName: activeState.selectedModel, // Pass active model
                // Pass template version for replicate reference
                templateVersion: activeMode === GenerationMode.IMAGE_TO_IMAGE 
                    ? activeState.templateVersionReplicateReference 
                    : undefined 
              };
          } else {
              // Determine template version based on mode
              let tVersion = activeState.templateVersionTextPrompt;
              if (activeMode === GenerationMode.IMG_TO_PROMPT) {
                  tVersion = activeState.templateVersionImageToText;
              }

              paramsToUse = {
                  mode: activeMode,
                  subjects: activeState.subjects,
                  textPrompt: activeState.textPrompt,
                  useFaceFeature: activeState.useFaceFeature,
                  apiKey: apiKey || undefined,
                  negativePrompt: activeState.negativePrompt,
                  templateVersion: tVersion
              };
          }
    }

    // Save params for retry
    updateModeState(activeMode, { lastParams: paramsToUse });
    
    // Create Job
    const newJob: GenerationJob = {
        id: Date.now().toString() + Math.random().toString(),
        status: 'queued',
        params: paramsToUse,
        progress: 0,
        progressStep: "Waiting in queue...",
        createdAt: Date.now()
    };

    // Add to Queue
    setModeStates(prev => ({
        ...prev,
        [activeMode]: {
            ...prev[activeMode],
            queue: [...prev[activeMode].queue, newJob],
        }
    }));

  }, [mode, modeStates, apiKey]); 

  const handleRetry = () => handleGenerate(true);

  // Keyboard Shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        if (!showKeySettings && !showGuide && !showGallery && !showResetModal) {
          e.preventDefault();
          handleGenerate();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGenerate, showKeySettings, showGuide, showGallery, showResetModal]);

  // --- HISTORY HANDLER ---
  const handleHistorySelect = (item: HistoryItem) => {
      // 1. Identify Target Mode
      const targetMode = item.metadata?.mode || GenerationMode.IMAGE_EDIT;
      
      // 2. Update Target Mode State with Content
      setModeStates(prev => ({
          ...prev,
          [targetMode]: {
              ...prev[targetMode],
              generatedImage: item.type === 'image' ? item.url : null,
              generatedText: item.type === 'text' ? item.text : null,
              activeHistoryId: item.id
          }
      }));

      // 3. Switch Mode
      setMode(targetMode);
      setShowGallery(false);
  };

  const handleDeleteHistoryItem = async (e: React.MouseEvent | null, itemId: string) => {
    if (e) e.stopPropagation();
    
    // 1. Identify item
    const itemToDelete = history.find(item => item.id === itemId);
    if (!itemToDelete) return;

    // 2. Optimistically update history
    const newHistory = history.filter(item => item.id !== itemId);
    setHistory(newHistory);

    // 3. Handle Fallback Logic
    const targetMode = itemToDelete.metadata?.mode;
    if (targetMode) {
        const state = modeStates[targetMode];
        // Check if the deleted item was actively selected for this mode
        if (state.activeHistoryId === itemId) {
            // Find the most recent remaining item for this mode
            const fallbackItem = newHistory.find(item => item.metadata?.mode === targetMode);
            
            if (fallbackItem) {
                // Switch to fallback
                updateModeState(targetMode, { 
                    generatedImage: fallbackItem.type === 'image' ? fallbackItem.url : null, 
                    generatedText: fallbackItem.type === 'text' ? fallbackItem.text : null,
                    activeHistoryId: fallbackItem.id
                });
            } else {
                // No items left, clear canvas
                updateModeState(targetMode, { 
                    generatedImage: null, 
                    generatedText: null,
                    activeHistoryId: null
                });
            }
        }
    }

    // 4. Persistence
    try {
      await deleteHistoryItem(itemId);
      addToast('Item deleted', 'success');
    } catch (err) {
      addToast('Failed to delete item', 'error');
    }
  };

  const handleDeleteHistoryItems = async (ids: string[]) => {
      const deletedSet = new Set(ids);

      // 1. Determine affected modes before filtering
      const affectedModes = new Set<GenerationMode>();
      (Object.entries(modeStates) as [GenerationMode, ModeState][]).forEach(([m, s]) => {
          // Check if active item is being deleted
          if (s.activeHistoryId && deletedSet.has(s.activeHistoryId)) {
              affectedModes.add(m);
          }
      });

      // 2. Optimistic Update
      const newHistory = history.filter(item => !deletedSet.has(item.id));
      setHistory(newHistory);

      // 3. Apply Fallbacks for Affected Modes
      affectedModes.forEach(mode => {
          const fallback = newHistory.find(item => item.metadata?.mode === mode);
          if (fallback) {
              updateModeState(mode, {
                  generatedImage: fallback.type === 'image' ? fallback.url : null,
                  generatedText: fallback.type === 'text' ? fallback.text : null,
                  activeHistoryId: fallback.id
              });
          } else {
              updateModeState(mode, { 
                  generatedImage: null, 
                  generatedText: null,
                  activeHistoryId: null
              });
          }
      });

      // 4. Persistence
      for (const id of ids) {
          await deleteHistoryItem(id);
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
      updateModeState(GenerationMode.IMAGE_EDIT, { textPrompt: currentState.generatedText });
      handleSetMode(GenerationMode.IMAGE_EDIT);
      addToast('Prompt sent to Image Edit', 'success');
    }
  };

  const handleSendPromptToMode = (text: string, targetMode: GenerationMode) => {
      updateModeState(targetMode, { textPrompt: text });
      handleSetMode(targetMode);
      const label = targetMode === GenerationMode.IMAGE_EDIT ? 'Image Edit' : 'Image → Image';
      addToast(`Prompt sent to ${label}`, 'success');
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
      <Suspense fallback={null}>
         {modalsLoaded.key && <KeySettings 
            isOpen={showKeySettings} 
            onClose={() => setShowKeySettings(false)} 
            onSave={handleSaveKey}
            currentKey={apiKey}
            isProTheme={isProTheme}
          />}
          
          {modalsLoaded.guide && <GuideModal 
            isOpen={showGuide}
            onClose={() => setShowGuide(false)}
            isProTheme={isProTheme}
          />}

          {modalsLoaded.reset && <ResetModal 
            isOpen={showResetModal}
            onClose={() => setShowResetModal(false)}
            onConfirm={handleResetApp}
            isProTheme={isProTheme}
          />}

          {modalsLoaded.gallery && <GalleryModal
            isOpen={showGallery}
            onClose={() => setShowGallery(false)}
            history={history}
            onDeleteItems={handleDeleteHistoryItems}
            onDownloadImage={(url) => handleDownload(url)}
            onSendPromptToMode={handleSendPromptToMode}
            isProTheme={isProTheme}
          />}
      </Suspense>
      
      <Header 
        mode={mode}
        setMode={handleSetMode}
        showGuide={showGuide}
        setShowGuide={setShowGuide}
        hasKey={hasKey}
        handleKeyClick={handleKeyClick}
        onResetClick={() => setShowResetModal(true)}
        activeModel={currentState.selectedModel}
        isProTheme={isProTheme}
        onTabDrop={handleTabDrop}
      />

      <main className="flex-1 flex overflow-hidden max-w-[1800px] mx-auto w-full relative">
        <Sidebar 
          mode={mode}
          currentState={currentState}
          updateCurrentState={updateCurrentState}
          queueCount={currentState.queue.length}
          handleGenerate={handleGenerate}
          handleRetry={handleRetry}
          error={currentState.errorMessage}
          width={sidebarWidth}
          isProTheme={isProTheme}
        />
        
        <div 
          className={`w-1.5 -ml-[3px] z-50 cursor-col-resize flex-none transition-colors hover:bg-yellow-500 active:bg-yellow-500 ${isResizing ? (isProTheme ? 'bg-yellow-500' : 'bg-cyan-500') : 'bg-transparent'}`}
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
          onSendPromptToMode={handleSendPromptToMode}
          isProTheme={isProTheme}
          onCancelJob={handleCancelJob}
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