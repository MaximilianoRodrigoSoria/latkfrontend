/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  /** 'true' con `npm run local`: permite capturas de pantalla (solo en desarrollo). */
  readonly VITE_ALLOW_SCREENSHOTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
