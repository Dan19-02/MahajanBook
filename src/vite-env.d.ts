/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the MahajanBook backend (MiniMax-M3 AI features). */
  readonly VITE_API_URL?: string;
  /** Butterbase app id (e.g. app_xxxx). When set, "Continue with Google" is shown. */
  readonly VITE_BUTTERBASE_APP_ID?: string;
  /** Butterbase API base URL (defaults to https://api.butterbase.ai). */
  readonly VITE_BUTTERBASE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
