/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEEPSEEK_API_KEY?: string;
}

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
