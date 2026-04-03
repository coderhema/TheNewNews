/// <reference types="vite/client" />

declare global {
  interface ImportMetaEnv {
    readonly VITE_POKE_API_KEY?: string;
    readonly VITE_POKE_API_BASE_URL?: string;
    readonly VITE_POKE_MODEL?: string;
    readonly VITE_NEWS_API_KEY?: string;
    readonly VITE_NEWS_API_BASE_URL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};
