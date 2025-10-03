// グローバル型定義
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test'
    GEMINI_API_KEY: string
    GEMINI_TEXT_MODEL?: string
    GEMINI_IMAGE_MODEL?: string
    KV_REST_API_URL?: string
    KV_REST_API_TOKEN?: string
    CORS_ORIGIN?: string
    LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error'
    RATE_LIMIT_MS?: string
    API_TIMEOUT_MS?: string
    MAX_BATCH_SIZE?: string
    MAX_ANALYZE_PAGES?: string
    VITE_LOG_LEVEL?: string
  }
}

// API共通型定義
export interface ApiError {
  error: string
  code?: string
  details?: unknown
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// 画像生成関連の型定義
export interface GenerateImageRequest {
  provider: 'gemini' | 'auto'
  prompt: string
  negativePrompt?: string
  style?: string
  quality?: 'standard' | 'hd'
  size?: string
  quantity?: number
  model?: string
}

export interface GenerateImageResponse {
  provider: string
  model: string
  images: GeneratedImage[]
  cost: number
  executionTime: number
}

export interface GeneratedImage {
  url: string
  prompt: string
  size?: string
  model?: string
}

// URL解析関連の型定義
export interface AnalyzeUrlRequest {
  url: string
  includeImages?: boolean
  maxPages?: number
}

export interface AnalyzeUrlResponse {
  url: string
  title: string
  content: AnalyzedContent
  images: ExtractedImage[]
  analyzedAt: string
}

export interface AnalyzedContent {
  mainHeading?: string
  subHeadings: string[]
  paragraphs: string[]
  industry?: string
  contentType?: string
  keywords?: string[]
}

export interface ExtractedImage {
  src: string
  alt?: string
  width?: number
  height?: number
}

// サイト解析関連の型定義
export interface AnalyzeSiteRequest {
  url: string
  industry?: string
  targetAudience?: string
  brandKeywords?: string[]
  includeMultiplePages?: boolean
  maxPages?: number
}

export interface AnalyzeSiteResponse {
  url: string
  analysis: SiteAnalysis
  suggestedPrompts: SuggestedPrompt[]
}

export interface SiteAnalysis {
  industry?: string
  contentType?: string
  mainThemes: string[]
  targetAudience?: string
  brandElements?: string[]
}

export interface SuggestedPrompt {
  title: string
  prompt: string
  style?: string
  rationale?: string
}

// 画像履歴関連の型定義
export interface ImageHistoryEntry {
  id: string
  userId: string
  prompt: string
  imageUrl: string
  provider: string
  model: string
  timestamp: number
  metadata?: Record<string, unknown>
}

export interface SaveImageRequest {
  userId: string
  prompt: string
  imageUrl: string
  provider: string
  model: string
  metadata?: Record<string, unknown>
}

export interface GetHistoryRequest {
  userId: string
  limit?: number
  offset?: number
}

export interface GetHistoryResponse {
  history: ImageHistoryEntry[]
  total: number
  hasMore: boolean
}