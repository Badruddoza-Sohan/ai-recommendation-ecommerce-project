# 📘 Enterprise AI Fashion Platform System Handbook

---

## 1. System Architecture Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    FRONTEND LAYER                                       │
│                React 18 + TailwindCSS + Radix UI + tRPC Client                         │
│  - FashionStylist.tsx (Stylist Chat Interface)                                         │
│  - HumanEvalPortal.tsx (Post-Chat 5-Star Rating Widget)                                │
│  - EnterpriseAdminDashboard.tsx (Analytics & Funnel Metrics)                           │
│  - EnterpriseAIOpsWorkspace.tsx (Trace Viewer, Flags, Health)                          │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │ HTTP / tRPC / REST
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                     BACKEND LAYER                                      │
│                  Hono Server (Node.js) + tRPC Router (`api/router.ts`)                  │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                   AIOPS & AI ENGINE                                    │
│                                                                                        │
│  1. ObservabilityEngine     ──► Assigns trace_id, tracks 13 stage timings             │
│  2. SecurityGuardrails      ──► Scans prompt injections & enforces 60 req/min limit    │
│  3. FeatureFlagEngine       ──► Evaluates runtime toggles (RAG, Memory, Security)     │
│  4. StylistStateManager     ──► Extracted slots, negations, owned items in SQLite DB   │
│  5. Vector RAG Retriever    ──► NomIC 768-dim embeddings in `ai_embeddings`            │
│  6. ContextBuilder          ──► Combines prompt template + state block + RAG chunks    │
│  7. LLM Service             ──► Ollama (qwen2.5:7b-instruct)                           │
│  8. EnterpriseRanker        ──► Multi-factor scoring (Occasion, Weather, Stock...)     │
│  9. ExplainableAIModule     ──► Synthesizes natural language rationale                 │
│ 10. AnalyticsPipeline       ──► Records impressions, clicks, cart adds, purchases      │
└───────────────────────────────────────────┬────────────────────────────────────────────┘
                                            │
                                            ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                SQLITE DATABASE (`dev.db`)                              │
│  - products / inventory          - memory_entities          - ai_metrics               │
│  - ai_embeddings                 - chat_messages            - ai_feedback              │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Request Lifecycle & Timing Sequence

```
User Message Received
    │
    ├── 1. SecurityGuardrails validation (Prompt injection & Rate limit) [1ms]
    ├── 2. ObservabilityEngine generates TRC-ID & starts timer [1ms]
    ├── 3. IntentClassifier maps utterance to intent [12ms]
    ├── 4. StylistStateManager parses slots (Occasion, Avoid Colors, Owned) [4ms]
    ├── 5. Vector RAG Search queries `ai_embeddings` [22ms]
    ├── 6. ContextBuilder formats System Prompt + State Block + RAG [2ms]
    ├── 7. LLMService calls Ollama (qwen2.5:7b) [~2.8s]
    ├── 8. EnterpriseRanker scores & filters candidate SKUs [5ms]
    ├── 9. ExplainableAIModule attaches rationale breakdown [2ms]
    └── 10. Final payload serialized & dispatched to Frontend Client [1ms]
```

---

## 3. Database Schema Overview

- **`memory_entities`**: Stores dialogue slots (`sessionId`, `entity_type`, `entity_key`, `entity_value`).
- **`ai_embeddings`**: Unified vector store (`collection`, `source_id`, `embedding`, `metadata`).
- **`ai_metrics`**: Operational telemetry (`recommendation_shown`, `clicked`, `added_to_cart`, `purchased`).
- **`ai_feedback`**: Human evaluation ratings & notes (`sessionId`, `feedback`, `comment`).

---

## 4. Disaster Recovery & Operations Manual

- **Server Restart**: Zero state loss; all active session slots, chat history, and vector embeddings are stored in SQLite (`dev.db`).
- **LLM Fallback**: If local Ollama goes offline, `LLMService` automatically falls back to secondary API endpoints.
- **Rollback Prompt**: If a new prompt template causes quality drops, use `PromptVersionManager.activateVersion("v2.1.0-enterprise")` in the AIOps Workspace.
