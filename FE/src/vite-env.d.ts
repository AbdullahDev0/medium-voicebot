/**
 * @file vite-env.d.ts
 * @description Vite environment type definitions.
 * @module vite-env
 *
 * Notes:
 * - Versioning will be added only when explicitly requested.
 */

import 'vite/client';

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

export {};
