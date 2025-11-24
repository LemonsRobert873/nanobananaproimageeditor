

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

export interface GenerateParams {
  subjectImage?: File;
  mode: GenerationMode;
  textPrompt: string;
  referenceImage?: File;
  referenceOperation?: ReferenceOperation;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  onProgress?: (message: string, progress: number) => void;
  apiKey?: string;
}

export interface PromptGenParams {
  mode: GenerationMode;
  subjectImage?: File; // Required for IMG_TO_PROMPT
  textPrompt: string;  // Required for TEXT_TO_PROMPT, optional for IMG_TO_PROMPT
  useFaceFeature: boolean;
  onProgress?: (message: string, progress: number) => void;
  apiKey?: string;
}

export interface ModeState {
  subjectImage: File | null;
  textPrompt: string;
  referenceImage: File | null;
  generatedImage: string | null;
  generatedText: string | null;
  comparisonImage: string | null;
  useFaceFeature: boolean;
  refOperation: ReferenceOperation;
  aspectRatio: AspectRatio;
  resolution: Resolution;
  isRefLowRes: boolean;
}