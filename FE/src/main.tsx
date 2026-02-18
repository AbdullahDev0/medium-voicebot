/**
 * @file main.tsx
 * @description React entry point for the Voicebot Console frontend.
 * @module main
 *

 */

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
