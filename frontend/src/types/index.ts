// Core types for the application
export interface SuggestedPrompt {
  type: string;
  section?: string;
  prompt: string;
  description?: string;
}

export interface AnalysisData {
  success: boolean;
  industry?: string;
  content_type?: string;
  suggested_prompts?: SuggestedPrompt[];
  company_info?: Record<string, any>;
  existing_images?: string[];
  recommended_style_level?: StyleLevel;
  recommended_color_palette?: ColorPalette;
  style_level_reasoning?: string;
  color_palette_reasoning?: string;
  from_cache?: boolean;
}

export interface GeneratedImageData {
  image: string;
  type?: string;
  section?: string;
  description?: string;
}

export interface GenerationResponse {
  success: boolean;
  images?: GeneratedImageData[];
  error?: string;
}

export type StyleLevel = 'standard' | 'premium' | 'luxury';
export type ColorPalette = 'vibrant' | 'muted' | 'monochrome' | 'corporate';

// API Request/Response types
export interface AnalyzeUrlRequest {
  url: string;
  generateImage: boolean;
}

export interface AnalyzeUrlResponse {
  success: boolean;
  url?: string;
  title?: string;
  industry?: string;
  content_type?: string;
  suggested_prompts?: SuggestedPrompt[];
  company_info?: Record<string, any>;
  existing_images?: string[];
  recommended_style_level?: StyleLevel;
  recommended_color_palette?: ColorPalette;
  style_level_reasoning?: string;
  color_palette_reasoning?: string;
  from_cache?: boolean;
  error?: string;
}

export interface GenerateAllImagesRequest {
  suggested_prompts: SuggestedPrompt[];
  industry?: string;
  url: string;
  company_info?: Record<string, any>;
  existing_images?: string[];
  style_level: StyleLevel;
  color_palette: ColorPalette;
}

export interface GenerateAllImagesResponse {
  success: boolean;
  images?: GeneratedImageData[];
  error?: string;
}

// Legacy types (for backward compatibility)
export interface ImageGenerationFormData {
  url: string;
  targetAudience?: string;
  industry?: string;
  contentType?: string;
  provider: 'gemini' | 'auto';
  additionalPrompts: string[];
  saveToHistory: boolean;
}

export interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  provider: string;
  timestamp: number;
  metadata?: {
    original_prompt?: string;
    enhanced_prompt?: string;
    api_used?: string;
    cost?: number;
    generation_time?: number;
    resolution?: string;
    format?: string;
    context?: any;
    analysis?: any;
  };
}

export interface SiteAnalysisResult {
  suggested_prompt?: string;
  industry?: string;
  content_type?: string;
  content?: {
    title?: string;
    description?: string;
    main_content?: string;
  };
  style_suggestions?: {
    style_keywords?: string[];
    color_palette?: string[];
    composition?: {
      layout?: string;
      focus?: string;
      aspect?: string;
    };
  };
}

export interface ApiError {
  error: string;
  details?: string;
  code?: string;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

export interface Industry {
  value: string;
  label: string;
}

export interface ContentType {
  value: string;
  label: string;
  description?: string;
}

export interface Context {
  industry: string;
  contentType: string;
}

export interface PromptAnalysis {
  style_suggestions?: string[];
  color_palette?: string[];
  themes?: string[];
  industry_confidence?: 'high' | 'medium' | 'low';
  detected_themes?: string[];
  analysis_method?: string;
}

export interface UrlContent {
  title: string;
  description?: string;
}

export interface DetailedAnalysis {
  pages_analyzed: number;
  pages_found: number;
  industry_confidence: 'high' | 'medium' | 'low';
  main_themes: string[];
  visual_style: {
    tone: string;
    atmosphere: string[];
  };
}

export interface ImageHistory {
  id: string;
  image?: string | null;
  metadata: {
    prompt: string;
    enhancedPrompt?: string | undefined;
    api: string;
    cost?: number | undefined;
    createdAt: string;
    analysis?: any;
  };
}

export interface SaveImageResponse {
  success: boolean;
  imageId?: string;
  warning?: string;
  error?: string;
}

export interface HistoryResponse {
  success: boolean;
  images: ImageHistory[];
  warning?: string;
  error?: string;
}
