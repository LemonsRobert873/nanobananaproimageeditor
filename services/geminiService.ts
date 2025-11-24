

import { GoogleGenAI } from "@google/genai";
import { GenerateParams, PromptGenParams, GenerationMode, ReferenceOperation } from '../types';
import { MODEL_NAME, ANALYSIS_MODEL, ERRORS, PROMPT_TEMPLATE_NO_FACE, PROMPT_TEMPLATE_WITH_FACE } from '../constants';

// Helper to safely access process.env (prevents crash in environments where process is undefined)
const getEnvApiKey = (): string | undefined => {
  try {
    // Safe check for process.env which might not exist in pure browser environments
    // or strictly configured Vercel deployments unless polyfilled.
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY;
    }
  } catch (e) {
    // Ignore ReferenceErrors or access errors
    return undefined;
  }
  return undefined;
};

// Helper to convert File to Base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (e.g., "data:image/jpeg;base64,")
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = error => reject(error);
  });
};

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

  // Prioritize manually provided key, then fallback to environment variable
  const effectiveKey = apiKey || getEnvApiKey();
  if (!effectiveKey) {
    throw new Error(ERRORS.MISSING_KEY);
  }

  const ai = new GoogleGenAI({ apiKey: effectiveKey });

  try {
    const parts: any[] = [];
    
    // Construct Negative Prompt String
    const negativePromptStr = negativePrompt 
      ? `\n\nNEGATIVE PROMPT (Strictly Avoid): ${negativePrompt}\nAvoid these elements strictly.` 
      : "";

    // --- MODE 1: Image Edit (Formerly Text Prompt) ---
    if (mode === GenerationMode.IMAGE_EDIT) {
      if (subjectImage) {
        // Workflow 1: Subject Image + Prompt -> Identity-preserving edit
        updateProgress("Processing subject image...", 10);
        const subjectB64 = await fileToBase64(subjectImage);
        
        updateProgress("Constructing identity prompt...", 25);
        parts.push({
          inlineData: { mimeType: subjectImage.type, data: subjectB64 }
        });
        
        parts.push({ 
          text: `The first image provided is the REFERENCE IDENTITY (face/character). Generate a new image of this person. ${textPrompt}${negativePromptStr}` 
        });
      } else {
        // Workflow 2: Prompt Only -> Standard Text to Image
        updateProgress("Constructing generation prompt...", 10);
        parts.push({
          text: `${textPrompt}${negativePromptStr}`
        });
      }

      updateProgress("Generating image with Gemini Pro...", 50);

    } 
    // --- MODE 2: Image to Image Edit (Formerly Image Reference) ---
    else if (mode === GenerationMode.IMAGE_TO_IMAGE && referenceImage) {
      if (!subjectImage) throw new Error(ERRORS.MISSING_SUBJECT);

      updateProgress("Processing input images...", 10);
      const subjectB64 = await fileToBase64(subjectImage);
      const refB64 = await fileToBase64(referenceImage);
      
      // Calculate Reference Strength Prompt Text
      let strengthGuidance = "";
      if (refStrength !== undefined) {
        if (refStrength >= 80) {
            strengthGuidance = "Follow the reference image structure, style, and composition EXTREMELY STRICTLY.";
        } else if (refStrength <= 40) {
            strengthGuidance = "Use the reference image loosely as inspiration; prioritize the text prompt and creativity over strict adherence.";
        } else {
            strengthGuidance = "Balance the reference image structure with the text prompt description.";
        }
        strengthGuidance += ` (Reference Adherence Level: ${refStrength}%)`;
      }

      if (referenceOperation === ReferenceOperation.APPLY_CLOTHING) {
        updateProgress("Analyzing clothing reference...", 30);
        
        parts.push({
          inlineData: { mimeType: subjectImage.type, data: subjectB64 }
        });
        
        parts.push({
          inlineData: { mimeType: referenceImage.type, data: refB64 }
        });
        
        parts.push({
          text: `Image 1 is the REFERENCE PERSON. Image 2 is the CLOTHING REFERENCE. Generate a completely NEW image of the person from Image 1 wearing the outfit shown in Image 2. Do NOT simply paste the face onto Image 2. Create a new composition, pose, or background as described in the prompt. Focus on the person's identity from Image 1. ${strengthGuidance} ${textPrompt}${negativePromptStr}`
        });
        
        updateProgress("Synthesizing new look...", 50);

      } 
      else if (referenceOperation === ReferenceOperation.REPLICATE_REFERENCE) {
        
        updateProgress("Analyzing reference scene structure...", 20);
        
        const analysisPrompt = `Analyze the uploaded reference image and generate a detailed image generation prompt based exactly on the structure below. Replace all bracketed placeholders (e.g., [SHOT TYPE]) with specific descriptive details from the image.

Structure:
Use the features from the attached 'Subject Face' photo to create a [SHOT TYPE], [ADJECTIVE] portrait of a [SUBJECT DESCRIPTION]. The photo is captured with a [CAMERA TYPE], exhibiting a [PERSPECTIVE TYPE], [SETTING DESCRIPTION], and [LIGHTING DESCRIPTION]. She is wearing [CLOTHING DESCRIPTION], exuding a [MOOD/VIBE].

Attire:
[Describe the clothing in detail, including type, color, fabric, and fit. Mention any visible layers or specific design elements.]

Accessories:
[List and describe all accessories, such as jewelry, bags, hats, glasses, belts, etc.]

Pose:
[Describe the subject's posture, body language, hand placement, and the direction of their gaze and head tilt.]

Camera & Technical Specs:
- camera_type: [DESCRIBE_CAMERA_TYPE_AND_SETTINGS (e.g., Canon EOS R5)]
- lens_type: [DESCRIBE_LENS_TYPE_AND_FOCAL_LENGTH (e.g., 85mm prime lens, f/1.4)]
- resolution_and_aspect_ratio: [SPECIFY_RESOLUTION_AND_ASPECT_RATIO (e.g., 8K, 3:2 aspect ratio)]
- shutter_speed_and_aperture: [SPECIFY_SHUTTER_SPEED_AND_APERTURE (e.g., 1/250s, f/1.8)]
- iso_setting: [SPECIFY_ISO_SETTING (e.g., ISO 100)]

Framing & Composition:
- framing: [DESCRIBE_FRAMING (e.g., medium shot, full body, close-up)]
- camera_angle: [DESCRIBE_CAMERA_ANGLE (e.g., slightly low angle, eye-level)]
- perspective: [DESCRIBE_PERSPECTIVE (e.g., human-level, worm's-eye)]
- rule_of_thirds: [INDICATE_USE_OF_RULE_OF_THIRDS (e.g., subject on right third, central)]
- leading_lines: [DESCRIBE_ANY_LEADING_LINES_OR_COMPOSITIONAL_GUIDES (e.g., architectural lines)]
- focus: [SPECIFY_FOCUS_POINT (e.g., sharp focus on eyes, soft focus on background)]
- depth_of_field: [SPECIFY_DEPTH_OF_FIELD (e.g., shallow, deep)]
- motion_blur: [DESCRIBE_ANY_INTENTIONAL_MOTION_BLUR (e.g., none, subtle motion in background)]

Lighting:
- lighting_type: [DESCRIBE_LIGHTING_TYPE (e.g., high-contrast studio, natural golden hour)]
- direction: [DESCRIBE_LIGHTING_DIRECTION (e.g., key light from left, rim light from behind)]
- color_and_quality: [DESCRIBE_LIGHTING_COLOR_AND_QUALITY (e.g., warm, cool, soft, harsh)]
- effect: [DESCRIBE_LIGHTING_EFFECT_AND_SHADOWS (e.g., contours cheekbones, dramatic long shadows)]

Color & Grading:
- color_mode: [DESCRIBE_COLOR_MODE (e.g., vibrant full color, muted sepia tone)]
- color_palette: [SPECIFY_DOMINANT_COLOR_PALETTE (e.g., warm earth tones, cool blues and greens)]
- contrast_and_saturation: [SPECIFY_CONTRAST_AND_SATURATION_LEVELS (e.g., cinematic contrast, high saturation)]

Background Overall Detail:
[Describe the environment in detail, including specific elements, colors, textures, and the time of day. Explain how the background contributes to the overall atmosphere.]

Mood, Tone, & Influences:
- mood_and_tone: [DESCRIBE_OVERALL_MOOD_AND_TONE (e.g., seductive, melancholic, serene)]
- influences_or_references: [REFERENCE_ARTISTS_FILMS_OR_PHOTOGRAPHERS_FOR_INSPIRATION (e.g., inspired by Helmut Newton, resembles a scene from Blade Runner)]
- post_processing_effects: [DESCRIBE_ANY_DESIRED_POST_PROCESSING_EFFECTS (e.g., film grain, vignette, glow effect)]

The overall image conveys a blend of [EMOTION/STYLE 1] and [EMOTION/STYLE 2], capturing a [SUBJECT SUMMARY] in a [SETTING SUMMARY], emphasized by the [KEY ELEMENT 1] and [KEY ELEMENT 2]. The subject's hair, face, body features, makeup, and skin tone must remain identical to the 'Subject Face' image. Do not change them. The final result must be a 100% real photo.`;

        const analysisResponse = await ai.models.generateContent({
            model: ANALYSIS_MODEL,
            contents: {
                parts: [
                    { inlineData: { mimeType: referenceImage.type, data: refB64 } },
                    { text: analysisPrompt }
                ]
            }
        });

        updateProgress("Constructing scene blueprint...", 45);

        const generatedPrompt = analysisResponse.text;

        parts.push({
          inlineData: { mimeType: subjectImage.type, data: subjectB64 }
        });

        parts.push({
          text: `GENERATE A NEW IMAGE based on the following description using the features from the attached 'Subject Face' photo (Image 1). ${strengthGuidance}

${generatedPrompt}

${textPrompt ? `ADDITIONAL USER NOTES: ${textPrompt}` : ""}
${negativePromptStr}`
        });
        
        updateProgress("Synthesizing high-fidelity image...", 60);

      } 
      else {
        // Replace Face
        updateProgress("Aligning facial features...", 30);
        parts.push({
          inlineData: { mimeType: referenceImage.type, data: refB64 }
        });

        parts.push({
          inlineData: { mimeType: subjectImage.type, data: subjectB64 }
        });
        
        parts.push({
          text: `Image 1 is the TARGET SCENE. Image 2 is the SOURCE FACE. Replace the face in Image 1 with the face in Image 2.
CRITICAL INSTRUCTIONS FOR SEAMLESS BLENDING:
1. LIGHTING MATCH: The new face must have the exact same lighting direction, intensity, color temperature, and shadow fallout as the original face in Image 1.
2. SKIN TONE & TEXTURE: Adapt the skin tone of the source face to match the color grading and film grain of Image 1.
3. EXPRESSION & ANGLE: Adjust the source face's angle and expression to perfectly align with the body in Image 1.
4. BLENDING: Ensure edges are invisible. The face should look like it was originally photographed in this scene.
${strengthGuidance}
${textPrompt ? `ADDITIONAL NOTES: ${textPrompt}` : ""}
${negativePromptStr}`
        });
        
        updateProgress("Blending face into scene...", 50);
      }
    }

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
    
    updateProgress("Finalizing output...", 90);

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      
      if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
        throw new Error(ERRORS.POLICY);
      }

      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
            updateProgress("Done!", 100);
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }
      }
    }

    throw new Error("No image generated.");

  } catch (error: any) {
    handleError(error);
    return ""; // Unreachable but TS compliant
  }
};

export const generatePrompt = async (params: PromptGenParams): Promise<string> => {
  const { mode, subjectImage, textPrompt, useFaceFeature, onProgress, apiKey, negativePrompt } = params;
  
  const updateProgress = (msg: string, val: number) => {
    if (onProgress) onProgress(msg, val);
  };

  const effectiveKey = apiKey || getEnvApiKey();
  if (!effectiveKey) {
    throw new Error(ERRORS.MISSING_KEY);
  }

  const ai = new GoogleGenAI({ apiKey: effectiveKey });
  
  try {
    updateProgress("Selecting template...", 10);
    
    // Select Template based on Toggle
    const baseTemplate = useFaceFeature ? PROMPT_TEMPLATE_WITH_FACE : PROMPT_TEMPLATE_NO_FACE;
    const parts: any[] = [];
    
    // Negative Prompt Section for Template
    const negativeCondition = negativePrompt ? `
    NEGATIVE CONDITIONS:
    Do not include or reference the following in the generated description:
    ${negativePrompt}
    ` : "";

    // --- MODE 3: Image to Text Prompt ---
    if (mode === GenerationMode.IMG_TO_PROMPT && subjectImage) {
      updateProgress("Analyzing image structure...", 30);
      
      const imgB64 = await fileToBase64(subjectImage);
      
      parts.push({
        inlineData: { mimeType: subjectImage.type, data: imgB64 }
      });
      
      parts.push({
        text: `Analyze the uploaded reference image and generate a detailed image generation prompt based exactly on the structure below. Replace all bracketed placeholders (e.g., [SHOT TYPE]) with specific descriptive details from the image.
        
        ${textPrompt ? `IMPORTANT CONTEXT/NOTES FROM USER: ${textPrompt}` : ''}
        ${negativeCondition}

        STRUCTURE TO FILL:
        ${baseTemplate}`
      });

    } 
    // --- MODE 4: Text to Prompt Generator ---
    else if (mode === GenerationMode.TEXT_TO_PROMPT) {
      updateProgress("Expanding concept...", 30);
      
      parts.push({
        text: `Create a detailed image generation prompt based exactly on the structure below using this concept: "${textPrompt}". Replace all bracketed placeholders (e.g., [SHOT TYPE]) with imaginative details that fit the concept.
        ${negativeCondition}
        
        STRUCTURE TO FILL:
        ${baseTemplate}`
      });
    }

    updateProgress("Generating detailed prompt...", 60);

    const response = await ai.models.generateContent({
      model: ANALYSIS_MODEL,
      contents: { parts }
    });

    updateProgress("Finalizing text...", 90);

    if (response.text) {
      updateProgress("Done!", 100);
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