

import { GoogleGenAI } from "@google/genai";
import { GenerateParams, PromptGenParams, GenerationMode, ReferenceOperation, SubjectItem } from '../types';
import { 
    MODELS, 
    ANALYSIS_MODEL, 
    ERRORS, 
    PROMPT_TEMPLATE_NO_FACE_V1, 
    PROMPT_TEMPLATE_WITH_FACE_V1,
    PROMPT_TEMPLATE_NO_FACE_V2,
    PROMPT_TEMPLATE_WITH_FACE_V2
} from '../constants';

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
    subjects, 
    mode, 
    textPrompt, 
    referenceImage, 
    referenceOperation,
    aspectRatio,
    resolution,
    onProgress,
    apiKey,
    refStrength,
    negativePrompt,
    modelName,
    templateVersion
  } = params;

  const updateProgress = (msg: string, val: number) => {
    if (onProgress) onProgress(msg, val);
  };

  const effectiveKey = apiKey || getEnvApiKey();
  if (!effectiveKey) throw new Error(ERRORS.MISSING_KEY);

  const ai = new GoogleGenAI({ apiKey: effectiveKey });

  // Use the requested model, fallback to PRO if generic
  const targetModel = modelName || MODELS.PRO;
  const isPro = targetModel === MODELS.PRO;

  try {
    const parts: any[] = [];
    const negativePromptStr = negativePrompt 
      ? `\n\nNEGATIVE PROMPT (Strictly Avoid): ${negativePrompt}\nAvoid these elements strictly.` 
      : "";

    // Filter active subjects that contain a valid file
    const activeSubjects = subjects.filter(s => s.isActive && s.file !== null);

    let startPct = 0;

    // 1. Preparation Phase

    // --- MODE 1: Image Edit ---
    if (mode === GenerationMode.IMAGE_EDIT) {
      if (activeSubjects.length > 0) {
        // CASE: Active Subjects Present
        for (let i = 0; i < activeSubjects.length; i++) {
           const s = activeSubjects[i];
           if (s.file) {
               const b64 = await fileToBase64(s.file);
               parts.push({ inlineData: { mimeType: s.file.type, data: b64 } });
           }
        }

        const subjectIndices = activeSubjects.map((_, i) => `Image ${i + 1} is Subject ${i + 1}`).join('. ');
        
        parts.push({ 
          text: `The provided images are the REFERENCE IDENTITIES. ${subjectIndices}. 
          Generate a new image using these subjects.
          Use all selected subjects in the scene according to roles implied by the prompt.
          ${textPrompt}${negativePromptStr}` 
        });

      } else {
        // CASE: No Subject Images (Text to Image)
        startPct = 10;
        updateProgress("Preparing generation...", 15);
        parts.push({ text: `Generate an image matching this description: ${textPrompt}${negativePromptStr}` });
      }
    } 
    // --- MODE 2: Image to Image ---
    else if (mode === GenerationMode.IMAGE_TO_IMAGE && referenceImage) {
      const refB64 = await fileToBase64(referenceImage);
      
      let strengthGuidance = "";
      if (refStrength !== undefined) {
        strengthGuidance = ` (Reference Adherence: ${refStrength}%)`;
      }
      
      // -- Complex Operation: Replicate Reference (Requires Analysis Step) --
      if (referenceOperation === ReferenceOperation.REPLICATE_REFERENCE) {
        
        const stopAnalysisSim = simulateProgress(
            0, 40, 4000, updateProgress,
            ["Analyzing scene structure...", "Detecting lighting...", "Extracting composition...", "Building prompt blueprint..."]
        );

        // SELECT TEMPLATE VERSION FOR REPLICATE REFERENCE
        const templateToUse = (templateVersion === 'V2') 
            ? PROMPT_TEMPLATE_WITH_FACE_V2 
            : PROMPT_TEMPLATE_WITH_FACE_V1;

        const analysisResponse = await ai.models.generateContent({
            model: ANALYSIS_MODEL,
            contents: {
                parts: [
                    { inlineData: { mimeType: referenceImage.type, data: refB64 } },
                    { text: `Analyze this image structure and generate a detailed prompt template using this structure: ${templateToUse}` }
                ]
            },
            config: {
                systemInstruction: "You are an expert image analyst. Output only the prompt blueprint based on the template. No introduction."
            }
        });

        stopAnalysisSim();
        const generatedPrompt = analysisResponse.text;
        
        updateProgress("Blueprint created.", 42);
        startPct = 45;

        for (const s of activeSubjects) {
            if (s.file) {
                const b64 = await fileToBase64(s.file);
                parts.push({ inlineData: { mimeType: s.file.type, data: b64 } });
            }
        }
        
        const subjectMapping = activeSubjects.map((_, i) => `Image ${i+1} is Subject ${i+1}`).join(', ');

        parts.push({
          text: `GENERATE A NEW IMAGE. 
          The provided images are the REFERENCE IDENTITIES (${subjectMapping}).
          
          TASK: Create a new image that perfectly matches the scene description below, but replace the characters/faces with the Subject identities provided above.
          
          SCENE BLUEPRINT:
          ${generatedPrompt}
          
          ADDITIONAL NOTES: ${textPrompt || "None"}
          ${negativePromptStr}
          
          IMPORTANT: Do NOT return the original reference image. Synthesize a NEW image.`
        });

      } else {
        // -- Standard Operations (Apply Clothing, Replace Face) --
        
        for (const s of activeSubjects) {
            if (s.file) {
                const b64 = await fileToBase64(s.file);
                parts.push({ inlineData: { mimeType: s.file.type, data: b64 } });
            }
        }
        // Add Reference LAST
        parts.push({ inlineData: { mimeType: referenceImage.type, data: refB64 } });
        
        const subjectCount = activeSubjects.length;
        const refIndex = subjectCount + 1;
        
        const subjectMapping = activeSubjects.map((_, i) => `Image ${i+1} is Subject ${i+1}`).join(', ');
        
        if (referenceOperation === ReferenceOperation.APPLY_CLOTHING) {
            parts.push({
              text: `${subjectMapping}. Image ${refIndex} is the CLOTHING REFERENCE. Generate a new image of the Subject(s) wearing outfit from Image ${refIndex}. ${strengthGuidance} ${textPrompt}${negativePromptStr}`
            });
        } else {
            // Replace Face
            parts.push({
              text: `${subjectMapping}. Image ${refIndex} is TARGET SCENE. Replace face(s) in Image ${refIndex} with face(s) from Subject images. ${strengthGuidance} ${textPrompt}${negativePromptStr}`
            });
        }
      }
    }

    // 2. Generation Phase
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

    const config: any = {
      imageConfig: {
        aspectRatio: aspectRatio
      },
      systemInstruction: "You are an image generation model. You must generate an image matching the prompt. Do not ask clarifying questions. If the prompt is simple (e.g. 'car'), generate a high-quality example of that subject. Do not return text."
    };
    
    // Only add imageSize for Pro model to avoid Flash model issues
    if (isPro) {
      config.imageConfig.imageSize = resolution;
    }

    const response = await ai.models.generateContent({
      model: targetModel,
      contents: { parts },
      config: config
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
        
        // If we reach here, we found parts but no image. Check for text refusal.
        for (const part of candidate.content.parts) {
            if (part.text) {
                // Return the text as the error message so the user knows WHY it failed
                throw new Error(`Model Refusal: ${part.text.substring(0, 150)}...`);
            }
        }
      }
    }

    throw new Error("No image generated. The model did not return an image or a refusal reason.");

  } catch (error: any) {
    handleError(error);
    return "";
  }
};

export const generatePrompt = async (params: PromptGenParams): Promise<string> => {
  const { mode, subjects, textPrompt, useFaceFeature, onProgress, apiKey, negativePrompt, templateVersion } = params;
  
  const updateProgress = (msg: string, val: number) => {
    if (onProgress) onProgress(msg, val);
  };

  const effectiveKey = apiKey || getEnvApiKey();
  if (!effectiveKey) throw new Error(ERRORS.MISSING_KEY);

  const ai = new GoogleGenAI({ apiKey: effectiveKey });
  
  try {
    // SELECT BASE TEMPLATE BASED ON FEATURE TOGGLE AND VERSION
    let baseTemplate;
    if (useFaceFeature) {
        baseTemplate = (templateVersion === 'V2') ? PROMPT_TEMPLATE_WITH_FACE_V2 : PROMPT_TEMPLATE_WITH_FACE_V1;
    } else {
        baseTemplate = (templateVersion === 'V2') ? PROMPT_TEMPLATE_NO_FACE_V2 : PROMPT_TEMPLATE_NO_FACE_V1;
    }

    const parts: any[] = [];
    const negativeCondition = negativePrompt ? `\nNEGATIVE CONDITIONS:\n${negativePrompt}` : "";

    const activeSubjects = subjects.filter(s => s.isActive && s.file !== null);
    
    // Config to enforce strict output
    const systemInstruction = `You are an expert prompt engineer. Your goal is to write high-quality, detailed image generation prompts based on the provided structure. 
    
    CRITICAL INSTRUCTIONS:
    1. Output ONLY the raw prompt text. 
    2. Do NOT include any introductory text (e.g., "Here is the prompt", "Sure", "Based on your request").
    3. Do NOT include any closing text or explanations.
    4. Do NOT use markdown code blocks (\`\`\`).
    5. Start the response IMMEDIATELY with the prompt content.`;

    if (mode === GenerationMode.IMG_TO_PROMPT && activeSubjects.length > 0) {
      for (const s of activeSubjects) {
          if (s.file) {
              const b64 = await fileToBase64(s.file);
              parts.push({ inlineData: { mimeType: s.file.type, data: b64 } });
          }
      }
      parts.push({
        text: `Analyze the uploaded reference image(s) and generate a detailed image generation prompt following the structure below.
        
        CONTEXT/ADDITIONAL INSTRUCTIONS: ${textPrompt || "None"}
        ${negativeCondition}
        
        REQUIRED STRUCTURE (Fill in the brackets):
        ${baseTemplate}
        
        STRICT OUTPUT RULE: Output ONLY the filled template. Do NOT add "Here is the prompt" or any conversational preamble. Start directly with the content.`
      });
    } else {
      parts.push({
        text: `Create a detailed image generation prompt for the concept: "${textPrompt}".
        ${negativeCondition}
        
        REQUIRED STRUCTURE (Fill in the brackets):
        ${baseTemplate}
        
        STRICT OUTPUT RULE: Output ONLY the filled template. Do NOT add "Here is the prompt" or any conversational preamble. Start directly with the content.`
      });
    }

    const stopSim = simulateProgress(
        0, 90, 4000, updateProgress,
        ["Analyzing context...", "Structuring prompt...", "Writing detailed description...", "Refining camera settings..."]
    );

    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: { parts },
      config: {
        systemInstruction: systemInstruction
      }
    });

    stopSim();
    updateProgress("Finalizing text...", 95);

    if (response.text) {
      let cleaned = response.text.trim();
      // Remove markdown code blocks if present
      cleaned = cleaned.replace(/^```(?:markdown|text|json)?\n/, '').replace(/\n```$/, '');
      
      // Remove conversational preambles (aggressive cleanup)
      // Matches pattern like "Here is the prompt:" or "Sure, here is..." at start of string
      const preambleRegex = /^(Here is|Here's|Sure,|Okay,|This is|Below is)[\s\S]*?:\s*/i;
      if (preambleRegex.test(cleaned)) {
          cleaned = cleaned.replace(preambleRegex, '');
      }

      return cleaned.trim();
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
  
  // Pass through custom errors (like Model Refusal)
  throw error;
};