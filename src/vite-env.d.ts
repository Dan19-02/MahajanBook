/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Ledgix Backend (MiniMax-M3 AI features). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
