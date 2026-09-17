# TODO - ML Support Agent fixes & verification

## Step 1: Fix ML agent KB/data inconsistencies
- [ ] Update `server/mlSupportAgent.ts`:
  - [ ] Fix incorrect imports from `db/mlSchema.ts` (currently references a non-existent `knowledgeBase` export).
  - [ ] Align KB lookup to the actual schema (`supportKnowledge` from `db/schema.ts`).
  - [ ] Ensure `tryKnowledgeBase()` compiles and returns an `MLInferenceResult` compatible object.

## Step 2: Improve response/stat tracking (non-breaking)
- [ ] Update `server/mlSupportAgent.ts` to correctly compute/track `avgResponseTimeMs` (or remove unused field if required).

## Step 3: Run verification
- [ ] Run TypeScript typecheck (tsc --noEmit or npm script).
- [ ] Run tests (vitest).
- [ ] Smoke test API routes for `mlSupport.chat` and `support.chat` via local server.

## Step 4: Report data flow
- [ ] Produce a concise report explaining how user messages flow through:
  - [ ] `api/mlSupportRouter.ts` -> `server/mlSupportAgent.ts` -> DB (`ml_predictions`, `support_knowledge`, etc.)
  - [ ] and how learning/escalation updates are written back.
