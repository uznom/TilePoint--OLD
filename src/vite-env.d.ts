/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_CLIPBOARD_OBFUSCATION_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
