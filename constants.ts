

// The mapping for Nano Banana Pro as per instructions
// Default/Fallback
export const MODEL_NAME = 'gemini-3-pro-image-preview'; 

export const MODELS = {
  PRO: 'gemini-3-pro-image-preview',
  FLASH: 'gemini-2.5-flash-image'
};

export const ANALYSIS_MODEL = 'gemini-2.5-flash';

export const ASPECT_RATIOS = [
  { value: '1:1', label: 'Square (1:1)' },
  { value: '3:4', label: 'Portrait (3:4)' },
  { value: '4:3', label: 'Landscape (4:3)' },
  { value: '9:16', label: 'Mobile Portrait (9:16)' },
  { value: '16:9', label: 'Widescreen (16:9)' },
];

export const RESOLUTIONS = [
  { value: '1K', label: 'Standard (1K)' },
  { value: '2K', label: 'High (2K)' },
  { value: '4K', label: 'Ultra (4K)' },
];

export const ERRORS = {
  MISSING_KEY: "Please select a valid API key using the button in the top-right corner.",
  MISSING_SUBJECT: "A subject image is required.",
  MISSING_PROMPT: "Please enter a text description.",
  MISSING_REF: "A reference image is required for this mode.",
  AUTH_FAILED: "Authentication failed. Please select your API key again to continue.",
  GENERIC: "Something went wrong while generating. Please try again.",
  POLICY: "The generation was blocked by safety filters. Please try adjusting your inputs.",
  QUOTA: "API quota exhausted. Please check your usage limits or billing.",
  SERVER: "The AI service is currently experiencing high traffic. Please try again in a moment.",
  INVALID_REQUEST: "The request inputs were invalid. Please check your images and prompt."
};

// --- PROMPT TEMPLATES ---

export const PROMPT_TEMPLATE_NO_FACE = `
Create a [SHOT TYPE], [ADJECTIVE] portrait of a [SUBJECT DESCRIPTION]. The photo is captured with a [CAMERA TYPE], exhibiting a [PERSPECTIVE TYPE], [SETTING DESCRIPTION], and [LIGHTING DESCRIPTION]. She is wearing [CLOTHING DESCRIPTION], exuding a [MOOD/VIBE]. 

Attire:
[Describe the clothing in detail, including type, color, fabric, and fit. Mention any visible layers or specific design elements.]

Accessories:
[List and describe all accessories, such as jewelry, bags, hats, glasses, belts, etc.]

Pose:
[Describe the subject's posture, body language, hand placement, and the direction of their gaze and head tilt.]

Camera & Technical Specs:
- camera_type: [DESCRIBE_CAMERA_TYPE_AND_SETTINGS (e.g., Canon EOS R5, iphone 13)] 
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

The overall image conveys a blend of [EMOTION/STYLE 1] and [EMOTION/STYLE 2], capturing a [SUBJECT SUMMARY] in a [SETTING SUMMARY], emphasized by the [KEY ELEMENT 1] and [KEY ELEMENT 2].
`;

export const PROMPT_TEMPLATE_WITH_FACE = `
Use the features from the attached photo to create a [SHOT TYPE], [ADJECTIVE] portrait of a [SUBJECT DESCRIPTION]. The photo is captured with a [CAMERA TYPE], exhibiting a [PERSPECTIVE TYPE], [SETTING DESCRIPTION], and [LIGHTING DESCRIPTION]. She is wearing [CLOTHING DESCRIPTION], exuding a [MOOD/VIBE].

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

The overall image conveys a blend of [EMOTION/STYLE 1] and [EMOTION/STYLE 2], capturing a [SUBJECT SUMMARY] in a [SETTING SUMMARY], emphasized by the [KEY ELEMENT 1] and [KEY ELEMENT 2].  
The subject's hair, face, body features, makeup, and skin tone must remain identical to the reference image. Do not change them.  
The final result must be a 100% real photo.
`;