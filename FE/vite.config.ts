/**
 * @file vite.config.ts
 * @description Vite configuration for the Voicebot Console frontend.
 * @module vite-config
 *

 */

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
