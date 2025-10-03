// Frontend specific types
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

// Additional types for ImageGenerationForm component
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

export interface GenerationResponse {
  success: boolean;
  image?: string;
  images?: Array<{
    image: string;
    metadata: {
      original_prompt: string;
      enhanced_prompt: string;
      api_used: string;
      cost: number;
      analysis?: any;
    };
  }>;
  metadata?: {
    original_prompt: string;
    enhanced_prompt: string;
    api_used: string;
    cost: number;
    analysis?: any;
  };
  total_cost?: number;
  error?: string;
  details?: string;
}

export interface AnalysisResponse {
  success: boolean;
  url?: string;
  title?: string;
  analysis?: PromptAnalysis;
  content?: UrlContent;
  suggested_prompt?: string;
  suggested_prompts?: Array<{
    type: string;
    prompt: string;
  }>;
  industry?: string;
  content_type?: string;
  detected_content_types?: string[];
  detected_themes?: string[];
  pages_analyzed?: number;
  pages_found?: number;
  industry_confidence?: 'high' | 'medium' | 'low';
  main_themes?: string[];
  visual_style?: {
    tone: string;
    atmosphere: string[];
    color_hints?: string[];
    design_style?: string;
  };
  visual_analysis?: {
    color_scheme?: string;
    layout_style?: string;
    image_style?: string;
    ui_elements?: string;
  };
  target_audience?: string;
  key_features?: string[];
  image_recommendations?: {
    composition?: string;
    lighting?: string;
    perspective?: string;
    style_match?: string;
  };
  generated_image?: {
    image: string;
    cost: number;
    model: string;
  };
  screenshot?: string;
  analysis_method?: string;
  method?: string;
  analyzed_at?: string;
  error?: string;
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