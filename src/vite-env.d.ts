/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SECURITY_SECRET: string
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}