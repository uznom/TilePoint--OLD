/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SECURITY_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
