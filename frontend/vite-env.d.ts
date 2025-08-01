/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_LOG_LEVEL: string
  // その他の環境変数の型定義をここに追加
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}