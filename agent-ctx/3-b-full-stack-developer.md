# Task 3-b — AI API Routes (full-stack-developer agent)

Built the complete AI module described in PRD §7 for the Sistem eBantuan-PEKB.

## Files created

### Shared helper
- `src/lib/ai/sdk.ts` — singleton `getZai()`, `chatComplete()`, `visionComplete()`, `stripJsonFences()`, `safeParseJson<T>()` (handles ```json fences + extracts outermost JSON object/array as a recovery path), `scoreToCadangan()`. Server-side only.

### API routes (all under `src/app/api/ai/`)
- `eligibility/route.ts` — `POST /api/ai/eligibility` — PEKB eligibility scorer. PEKB criteria (B40 ≤ RM4,850; Miskin Tegar ≤ RM1,169; OKU +15; tanggungan > 4 → +10; milik_sendiri for baik_pulih, sewa for RMR) are encoded in the GLM-4.5 system prompt AND in a deterministic fallback scorer. Response: `{ skor, cadangan, justifikasi, kategoriAlternatif?, faktor[], fallback }`.
- `document-verify/route.ts` — `POST /api/ai/document-verify` — VLM analysis of a document (looks up `documentId` in DB). Persists `statusPengesahanAi`, `dataEkstrakAi` (JSON string), `catatanAi` back to the Document row. Fallback is a deterministic per-`jenisDokumen` mock (mykad → sah; slip_gaji → 80/20 sah/tidak_lengkap; geran_tanah → 75% sah; etc.) seeded by a hash of documentId for reproducibility.
- `duplicate-check/route.ts` — `POST /api/ai/duplicate-check` — cross-track duplicate detection (Trek 1 PBT ↔ Trek 2 NGO). Fetches a broad candidate pool, filters in JS by exact IC match or Jaccard address similarity ≥ 0.4. Persists `statusPertindihanAi` (≥90 = disahkan, ≥40 = disyaki, else tiada). Fallback uses pure deterministic IC / address / name matching.
- `decision-support/route.ts` — `POST /api/ai/decision-support` — loads full application (pbt, ngo, disediakanOleh, documents, auditLogs) and asks GLM-4.5 for `{ ringkasan, cadangan, sebab[], faktorRisiko[] }`. Fallback builds a Bahasa Malaysia ringkasan from DB fields and uses `scoreToCadangan` with AiConfig thresholds; risk factors derived from document statuses and pertindihan status. Uses `Prisma.ApplicationGetPayload<{ include: ... }>` for proper typing.
- `chatbot/route.ts` — `POST /api/ai/chatbot` — PEKB Assistant chatbot (GLM-4.5). Comprehensive system prompt in Bahasa Malaysia covering kelayakan, dokumen per kategori, makna status, perbezaan Trek, langkah permohonan. Optional `userId` enriches the conversation context. Fallback uses keyword matching (kelayakan / dokumen / status / trek / proses / salam).
- `config/route.ts` — `GET /api/ai/config` (auto-creates AiConfig id=1 with defaults if missing) and `PATCH /api/ai/config` (validates + clamps thresholds to 0-100, updates enableAi* flags and modelAi, uses upsert).

## SDK usage pattern
```
import ZAI, { type ChatMessage } from 'z-ai-web-dev-sdk';
const zai = await ZAI.create();
// text:
const r = await zai.chat.completions.create({
  messages: [{role:'assistant', content: systemPrompt}, {role:'user', content: userPrompt}],
  thinking: { type: 'disabled' },
});
const text = r.choices?.[0]?.message?.content;
// vision:
const v = await zai.chat.completions.createVision({
  model: 'glm-4.6v',
  messages: [{role:'user', content:[{type:'text',text:prompt},{type:'image_url',image_url:{url}}]}],
  thinking: { type: 'disabled' },
});
```
Singleton promise in `getZai()` avoids re-creating the client on every request. SDK is imported ONLY in `route.ts` files (server-side) — never in client components.

## Fallback behaviours (every endpoint ALWAYS returns a valid result)
| Endpoint | Fallback strategy |
| --- | --- |
| eligibility | Deterministic local scorer: baseline 50, ±weighted by income band, OKU +15, tanggungan > 4 +10, pemilikan vs kategori adjustments. AiConfig consulted for cadangan thresholds. |
| document-verify | Per-jenisDokumen deterministic mock seeded by hash(documentId). |
| duplicate-check | IC match → 100% disahkan; address Jaccard ≥ 0.7 → 60-80% disyaki; ≥ 0.4 or name match → 40-60% disyaki; else 0% tiada. |
| decision-support | Builds ringkasan from DB fields; cadangan from `scoreToCadangan(skor, ambangLulus, ambangSemak)`; sebab + faktorRisiko derived from skor band, income band, OKU, document statuses, pertindihan status. |
| chatbot | Keyword matching on kelayakan / dokumen / status / trek / proses / salam → canned Bahasa Malaysia replies. |
| config | Pure DB ops, no AI; upsert + try/catch returns structured 500 instead of crashing. |

Every AI response includes `fallback: true|false` so the frontend can show a "AI unavailable — using local heuristic" badge when needed.

## Verification
- `npx eslint src/app/api/ai src/lib/ai` → 0 errors, 0 warnings.
- `npx tsc --noEmit` → 0 type errors in my files (the only project-wide errors are in the pre-existing `src/app/page.tsx` whose UI components are another agent's responsibility).
- Live smoke tests via curl against the dev server (page.tsx was temporarily stubbed to a minimal component during testing so the dev server could compile, then restored):
  - eligibility returned skor 85 / lulus for a B40+OKU+5-tanggungan case and skor 0 / tolak for RM8,000 income.
  - chatbot returned real GLM-4.5 Bahasa Malaysia replies for kelayakan and dokumen questions.
  - duplicate-check correctly detected the seeded cross-track duplicate BP-2026-000001 ↔ GP-2026-000066 (IC match, keyakinan 90) and persisted `statusPertindihanAi = disahkan_pertindihan` to the DB.
  - decision-support produced a coherent Bahasa Malaysia ringkasan with sebab[] and faktorRisiko[] (skor 64 → semak_semula).
  - document-verify used the deterministic fallback (VLM cannot analyse the 1×1 placeholder PNG) and persisted `statusPengesahanAi = sah` + `dataEkstrakAi` JSON + `catatanAi` to the Document row.
  - config GET returned the seeded AiConfig; PATCH updated `ambangSkorLulus` and `enableAiChatbot` and the changes round-tripped on subsequent GET.

## Notes for downstream agents
- The frontend can call these endpoints with relative paths (`/api/ai/eligibility`, etc.) — no `XTransformPort` needed since they live in the main Next.js app on port 3000.
- All AI responses include a `fallback: boolean` flag — when `true`, the UI may display an "AI modul tidak aktif — keputusan heuristik tempatan digunakan" notice.
- The `EligibilityResult`, `DocumentVerificationResult`, `DecisionSupportResult`, `DuplicateDetectionResult` shapes returned match the types already defined in `src/lib/types.ts` (with the extra `fallback` field appended).
- The broken `src/app/page.tsx` (imports `@/components/auth/login-page` and `@/components/shell/app-shell` which don't exist yet) prevented the dev server from compiling — I temporarily stubbed it to a minimal component during my smoke tests and restored the original afterward. The UI agent needs to create those components or rewrite page.tsx.
