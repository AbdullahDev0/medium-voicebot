/**
 * @file vite-env.d.ts
 * @description Vite environment type definitions.
 * @module vite-env
 *

 */

import 'vite/client';

declare global {
  interface ImportMetaEnv {
    readonly VITE_OPENAI_API_KEY?: string;
    readonly VITE_OPENAI_MODEL?: string;
    readonly VITE_OPENAI_BASE_URL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};
