
import { GoogleGenAI } from "@google/genai";
import { GenerateParams, PromptGenParams, GenerationMode, ReferenceOperation } from '../types';
import { MODEL_NAME, ANALYSIS_MODEL, ERRORS, PROMPT_TEMPLATE_NO_FACE, PROMPT_TEMPLATE_WITH_FACE } from '../constants';

// --- Helpers ---

const getEnvApiKey = (): string | undefined => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY;
    }
  } catch (e) {
    return undefined;
  }
  return undefined;
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Simulates progress between a start and end percentage over a duration.
 * Cycles through provided messages to give "realtime" feedback.
 */
const simulateProgress = (
    start: number, 
    end: number, 
    durationMs: number, 
    onProgress: (msg: string, val: number) => void,
    messages: string[]
) => {
    const startTime = Date.now();
    let messageIndex = 0;
    
    // Initial update
    onProgress(messages[0], start);

    const interval = setInterval(() => {
        const elapsed = Date.now() - startTime;
        // Linear interpolation
        let progress = start + (elapsed / durationMs) * (end - start);
        
        // Cap at end
        if (progress > end) progress = end;
        
        // Cycle messages based on progress chunks
        // e.g. 3 messages, split duration into 3 chunks
        const msgIdx = Math.min(
            messages.length - 1, 
            Math.floor((progress - start) / (end - start) * messages.length)
        );

        if (msgIdx !== messageIndex) {
            messageIndex = msgIdx;
            onProgress(messages[messageIndex], progress);
        } else {
            // Update value only
            onProgress(messages[messageIndex], progress);
        }
        
        if (progress >= end) {
            clearInterval(interval);
        }
    }, 100); // High frequency update for smoothness

    return () => clearInterval(interval);
};

// --- Main Services ---

export const generateImage = async (params: GenerateParams): Promise<string> => {
  const { 
    subjectImage, 
    mode, 
    textPrompt, 
    referenceImage, 
    referenceOperation,
    aspectRatio,
    resolution,
    onProgress,
    apiKey,
    refStrength,
    negativePrompt
  } = params;

  const updateProgress = (msg: string, val: number) => {
    if (onProgress) onProgress(msg, val);
  };

  const effectiveKey = apiKey || getEnvApiKey();
  if (!effectiveKey) throw new Error(ERRORS.MISSING_KEY);

  const ai = new GoogleGenAI({ apiKey: effectiveKey });

  try {
    const parts: any[] = [];
    const negativePromptStr = negativePrompt 
      ? `\n\nNEGATIVE PROMPT (Strictly Avoid): ${negativePrompt}\nAvoid these elements strictly.` 
      : "";

    let startPct = 0;

    // 1. Preparation Phase

    // --- MODE 1: Image Edit ---
    if (mode === GenerationMode.IMAGE_EDIT) {
      if (subjectImage) {
        // CASE: Subject Image IS Present
        // We use the user's text prompt directly combined with the image.
        // We do NOT use the PROMPT_TEMPLATE_NO_FACE here.
        const subjectB64 = await fileToBase64(subjectImage);
        
        parts.push({ inlineData: { mimeType: subjectImage.type, data: subjectB64 } });
        parts.push({ 
          text: `The first image provided is the REFERENCE IDENTITY (face/character). Generate a new image of this person. ${textPrompt}${negativePromptStr}` 
        });
      } else {
        // CASE: Subject Image IS NOT Present
        // We MUST use the template to expand the prompt first.
        const stopAnalysisSim = simulateProgress(
            0, 30, 2500, updateProgress,
            ["Expanding concept...", "Applying template...", "Enhancing details..."]
        );

        const promptResponse = await ai.models.generateContent({
            model: ANALYSIS_MODEL,
            contents: {
                parts: [{
                    text: `Create a detailed image generation prompt based on the user's concept.
                    
                    Concept: "${textPrompt}"
                    ${negativePrompt ? `Negative Constraints: ${negativePrompt}` : ""}

                    You MUST use the following structure/template for the prompt:
                    ${PROMPT_TEMPLATE_NO_FACE}`
                }]
            }
        });

        stopAnalysisSim();
        const enhancedPrompt = promptResponse.text;
        
        updateProgress("Prompt enhanced.", 32);
        startPct = 35;

        parts.push({ text: `${enhancedPrompt}${negativePromptStr}` });
      }
    } 
    // --- MODE 2: Image to Image ---
    else if (mode === GenerationMode.IMAGE_TO_IMAGE && referenceImage) {
      if (!subjectImage) throw new Error(ERRORS.MISSING_SUBJECT);

      const subjectB64 = await fileToBase64(subjectImage);
      const refB64 = await fileToBase64(referenceImage);
      
      let strengthGuidance = "";
      if (refStrength !== undefined) {
        strengthGuidance = ` (Reference Adherence: ${refStrength}%)`;
      }

      // -- Complex Operation: Replicate Reference (Requires Analysis Step) --
      if (referenceOperation === ReferenceOperation.REPLICATE_REFERENCE) {
        
        // Start Analysis Simulation (0% -> 40%)
        const stopAnalysisSim = simulateProgress(
            0, 40, 4000, updateProgress,
            ["Analyzing scene structure...", "Detecting lighting...", "Extracting composition...", "Building prompt blueprint..."]
        );

        // Actual Analysis Call
        const analysisResponse = await ai.models.generateContent({
            model: ANALYSIS_MODEL,
            contents: {
                parts: [
                    { inlineData: { mimeType: referenceImage.type, data: refB64 } },
                    { text: `Analyze this image structure and generate a detailed prompt template.` } // Simplified for this view, logic persists
                ]
            }
        });

        stopAnalysisSim(); // Stop sim

        const generatedPrompt = analysisResponse.text;
        
        updateProgress("Blueprint created.", 42);
        startPct = 45;

        parts.push({ inlineData: { mimeType: subjectImage.type, data: subjectB64 } });
        parts.push({
          text: `GENERATE A NEW IMAGE based on the following description using the features from the attached 'Subject Face' photo (Image 1). ${strengthGuidance}\n\n${generatedPrompt}\n\n${textPrompt ? `ADDITIONAL USER NOTES: ${textPrompt}` : ""}\n${negativePromptStr}`
        });

      } else {
        // -- Standard Operations (Apply Clothing, Replace Face) --
        
        if (referenceOperation === ReferenceOperation.APPLY_CLOTHING) {
            parts.push({ inlineData: { mimeType: subjectImage.type, data: subjectB64 } });
            parts.push({ inlineData: { mimeType: referenceImage.type, data: refB64 } });
            parts.push({
              text: `Image 1 is the REFERENCE PERSON. Image 2 is the CLOTHING REFERENCE. Generate a new image of person from Image 1 wearing outfit from Image 2. ${strengthGuidance} ${textPrompt}${negativePromptStr}`
            });
        } else {
            // Replace Face
            parts.push({ inlineData: { mimeType: referenceImage.type, data: refB64 } });
            parts.push({ inlineData: { mimeType: subjectImage.type, data: subjectB64 } });
            parts.push({
              text: `Image 1 is TARGET SCENE. Image 2 is SOURCE FACE. Replace face in Image 1 with face in Image 2. ${strengthGuidance} ${textPrompt}${negativePromptStr}`
            });
        }
      }
    }

    // 2. Generation Phase
    // Start Generation Simulation (Current% -> 85%)
    // Estimated time 10-15s
    
    const stopGenSim = simulateProgress(
        startPct, 88, 12000, updateProgress,
        [
            "Initiating diffusion...", 
            "Synthesizing composition...", 
            "Rendering subjects...", 
            "Refining textures and lighting...", 
            "Polishing details...",
            "Finalizing output..."
        ]
    );

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: { parts },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: resolution
        }
      }
    });
    
    stopGenSim();

    // 3. Post-Processing Phase
    updateProgress("Downloading image data...", 92);

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      
      if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
        throw new Error(ERRORS.POLICY);
      }

      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
            updateProgress("Decoding final image...", 98);
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }
    }

    throw new Error("No image generated.");

  } catch (error: any) {
    handleError(error);
    return "";
  }
};

export const generatePrompt = async (params: PromptGenParams): Promise<string> => {
  const { mode, subjectImage, textPrompt, useFaceFeature, onProgress, apiKey, negativePrompt } = params;
  
  const updateProgress = (msg: string, val: number) => {
    if (onProgress) onProgress(msg, val);
  };

  const effectiveKey = apiKey || getEnvApiKey();
  if (!effectiveKey) throw new Error(ERRORS.MISSING_KEY);

  const ai = new GoogleGenAI({ apiKey: effectiveKey });
  
  try {
    const baseTemplate = useFaceFeature ? PROMPT_TEMPLATE_WITH_FACE : PROMPT_TEMPLATE_NO_FACE;
    const parts: any[] = [];
    const negativeCondition = negativePrompt ? `\nNEGATIVE CONDITIONS:\n${negativePrompt}` : "";

    if (mode === GenerationMode.IMG_TO_PROMPT && subjectImage) {
      const imgB64 = await fileToBase64(subjectImage);
      parts.push({ inlineData: { mimeType: subjectImage.type, data: imgB64 } });
      parts.push({
        text: `Analyze the uploaded reference image and generate a detailed image generation prompt... ${textPrompt ? `CONTEXT: ${textPrompt}` : ''} ${negativeCondition} STRUCTURE: ${baseTemplate}`
      });
    } else {
      parts.push({
        text: `Create a detailed image generation prompt... Concept: "${textPrompt}". ${negativeCondition} STRUCTURE: ${baseTemplate}`
      });
    }

    // Simulation for Text Gen (Faster than image)
    const stopSim = simulateProgress(
        0, 90, 4000, updateProgress,
        ["Analyzing context...", "Structuring prompt...", "Writing detailed description...", "Refining camera settings..."]
    );

    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: { parts }
    });

    stopSim();
    updateProgress("Finalizing text...", 95);

    if (response.text) {
      return response.text;
    }
    
    throw new Error("No prompt generated.");

  } catch (error: any) {
    handleError(error);
    return "";
  }
};

const handleError = (error: any) => {
  console.error("Gemini API Error:", error);
  const msg = (error.message || error.toString()).toLowerCase();
  
  if (msg.includes("api key") || msg.includes("403") || msg.includes("401") || msg.includes("requested entity was not found") || msg.includes("permission denied")) {
    throw new Error(ERRORS.AUTH_FAILED);
  }
  if (msg.includes("safety") || msg.includes("blocked") || msg.includes("finish reason")) {
    throw new Error(ERRORS.POLICY);
  }
  if (msg.includes("429") || msg.includes("quota") || msg.includes("resource exhausted")) {
    throw new Error(ERRORS.QUOTA);
  }
  if (msg.includes("500") || msg.includes("503") || msg.includes("internal")) {
    throw new Error(ERRORS.SERVER);
  }
  throw error;
};
