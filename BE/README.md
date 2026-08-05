# Voicebot Console Backend (NestJS)

This backend exposes a simple LLM gateway for the Voicebot Console frontend.

## Setup

1. Install dependencies.
   - `npm install`
2. Create your environment file.
   - Copy `.env.example` to `.env`.
   - Fill in values for either OpenAI or Ollama, based on `USE_LOCAL_LLM`.
3. Start the server.
   - `npm run start:dev`

## Environment Variables

- `PORT`: Backend port.
- `CORS_ORIGIN`: Frontend origin allowed to call the API.
- `USE_LOCAL_LLM`: Toggle local LLM usage (`true` or `false`).
- `USE_REALTIME`: Toggle realtime voice gateway (`true` or `false`).
- `USE_TOOLS`: Toggle tool usage (`true` or `false`).

### OpenAI

Used when `USE_LOCAL_LLM=false`:
- `OPENAI_API_KEY`
- `OPENAI_MODEL`
- `OPENAI_BASE_URL`

### OpenAI Realtime

Used when `USE_REALTIME=true`:
- `OPENAI_API_KEY`
- `OPENAI_REALTIME_URL`
- `OPENAI_REALTIME_MODEL`
- `OPENAI_REALTIME_VOICE`
- `OPENAI_REALTIME_TRANSCRIBE_MODEL` (optional, enables input transcription)
- `WEBRTC_ICE_SERVERS` (optional, JSON array or comma-delimited list of STUN/TURN URLs)

### Ollama (Local)

Used when `USE_LOCAL_LLM=true`:
- `OLLAMA_BASE_URL` (default `http://127.0.0.1:11434`)
- `OLLAMA_MODEL` (example `qwen2.5:0.5b`)

## Ollama Setup (Local LLM)

1. Install Ollama.
   - `curl -fsSL https://ollama.com/install.sh | sh`
2. Start the Ollama service.
   - `sudo systemctl enable --now ollama`
3. Pull a lightweight model.
   - `ollama pull qwen2.5:0.5b`
4. Confirm Ollama is running.
   - `ollama --version`
   - `ollama list`

## API

- `GET /api/health`
  - Response: `{ "status": "health" }`

- `POST /api/llm/respond`
  - Request: `{ "input": "your prompt" }`
  - Response: `{ "text": "llm response" }`

- `WS /ws/realtime`
  - Realtime voice websocket gateway

- `POST /api/voice/session`
  - Creates a WebRTC realtime session for signaling
  - Response: `{ "sessionId": "...", "webrtcWsUrl": "wss://...", "iceServers": [...] }`

- `WS /voice/webrtc`
  - WebRTC signaling websocket (SDP/ICE exchange)
