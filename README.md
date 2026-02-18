# Voice Agent

This project is the foundation of a series focused on building a structured voice agent system using TypeScript.

The goal is not to create a simple voice demo, but to progressively engineer a voice-based system that evolves into an extensible, tool-capable agent architecture.

The series begins with a frontend-only voicebot and incrementally introduces:
- Explicit orchestration
- Provider abstraction
- Backend gateways
- Tool integration
- Agent-level decision flow

The emphasis is on architecture and extensibility rather than UI polish.

## Series Link

https://medium.com/@abdullahirfan99_80517/building-a-voice-agent-architecture-a-step-by-step-guide-using-react-nest-llms-and-backend-cd19b0ebd6ca

## Current Scope

- Frontend-only voicebot
- Browser speech-to-text (STT)
- Browser text-to-speech (TTS)
- OpenAI API call from the client
- Transcript timeline and state machine UI

## Evolution Path (Series Direction)

1. Move LLM calls behind a backend gateway (NestJS)
2. Introduce streaming responses
3. Add tool-calling capability
4. Introduce memory (short-term and persistent)
5. Implement agent orchestration layer
6. Handle interruption logic
7. Add observability and latency metrics
8. Enable local-first deployment to reduce infrastructure cost

## Architectural Philosophy

- Explicit state management
- Clear separation of interface vs reasoning
- Replaceable provider layers
- Controlled orchestration flow
- Progressive complexity
- Local-first usability before cloud dependency

The objective is to build a voice agent system that can scale from local experimentation to production-grade orchestration.

## Why This Matters

Many tutorials focus on making a voice interface work.

This project focuses on engineering it properly so it can evolve into:
- A tool-driven AI system
- A task automation agent
- A domain-specific voice assistant
- A backend-integrated AI orchestration layer

The base repository is the starting point of that architecture.
