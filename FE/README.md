# Voicebot Console (Frontend)

Single-page React + Vite + Tailwind UI for the Voicebot Console. It captures mic audio, converts speech to text in the browser, sends text to the backend gateway, renders the response, and reads it out loud with browser TTS.

## Setup

1. Install dependencies.
   - `npm install`
2. Create your environment file.
   - Copy `.env.example` to `.env`.
   - Fill in `VITE_API_BASE_URL` to point at the backend.
   - Set `VITE_REALTIME_ENABLED` and `VITE_REALTIME_WS_URL` to enable realtime voice.
3. Start the dev server.
   - `npm run dev`
