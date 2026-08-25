Hosted prototype: Hugging Face Inference

Overview
- This project contains a lightweight prototype to use a hosted model (Hugging Face Inference API) for AI support fallback responses.

Setup
1. Create a Hugging Face API token (optional). If you set `HF_API_KEY` the router will call the HF inference API.
2. Optionally change `HF_API_URL` to point to a specific HF model (default: gpt2).

Environment variables
- `HF_API_KEY` - your Hugging Face API key (optional)
- `HF_API_URL` - inference URL (optional, default uses GPT-2 model endpoint)

How it works
- `server/hfClient.ts` - small wrapper to call HF inference endpoint.
- `api/supportRouter.ts` - when local KB confidence is low, this router will call HF (if `HF_API_KEY` present) and return its text as the assistant response.

Notes
- HF endpoints may return different JSON shapes depending on the model; `hfClient` attempts to normalize the common shapes.
- This is a prototype path for faster iteration. For production/privacy, consider adopting a local LLM runtime (llama.cpp) and a vector DB for RAG.

Running locally
- Start the app as usual. If `HF_API_KEY` is set, the support chat will use HF for fallback answers.

Example .env
HF_API_KEY=hf_xxx
domain=localhost

