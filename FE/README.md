# Voicebot Console (Frontend)

Single-page React + Vite + Tailwind UI for the Voicebot Console. It captures mic audio, converts speech to text in the browser, sends text to OpenAI, renders the response, and reads it out loud with browser TTS.

## Setup

1. Install dependencies.
   - `npm install`
2. Create your environment file.
   - Copy `.env.example` to `.env`.
   - Fill in `VITE_OPENAI_API_KEY`, `VITE_OPENAI_MODEL`, and `VITE_OPENAI_BASE_URL`.
3. Start the dev server.
   - `npm run dev`

## Notes

- This frontend calls the OpenAI API directly from the browser. This exposes the API key to users and is not suitable for production without a backend proxy.
