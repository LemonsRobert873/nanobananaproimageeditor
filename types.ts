

export enum GenerationMode {
  IMAGE_EDIT = 'IMAGE_EDIT',            // Formerly Text Prompt
  IMAGE_TO_IMAGE = 'IMAGE_TO_IMAGE',    // Formerly Image Reference
  IMG_TO_PROMPT = 'IMG_TO_PROMPT',      // NEW
  TEXT_TO_PROMPT = 'TEXT_TO_PROMPT'     // NEW
}

export enum ReferenceOperation {
  APPLY_CLOTHING = 'APPLY_CLOTHING',
  REPLACE_FACE = 'REPLACE_FACE',
  REPLICATE_REFERENCE = 'REPLICATE_REFERENCE'
}

export enum AspectRatio {
  SQUARE = '1:1',
  PORTRAIT_3_4 = '3:4',
  LANDSCAPE_4_3 = '4:3',
  PORTRAIT_9_16 = '9:16',
  LANDSCAPE_16_9 = '16:9'
}

export enum Resolution {
  RES_1K = '1K',
  RES_2K = '2K',
  RES_4K = '4K'
}

export interface HistoryItemMetadata {
  mode: GenerationMode;
  aspectRatio?: AspectRatio;
  resolution?: Resolution;
  referenceOperation?: ReferenceOperation;
  useFaceFeature?: boolean;
  textPrompt?: string;
  refStrength?: number;
  negativePrompt?: string;
  model?: string;
  duration?: number;
}

export interface GeneratedImage {
  type: 'image';
  id: string;
  url: string;
  timestamp: number;
  prompt: string;
  metadata?: HistoryItemMetadata;
}

export interface GeneratedText {
  type: 'text';
  id: string;
  text: string;
  timestamp: number;
  sourcePrompt: string;
  metadata?: HistoryItemMetadata;
}

export type HistoryItem = GeneratedImage | GeneratedText;

export interface SubjectItem {
  id: string;
  file: File | null;
  isActive: boolean;
}

export interface GenerateParams {
  subjects: SubjectItem[];
  mode: GenerationMode;
  textPrompt: string;
  referenceImage?: File;
  referenceOperation?: ReferenceOperation;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  onProgress?: (message: string, progress: number) => void;
  apiKey?: string;
  refStrength?: number;
  negativePrompt?: string;
  modelName: string;
}

export interface PromptGenParams {
  mode: GenerationMode;
  subjects: SubjectItem[]; // Replaces subjectImage
  textPrompt: string;  
  useFaceFeature: boolean;
  onProgress?: (message: string, progress: number) => void;
  apiKey?: string;
  negativePrompt?: string;
}

export interface GenerationJob {
  id: string;
  status: 'queued' | 'processing';
  params: Omit<GenerateParams, 'onProgress'> | Omit<PromptGenParams, 'onProgress'>;
  progress: number;
  progressStep: string;
  startedAt?: number;
  createdAt: number;
}

export interface ModeState {
  subjects: SubjectItem[];
  textPrompt: string;
  referenceImage: File | null;
  generatedImage: string | null;
  generatedText: string | null;
  useFaceFeature: boolean;
  refOperation: ReferenceOperation;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  isRefLowRes: boolean;
  refStrength: number;
  negativePrompt: string;
  selectedModel: string;
  // Retry State
  lastParams: Omit<GenerateParams, 'onProgress'> | Omit<PromptGenParams, 'onProgress'> | null;
  hasError: boolean;
  errorMessage: string | null;
  // Queue System
  queue: GenerationJob[];
}

export interface ActiveGeneration {
    id: string;
    mode: GenerationMode;
    status: 'queued' | 'processing';
    progress: number;
    step: string;
    startedAt: number;
    model?: string;
    createdAt: number;
}

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

export interface ToastContextType {
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
}