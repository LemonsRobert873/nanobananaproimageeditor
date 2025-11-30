

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

export const PROMPT_TEMPLATE_NO_FACE_V1 = `
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

export const PROMPT_TEMPLATE_WITH_FACE_V1 = `
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
- effect: [DESCRIBE_LIGHTING_EFFECT_AND_SHADOWS (e.g., contours cheekbones, dramatic long shadows, hazy glow)]

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

export const PROMPT_TEMPLATE_NO_FACE_V2 = JSON.stringify({
  "camera_type": "DESCRIBE_CAMERA_TYPE_AND_SETTINGS (e.g., iPhone 17 Pro Max, Canon EOS R5)",
  "lens_type": "DESCRIBE_LENS_TYPE_AND_FOCAL_LENGTH (e.g., 85mm prime lens, 24-70mm zoom at 50mm)",
  "resolution_and_aspect_ratio": "SPECIFY_RESOLUTION_AND_ASPECT_RATIO (e.g., 48MP, 3:2 aspect ratio, 1920x1080 for video)",
  "shutter_speed_and_aperture": "SPECIFY_SHUTTER_SPEED_AND_APERTURE (e.g., 1/250s, f/1.8)",
  "iso_setting": "SPECIFY_ISO_SETTING (e.g., ISO 100)",
  "subject": {
    "identity": "DESCRIBE_SUBJECT_IDENTITY_OR_USER_REFERENCE (e.g., user, famous person, fictional character)",
    "gender": "DESCRIBE_SUBJECT_GENDER",
    "age": "DESCRIBE_SUBJECT_AGE (e.g., young adult, middle-aged)",
    "ethnicity_or_features": "DESCRIBE_SPECIFIC_ETHNICITY_OR_DISTINCTIVE_FACIAL_FEATURES (e.g., East Asian, freckles, defined jawline)",
    "body_type": "DESCRIBE_SUBJECT_BODY_TYPE (e.g., athletic, slender, curvaceous)",
    "pose": "DESCRIBE_SUBJECT_POSE_AND_BODY_LANGUAGE (e.g., dynamic, expressive, relaxed, arms raised)",
    "expression": "DESCRIBE_SUBJECT_EXPRESSION_AND_EMOTION (e.g., seductive, joyful, contemplative)",
    "attire": {
      "style": "DESCRIBE_ATTIRE_STYLE (e.g., formal, casual, bohemian, cyberpunk)",
      "color_and_fabric": "DESCRIBE_ATTIRE_COLOR_AND_FABRIC (e.g., black silk, distressed denim)",
      "details_and_accessories": "DESCRIBE_ATTIRE_DETAILS_AND_ACCESSORIES (e.g., subtle side ties, gold necklace, leather boots)"
    },
    "hair_style_and_color": "DESCRIBE_HAIR_STYLE_AND_COLOR (e.g., long flowing brunette hair, short blonde pixie cut)",
    "makeup_style": "DESCRIBE_MAKEUP_STYLE (e.g., natural, smoky eyes, bold red lipstick)"
  },
  "lighting": {
    "type": "DESCRIBE_LIGHTING_TYPE (e.g., high-contrast studio, natural golden hour, neon street lights)",
    "direction": "DESCRIBE_LIGHTING_DIRECTION (e.g., key light from left, rim light from behind, overhead)",
    "color_and_quality": "DESCRIBE_LIGHTING_COLOR_AND_QUALITY (e.g., warm, cool, soft, harsh)",
    "effect": "DESCRIBE_LIGHTING_EFFECT_AND_SHADOWS (e.g., contours cheekbones, dramatic long shadows, hazy glow)"
  },
  "environment": {
    "setting": "DESCRIBE_ENVIRONMENT_SETTING (e.g., minimalistic black backdrop, bustling city street, serene forest)",
    "time_of_day_or_season": "SPECIFY_TIME_OF_DAY_OR_SEASON (e.g., sunset, midnight, autumn)",
    "atmosphere": "DESCRIBE_ENVIRONMENT_ATMOSPHERE_AND_MOOD (e.g., studio-inspired, mysterious, vibrant)",
    "props_and_elements": "LIST_PROPS_AND_ENVIRONMENTAL_ELEMENTS (e.g., vintage armchair, rain, fog, no visible props)",
    "background_details": "DESCRIBE_SPECIFIC_BACKGROUND_DETAILS (e.g., blurred city lights, abstract shapes, clear blue sky)"
  },
  "color_mode": "DESCRIBE_COLOR_MODE (e.g., black-and-white, vibrant full color, muted sepia tone)",
  "color_palette": "SPECIFY_DOMINANT_COLOR_PALETTE (e.g., monochromatic, warm earth tones, cool blues and greens)",
  "contrast_and_saturation": "SPECIFY_CONTRAST_AND_SATURATION_LEVELS (e.g., cinematic contrast, high saturation, desaturated)",
  "composition": {
    "framing": "DESCRIBE_FRAMING (e.g., medium shot, full body, close-up)",
    "camera_angle": "DESCRIBE_CAMERA_ANGLE (e.g., slightly low angle, eye-level, bird's-eye view)",
    "rule_of_thirds": "INDICATE_USE_OF_RULE_OF_THIRDS (e.g., subject on right third, central)",
    "leading_lines": "DESCRIBE_ANY_LEADING_LINES_OR_COMPOSITIONAL_GUIDES (e.g., road leading to subject, architectural lines)",
    "focus": "SPECIFY_FOCUS_POINT (e.g., sharp focus on eyes and lips, soft focus on background)",
    "depth_of_field": "SPECIFY_DEPTH_OF_FIELD (e.g., shallow, deep, medium)",
    "motion_blur": "DESCRIBE_ANY_INTENTIONAL_MOTION_BLUR (e.g., subtle motion blur in hair, panning blur on background)",
    "perspective": "DESCRIBE_PERSPECTIVE (e.g., human-level, worm's-eye, panoramic)"
  },
  "texture_details": {
    "skin": "DESCRIBE_SKIN_TEXTURE (e.g., natural smoothness, visible pores, glossy, matte)",
    "hair": "DESCRIBE_HAIR_TEXTURE (e.g., richly textured strands, silky, coarse, wet)",
    "fabric": "DESCRIBE_FABRIC_TEXTURE (e.g., matte black fabric, rough wool, smooth silk)",
    "environment_textures": "DESCRIBE_ENVIRONMENTAL_TEXTURES (e.g., weathered brick, smooth concrete, lush foliage)"
  },
  "style_and_genre": "SPECIFY_OVERALL_ARTISTIC_STYLE_AND_GENRE (e.g., photorealistic, impressionistic, film noir, fantasy art, editorial fashion)",
  "influences_or_references": "REFERENCE_ARTISTS_FILMS_OR_PHOTOGRAPHERS_FOR_INSPIRATION (e.g., inspired by Helmut Newton, resembles a scene from Blade Runner)",
  "mood_and_tone": "DESCRIBE_OVERALL_MOOD_AND_TONE (e.g., seductive, melancholic, energetic, serene)",
  "emotional_impact": "DESCRIBE_DESIRED_EMOTIONAL_IMPACT_ON_VIEWER (e.g., evoke curiosity, inspire awe, create tension)",
  "post_processing_effects": "DESCRIBE_ANY_DESIRED_POST_PROCESSING_EFFECTS (e.g., film grain, vignette, glow effect, digital painting feel)",
  "final_director_notes": "ADD_ANY_FINAL_NOTES_OR_CRITICAL_INSTRUCTIONS_FOR_GENERATION"
}, null, 2);

export const PROMPT_TEMPLATE_WITH_FACE_V2 = JSON.stringify({
  "camera_type": "DESCRIBE_CAMERA_TYPE_AND_SETTINGS (e.g., iPhone 17 Pro Max, Canon EOS R5)",
  "lens_type": "DESCRIBE_LENS_TYPE_AND_FOCAL_LENGTH (e.g., 85mm prime lens, 24-70mm zoom at 50mm)",
  "resolution_and_aspect_ratio": "SPECIFY_RESOLUTION_AND_ASPECT_RATIO (e.g., 48MP, 3:2 aspect ratio, 1920x1080 for video)",
  "shutter_speed_and_aperture": "SPECIFY_SHUTTER_SPEED_AND_APERTURE (e.g., 1/250s, f/1.8)",
  "iso_setting": "SPECIFY_ISO_SETTING (e.g., ISO 100)",
  "subject": {
    "identity": "DESCRIBE_SUBJECT_IDENTITY_OR_USER_REFERENCE (e.g., user, famous person, fictional character)",
    "gender": "DESCRIBE_SUBJECT_GENDER",
    "age": "DESCRIBE_SUBJECT_AGE (e.g., young adult, middle-aged)",
    "ethnicity_or_features": "DESCRIBE_SPECIFIC_ETHNICITY_OR_DISTINCTIVE_FACIAL_FEATURES (e.g., East Asian, freckles, defined jawline)",
    "body_type": "DESCRIBE_SUBJECT_BODY_TYPE (e.g., athletic, slender, curvaceous)",
    "pose": "DESCRIBE_SUBJECT_POSE_AND_BODY_LANGUAGE (e.g., dynamic, expressive, relaxed, arms raised)",
    "expression": "DESCRIBE_SUBJECT_EXPRESSION_AND_EMOTION (e.g., seductive, joyful, contemplative)",
    "attire": {
      "style": "DESCRIBE_ATTIRE_STYLE (e.g., formal, casual, bohemian, cyberpunk)",
      "color_and_fabric": "DESCRIBE_ATTIRE_COLOR_AND_FABRIC (e.g., black silk, distressed denim)",
      "details_and_accessories": "DESCRIBE_ATTIRE_DETAILS_AND_ACCESSORIES (e.g., subtle side ties, gold necklace, leather boots)"
    },
    "hair_style_and_color": "DESCRIBE_HAIR_STYLE_AND_COLOR (e.g., long flowing brunette hair, short blonde pixie cut)",
    "makeup_style": "DESCRIBE_MAKEUP_STYLE (e.g., natural, smoky eyes, bold red lipstick)"
  },
  "lighting": {
    "type": "DESCRIBE_LIGHTING_TYPE (e.g., high-contrast studio, natural golden hour, neon street lights)",
    "direction": "DESCRIBE_LIGHTING_DIRECTION (e.g., key light from left, rim light from behind, overhead)",
    "color_and_quality": "DESCRIBE_LIGHTING_COLOR_AND_QUALITY (e.g., warm, cool, soft, harsh)",
    "effect": "DESCRIBE_LIGHTING_EFFECT_AND_SHADOWS (e.g., contours cheekbones, dramatic long shadows, hazy glow)"
  },
  "environment": {
    "setting": "DESCRIBE_ENVIRONMENT_SETTING (e.g., minimalistic black backdrop, bustling city street, serene forest)",
    "time_of_day_or_season": "SPECIFY_TIME_OF_DAY_OR_SEASON (e.g., sunset, midnight, autumn)",
    "atmosphere": "DESCRIBE_ENVIRONMENT_ATMOSPHERE_AND_MOOD (e.g., studio-inspired, mysterious, vibrant)",
    "props_and_elements": "LIST_PROPS_AND_ENVIRONMENTAL_ELEMENTS (e.g., vintage armchair, rain, fog, no visible props)",
    "background_details": "DESCRIBE_SPECIFIC_BACKGROUND_DETAILS (e.g., blurred city lights, abstract shapes, clear blue sky)"
  },
  "color_mode": "DESCRIBE_COLOR_MODE (e.g., black-and-white, vibrant full color, muted sepia tone)",
  "color_palette": "SPECIFY_DOMINANT_COLOR_PALETTE (e.g., monochromatic, warm earth tones, cool blues and greens)",
  "contrast_and_saturation": "SPECIFY_CONTRAST_AND_SATURATION_LEVELS (e.g., cinematic contrast, high saturation, desaturated)",
  "composition": {
    "framing": "DESCRIBE_FRAMING (e.g., medium shot, full body, close-up)",
    "camera_angle": "DESCRIBE_CAMERA_ANGLE (e.g., slightly low angle, eye-level, bird's-eye view)",
    "rule_of_thirds": "INDICATE_USE_OF_RULE_OF_THIRDS (e.g., subject on right third, central)",
    "leading_lines": "DESCRIBE_ANY_LEADING_LINES_OR_COMPOSITIONAL_GUIDES (e.g., road leading to subject, architectural lines)",
    "focus": "SPECIFY_FOCUS_POINT (e.g., sharp focus on eyes and lips, soft focus on background)",
    "depth_of_field": "SPECIFY_DEPTH_OF_FIELD (e.g., shallow, deep, medium)",
    "motion_blur": "DESCRIBE_ANY_INTENTIONAL_MOTION_BLUR (e.g., subtle motion blur in hair, panning blur on background)",
    "perspective": "DESCRIBE_PERSPECTIVE (e.g., human-level, worm's-eye, panoramic)"
  },
  "texture_details": {
    "skin": "DESCRIBE_SKIN_TEXTURE (e.g., natural smoothness, visible pores, glossy, matte)",
    "hair": "DESCRIBE_HAIR_TEXTURE (e.g., richly textured strands, silky, coarse, wet)",
    "fabric": "DESCRIBE_FABRIC_TEXTURE (e.g., matte black fabric, rough wool, smooth silk)",
    "environment_textures": "DESCRIBE_ENVIRONMENTAL_TEXTURES (e.g., weathered brick, smooth concrete, lush foliage)"
  },
  "style_and_genre": "SPECIFY_OVERALL_ARTISTIC_STYLE_AND_GENRE (e.g., photorealistic, impressionistic, film noir, fantasy art, editorial fashion)",
  "influences_or_references": "REFERENCE_ARTISTS_FILMS_OR_PHOTOGRAPHERS_FOR_INSPIRATION (e.g., inspired by Helmut Newton, resembles a scene from Blade Runner)",
  "mood_and_tone": "DESCRIBE_OVERALL_MOOD_AND_TONE (e.g., seductive, melancholic, energetic, serene)",
  "emotional_impact": "DESCRIBE_DESIRED_EMOTIONAL_IMPACT_ON_VIEWER (e.g., evoke curiosity, inspire awe, create tension)",
  "post_processing_effects": "DESCRIBE_ANY_DESIRED_POST_PROCESSING_EFFECTS (e.g., film grain, vignette, glow effect, digital painting feel)",
  "final_director_notes": "ADD_ANY_FINAL_NOTES_OR_CRITICAL_INSTRUCTIONS_FOR_GENERATION. Use the features from the attached photo to create a realistic photograph of the subject in the specified setting. Ensure the subject’s facial features, hair, and body type are accurately represented. Don’t change the face and the body. 100% real photo."
}, null, 2);