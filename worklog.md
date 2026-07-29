# Sistem eBantuan-PEKB — Worklog

Project: Sistem Permohonan Bantuan Perumahan dan Geran PEKB (KPKT Malaysia)
Started: 2026-07-29

## Foundation (Completed by main orchestrator)

### Database Schema (prisma/schema.prisma)
- Models: PbtProfile, NgoProfile, User, Application, Document, AuditLog, Notification, AiConfig
- Matches PRD §11 database design (users, applications, documents, pbt_profiles, ngo_profiles, audit_logs)
- SQLite via Prisma, `bun run db:push` applied successfully

### Seed Data (prisma/seed.ts) — `bun run prisma/seed.ts`
- 10 PBT profiles (DBKL, MBSA, MBPJ, MPAJ, MPK, MBJB, MPPP, MBI, MPAG, MDKT)
- 15 NGO profiles (PEKB-accredited)
- 57 users across all roles (admin, kpkt daerah/negeri, pegawai_pbt, penilai_pbt, wakil_ngo, penilai_ngo)
- 133 applications (~65 Trek 1 PBT, ~65 Trek 2 NGO, 3 intentional cross-track duplicates)
- Documents, audit logs, notifications, AI config

### Demo Login Credentials
- Admin:    admin@kpkt.gov.my / admin123
- KPKT:     kpkt1@kpkt.gov.my / kpkt123
- PBT:      pegawai.mbsa@pbt.gov.my / pbt123
- NGO:      wakil.pekb-ngo-2024-001@ngo.org.my / ngo123

### Design System (src/app/globals.css)
- Navy (#0f2747) primary + Teal (#0d9488) accent — KPKT government identity (PRD §12.1)
- Glassmorphism utilities: `.glass`, `.glass-strong`, `.glass-card`, `.glass-nav`, `.gradient-mesh`
- Light + dark theme support (next-themes ready)
- Custom scrollbar, float/pulse-glow/shimmer animations
- Sticky footer pattern enforced

### Shared Modules
- `src/lib/types.ts` — all TypeScript types + label/color maps + formatters (maskIC, formatRM, formatDate)
- `src/lib/store.ts` — Zustand store (auth, SPA view routing, sidebar, chatbot, notifications)
- `src/lib/db.ts` — Prisma client (existing)
- `src/lib/utils.ts` — cn() helper (existing)

### API Conventions (for all subagents to follow)
- All API routes under `src/app/api/<resource>/route.ts`
- Use `import { db } from "@/lib/db"` for database access
- Use `import type { ... } from "@/lib/types"` for shared types
- Return JSON; standard error shape: `{ error: string }`
- Bahasa Malaysia in user-facing strings

### SPA Routing Convention
- Single route `/` only (src/app/page.tsx)
- View switching via Zustand `useAppStore` (`view`, `setView`)
- Components organized in `src/components/<feature>/`
- Use existing shadcn/ui components in `src/components/ui/`

---

## Task 3-c — Analytics & Admin API Routes

Task ID: 3-c
Agent: full-stack-developer
Task: Build analytics and admin API routes

Work Log:
- Read worklog.md, prisma/schema.prisma, src/lib/types.ts, src/lib/db.ts to understand context, models, and conventions.
- Created directory tree under `src/app/api/{analytics,admin}/...` for all required routes.
- Built analytics endpoints using Promise.all + Prisma `count`/`aggregate`/`groupBy` for high performance; used JS reduce for `byNegeri` / heatmap / per-PBT-NGO aggregation since SQLite Prisma groupBy cannot group by related-entity columns cleanly.
- Built admin CRUD endpoints with pagination (page/limit, capped at 100), search filters, and `Prisma.WhereInput` typing.
- Used Next.js 16 async params pattern (`const { id } = await params`) for all dynamic `[id]` routes.
- All admin mutations write an `AuditLog` entry (tindakan `kemaskini` / `cipta_pengguna`) for traceability — PRD §5 Pentadbir Sistem requirement.
- Soft-delete on DELETE /api/admin/users/[id] sets `statusAkaun="disekat"` (no hard delete).
- Reset-password endpoint resets `kataLaluanHash` to `"password123"` (simulated, matches seed convention).
- Bahasa Malaysia used throughout user-facing error strings.
- Ran `bun run lint` — only pre-existing error in `src/app/page.tsx` (React `set-state-in-effect` rule, introduced by previous agent). No lint errors introduced by this task's API routes.

Stage Summary:
### API route files created (17 files)

Analytics (6 files):
- `src/app/api/analytics/overview/route.ts` — `GET` → `{ totalApplications, totalApproved, totalRejected, totalPending, totalValueApproved, byTrek: { bantuan_perumahan: {total,approved,pending,rejected,valueApproved}, geran_pekb: {...} }, byStatus: {diluluskan:n, ...}, byKategori: {baik_pulih_rumah:n, ...}, byNegeri: [{negeri, count, approved, value}], avgSkorAi, duplicateDetected }`
- `src/app/api/analytics/trek-comparison/route.ts` — `GET` → `{ bantuan_perumahan: {total,approved,pending,rejected,valueApproved,byNegeri:[{negeri,total,approved,value}]}, geran_pekb: {...} }`
- `src/app/api/analytics/trend/route.ts?months=6` — `GET` → `[{ month: "2026-02", bantuan_perumahan:n, geran_pekb:n, approved:n }]` (last N months, capped 1-24)
- `src/app/api/analytics/pbt-performance/route.ts` — `GET` → `[{ pbtId, namaPbt, kodPbt, negeri, daerah, kategoriPbt, statusAkaunPbt, total, approved, pending, rejected, avgSkorAi, totalValueApproved }]` (sorted desc by total)
- `src/app/api/analytics/ngo-performance/route.ts` — `GET` → same shape as pbt-performance but with NGO fields (namaNgo, noAkreditasiPekb, negeriOperasi, statusAkreditasi)
- `src/app/api/analytics/heatmap/route.ts` — `GET` → `[{ negeri, total, approved, pending, valueApproved }]` (sorted desc by total)

Admin — Users (3 files):
- `src/app/api/admin/users/route.ts` — `GET` (paginated + filter role/search/statusAkaun, includes pbt/ngo relations) + `POST` (create, validates uniqueness of emel & noKP, returns 409 on conflict)
- `src/app/api/admin/users/[id]/route.ts` — `PATCH` (update peranan/statusAkaun/etc, optional pbtId/ngoId connect/disconnect) + `DELETE` (soft delete → statusAkaun="disekat")
- `src/app/api/admin/users/[id]/reset-password/route.ts` — `POST` (resets kataLaluanHash to "password123")

Admin — PBT (3 files):
- `src/app/api/admin/pbt/route.ts` — `GET` (paginated + filter search/negeri/statusAkaunPbt, includes _count users/applications) + `POST` (create, validates unique kodPbt)
- `src/app/api/admin/pbt/[id]/route.ts` — `PATCH` (update any PBT field)
- `src/app/api/admin/pbt/[id]/status/route.ts` — `PATCH` (update statusAkaunPbt, validates against enum {aktif, dalam_semakan, tidak_aktif})

Admin — NGO (3 files):
- `src/app/api/admin/ngo/route.ts` — `GET` (paginated + filter search/negeriOperasi/statusAkreditasi, includes _count) + `POST` (create, validates unique noPendaftaranRos & noAkreditasiPekb)
- `src/app/api/admin/ngo/[id]/route.ts` — `PATCH` (update any NGO field)
- `src/app/api/admin/ngo/[id]/status/route.ts` — `PATCH` (update statusAkreditasi, validates against enum {aktif, dalam_semakan, tamat_tempo})

Admin — Audit Logs (1 file):
- `src/app/api/admin/audit-logs/route.ts` — `GET` (paginated up to 200, filters: penggunaId, tindakan, applicationId, startDate, endDate; includes `pengguna` and `application` relations)

### Notes
- All list endpoints return shape `{ data, total, page, limit, totalPages }`.
- All mutations return the updated entity with relevant relations included.
- Error shape `{ error: string }` with appropriate status codes (400 validation, 404 not found, 409 conflict, 500 server).

---
Task ID: 3-a
Agent: full-stack-developer
Task: Build backend APIs for auth, applications, documents, notifications, audit logs

Work Log:
- Read worklog.md, prisma/schema.prisma, src/lib/types.ts, and src/lib/db.ts to understand existing schema, types, and conventions established by previous agents.
- Created directory structure under src/app/api/ for all five resource groups (auth, applications, documents, notifications, audit-logs) plus dynamic [id] sub-routes.
- Built /api/auth/login with email + kataLaluan validation against db.user, status check ("aktif"), pbt/ngo relation includes, audit log "log_masuk", and fake JWT token string (base64-encoded userId + timestamp).
- Built /api/auth/register with PBT (pbtKod → kodPbt) and NGO (ngoAkreditasi → noAkreditasiPekb) validation, duplicate emel/IC check, statusAkaun="aktif", and audit log "cipta_pengguna".
- Built /api/auth/verify-otp mock endpoint returning {verified:true} only when otp === "123456".
- Built /api/auth/me?userId=... returning user with pbt+ngo relations.
- Built GET /api/applications with role-based filtering (pegawai_pbt/penilai_pbt → pbtId, wakil_ngo/penilai_ngo → ngoId, pegawai_kpkt/admin → all), status/trek/search filters, pagination, includes pbt/ngo/disediakanOleh/_count.documents.
- Built POST /api/applications with noRujukan auto-generation (BP-2026-XXXXXX or GP-2026-XXXXXX, 6-digit zero-padded sequential based on count+1), statusPermohonan="draf" or "dihantar" if submit:true, auto-fills pbtId/ngoId from submitter role, audit log "cipta_draf"/"hantar_permohonan".
- Built GET /api/applications/[id] looking up by applicationId (cuid), includes pbt, ngo, disediakanOleh, documents, auditLogs (with pengguna).
- Built PATCH /api/applications/[id] accepting partial fields, tracks status changes and creates audit log "kemaskini_status"/"kemaskini", auto-sets tarikhDiluluskan on "diluluskan".
- Built POST /api/applications/[id]/action accepting {tindakan, nota?, alasan?, penggunaId?}. Maps lulus→"diluluskan"+tarikhDiluluskan, tolak→"ditolak"+alasanPenolakan, pulangkan→"dipulangkan", naik_peringkat→ advances pbt→kpkt_daerah→kpkt_negeri→selesai with appropriate statusPermohonan. Creates audit log + notification for submitter.
- Built GET /api/applications/stats/overview?userId&role returning total, byStatus, byTrek, byKategori, totalNilaiDiluluskan, and per-trek approved aggregates.
- Built POST /api/documents creating with statusPengesahanAi="belum_disemak", audit log "muat_naik_dokumen".
- Built GET /api/documents?applicationId listing documents newest first.
- Built PATCH /api/documents/[id] for updating jenisDokumen, statusPengesahanAi, dataEkstrakAi, catatanAi, etc.
- Built DELETE /api/documents/[id] with audit log "kemaskini" recording deletion.
- Built GET /api/notifications?userId with belumDibaca count.
- Built PATCH /api/notifications/[id]/read marking single notification as read.
- Built POST /api/notifications/read-all?userId using updateMany on unread notifications.
- Built GET /api/audit-logs?applicationId&penggunaId&tindakan&page=1&limit=50 including pengguna + application relations, newest first, with pagination.
- All routes use Next.js 16 async params pattern (`const { id } = await params`), NextRequest/NextResponse, try/catch error handling, Bahasa Malaysia user-facing strings, and `import { db } from "@/lib/db"`.
- Ran `bun run lint`: my new API route files produce zero lint errors. (One pre-existing error remains in src/app/page.tsx — setMounted inside useEffect — which is not in scope for this task and was left untouched.)

Stage Summary:
- src/app/api/auth/login/route.ts — POST login + JWT + audit log
- src/app/api/auth/register/route.ts — POST register with PBT/NGO validation
- src/app/api/auth/verify-otp/route.ts — POST mock OTP verify (123456)
- src/app/api/auth/me/route.ts — GET current user with relations
- src/app/api/applications/route.ts — GET list (role-filtered, paginated) + POST create (auto noRujukan)
- src/app/api/applications/[id]/route.ts — GET single + PATCH update
- src/app/api/applications/[id]/action/route.ts — POST action (lulus/tolak/pulangkan/naik_peringkat) + notification
- src/app/api/applications/stats/overview/route.ts — GET dashboard aggregates
- src/app/api/documents/route.ts — GET list + POST create
- src/app/api/documents/[id]/route.ts — PATCH update + DELETE
- src/app/api/notifications/route.ts — GET list for user
- src/app/api/notifications/[id]/read/route.ts — PATCH mark read
- src/app/api/notifications/read-all/route.ts — POST mark all read
- src/app/api/audit-logs/route.ts — GET filtered list with pagination

Notes for downstream agents:
- All endpoints accept userId/penggunaId in the request body or query (no real auth middleware yet — frontend should pass the logged-in user's id).
- The fake JWT returned by /api/auth/login has format `demo.<base64(userId)>.<timestamp>` — frontend can store and pass userId directly for now.
- noRujukan generation uses count+1 per trek; this is race-condition-prone under concurrent writes but acceptable for the PoC dummy DB.
- The naik_peringkat flow uses the peringkatSemasa field as the source of truth: draf→pbt→kpkt_daerah→kpkt_negeri→selesai.
- Notifications are created with jenis="status" for action-driven events; frontend can poll GET /api/notifications for the bell icon.
- All error responses follow the `{ error: string }` convention from worklog.md.
- All audit logs auto-include penggunaId; the [id]/action route uses penggunaId from body (falls back to submitter if missing).

---
Task ID: 3-b
Agent: full-stack-developer
Task: Build AI API routes (eligibility, doc verification, duplicate detection, decision support, chatbot, config)

Work Log:
- Read worklog.md, prisma/schema.prisma, src/lib/types.ts, src/lib/db.ts, package.json, skills/LLM/SKILL.md, skills/VLM/SKILL.md, skills/LLM/scripts/chat.ts, skills/VLM/scripts/vlm.ts to understand SDK conventions and existing project state.
- Confirmed `z-ai-web-dev-sdk@^0.0.18` is installed and the SDK API is: `import ZAI from 'z-ai-web-dev-sdk'` → `const zai = await ZAI.create()` → `zai.chat.completions.create({ messages, thinking: { type: 'disabled' } })` for text, `zai.chat.completions.createVision({ model: 'glm-4.6v', messages, thinking })` for vision.
- Created shared helper module `src/lib/ai/sdk.ts` exporting: `getZai()` (singleton), `chatComplete(system, user)` (text), `visionComplete(prompt, imageUrl, model?)` (vision), `stripJsonFences(raw)`, `safeParseJson<T>(raw)` (with ```-fence stripping + first-{ ... last-} extraction fallback), and `scoreToCadangan(skor, lulus, semak)`.
- Built `POST /api/ai/eligibility` with PEKB criteria in the system prompt (B40 ≤ RM4,850; Miskin Tegar ≤ RM1,169; OKU +15; tanggungan > 4 → +10; milik_sendiri preferred for baik_pulih, sewa for RMR). Deterministic fallback scorer mirrors the same criteria and consults `AiConfig` thresholds. Response always includes `fallback: boolean`.
- Built `POST /api/ai/document-verify` that looks up the document by `documentId`, attempts VLM analysis on a placeholder/base64 image, persists `statusPengesahanAi`, `dataEkstrakAi` (JSON string), `catatanAi` back into the Document row. Fallback returns deterministic mock per `jenisDokumen` (mykad → sah; slip_gaji → 80% sah / 20% tidak_lengkap; etc.) using a deterministic hash of the documentId.
- Built `POST /api/ai/duplicate-check` that resolves the application, then fetches a broad candidate pool (excluding self), filters in JS by exact IC match or Jaccard address similarity ≥ 0.4, then asks the LLM to assess. Persists `statusPertindihanAi` (≥90 = disahkan, ≥40 = disyaki, else tiada). Fallback uses deterministic IC/address/name matching.
- Built `POST /api/ai/decision-support` that loads the full application (pbt, ngo, disediakanOleh, documents, auditLogs), builds a structured payload for the LLM, and parses the JSON response into `DecisionSupportResult`. Fallback constructs a Bahasa Malaysia ringkasan from DB fields and uses `scoreToCadangan` with AiConfig thresholds; risk factors are derived from document statuses and pertindihan status. Used `Prisma.ApplicationGetPayload<{ include: ... }>` to get a properly-typed application-with-relations.
- Built `POST /api/ai/chatbot` with a comprehensive PEKB Assistant system prompt covering kelayakan, dokumen per kategori, makna status, perbezaan Trek, langkah permohonan. Optional `userId` enriches the conversation context with the user's name/role/PBT/NGO. Fallback uses keyword matching (kelayakan / dokumen / status / trek / proses / salam) to return canned Bahasa Malaysia replies.
- Built `GET /api/ai/config` (returns AiConfig row id=1, auto-creates with defaults if missing) and `PATCH /api/ai/config` (validates and clamps thresholds to 0-100, updates enableAi* flags and modelAi, uses upsert so a missing row is created).
- Verified all routes work end-to-end via curl against the dev server (the broken `src/app/page.tsx` from another agent was temporarily stubbed during testing and restored afterward): eligibility returned skor 85 lulus for a B40+OKU case and skor 0 tolak for RM8,000 income; chatbot returned real GLM-4.5 Bahasa Malaysia replies; duplicate-check correctly detected the seeded cross-track duplicate BP-2026-000001 ↔ GP-2026-000066 (IC match) and persisted `statusPertindihanAi = disahkan_pertindihan`; decision-support produced a coherent Bahasa Malaysia ringkasan with reasons and risk factors; document-verify used the deterministic fallback (VLM couldn't analyse the 1×1 placeholder PNG) and persisted `statusPengesahanAi = sah` + `dataEkstrakAi` + `catatanAi` to the Document row; config GET/PATCH round-tripped correctly.
- Ran `npx eslint src/app/api/ai src/lib/ai` → 0 errors. Ran `npx tsc --noEmit` against the AI routes → 0 type errors in my files (the only project-wide errors are the pre-existing `src/app/page.tsx` missing-component issues that the UI agent will fix).

Stage Summary:
- API route files created:
  - `src/app/api/ai/eligibility/route.ts` — POST AI eligibility screening with deterministic fallback scorer.
  - `src/app/api/ai/document-verify/route.ts` — POST VLM document verification, persists result to Document row, deterministic fallback per document type.
  - `src/app/api/ai/duplicate-check/route.ts` — POST cross-track duplicate detection (IC + address Jaccard similarity), persists `statusPertindihanAi`, deterministic fallback.
  - `src/app/api/ai/decision-support/route.ts` — POST AI decision support with full application relations, builds Bahasa Malaysia summary, fallback uses score thresholds from AiConfig.
  - `src/app/api/ai/chatbot/route.ts` — POST PEKB Assistant chatbot (GLM-4.5), Bahasa Malaysia system prompt covering kelayakan/dokumen/status/trek/proses, keyword-matched fallback.
  - `src/app/api/ai/config/route.ts` — GET (auto-creates AiConfig id=1) and PATCH (validates + clamps thresholds, updates enable flags, upsert).
- Shared helper:
  - `src/lib/ai/sdk.ts` — singleton ZAI client (`getZai`), `chatComplete`, `visionComplete`, `stripJsonFences`, `safeParseJson<T>` (handles ```json fences + extracts outermost {…} or […] if direct parse fails), `scoreToCadangan`. Server-side only — never imported from client components.
- SDK usage pattern: `import ZAI, { type ChatMessage } from 'z-ai-web-dev-sdk'` → `const zai = await ZAI.create()` → `zai.chat.completions.create({ messages: [{role:'assistant', content: systemPrompt}, {role:'user', content: userPrompt}], thinking: { type: 'disabled' } })` for text; `zai.chat.completions.createVision({ model: 'glm-4.6v', messages: [{role:'user', content: [{type:'text',text:prompt},{type:'image_url',image_url:{url}}]}], thinking })` for vision. SDK is awaited lazily via a singleton promise so the import never blocks cold-start.
- Fallback behaviours (all endpoints NEVER return an error to the client):
  - eligibility: deterministic local scorer (baseline 50, +/- weighted by income band, OKU, tanggungan, pemilikan vs kategori), consults AiConfig thresholds.
  - document-verify: deterministic per-jenisDokumen mock using a hash of documentId for reproducibility; mykad → sah, slip_gaji → 80/20 sah/tidak_lengkap, etc.
  - duplicate-check: exact IC → 100% (disahkan), address Jaccard ≥ 0.7 → 60-80% (disyaki), ≥ 0.4 or name match → 40-60% (disyaki), else 0% (tiada).
  - decision-support: builds ringkasan from DB fields ("Permohonan {noRujukan} bagi {namaPenerima}…"), recommendation from `scoreToCadangan(skor, ambangLulus, ambangSemak)`, risk factors from document statuses + pertindihan status.
  - chatbot: keyword matching on kelayakan / dokumen / status / trek / proses / salam → canned Bahasa Malaysia replies.
  - config: no fallback needed (pure DB ops) but uses upsert + try/catch so a missing row is auto-created and DB errors return a structured 500 instead of crashing.

---
Task ID: 4-c
Agent: full-stack-developer
Task: Build role-based dashboard views (PBT, NGO, KPKT, Admin)

Work Log:
- Read worklog.md, src/lib/types.ts, src/lib/store.ts, src/lib/api-client.ts, src/components/shared/badges.tsx, src/components/shell/app-shell.tsx, src/app/globals.css, and the relevant backend API route files (applications/stats/overview, analytics/overview, analytics/trek-comparison, analytics/trend, applications list, audit-logs, admin/audit-logs, admin/users, admin/pbt, admin/ngo, ai/config) to fully understand response shapes and conventions.
- Inspected shadcn/ui component APIs (card, button, badge, skeleton, table, separator) and confirmed recharts + framer-motion + sonner are installed.
- Implemented 4 dashboard views as `"use client"` components, all text in Bahasa Malaysia, with glassmorphism styling (`.glass-card`), responsive grids (`grid-cols-2 lg:grid-cols-4` / `grid-cols-2 lg:grid-cols-3 xl:grid-cols-6`), Skeleton loading states, framer-motion entrance animations, and sonner toast error handling.

Stage Summary:
### Files created (4 files)

- `src/components/views/pbt-dashboard.tsx` — `PbtDashboardView` (Trek 1 PBT)
  - Welcome header with PBT badge (namaPbt + kodPbt)
  - 4 stat cards (Total, Sedang Diproses, Diluluskan, Ditolak) fetched from `/api/applications/stats/overview?role=pegawai_pbt`
  - Quick actions: Permohonan Baharu → `setView("new-application")`, Lihat Senarai → `setView("applications")`
  - Recent applications table (last 5, with no rujukan / penerima / kategori / skor / status / tarikh, clickable row → detail view)
  - PBT profile card (negeri, daerah, kategori, status akaun)
  - Notifications preview (last 3)
  - "Trek 1 · Bantuan Perumahan" info section with 2 categories (Baik Pulih Rumah, Rumah Mesra Rakyat) — Hammer / Home icons
- `src/components/views/ngo-dashboard.tsx` — `NgoDashboardView` (Trek 2 NGO)
  - Welcome header with NGO badge (namaNgo + noAkreditasiPekb)
  - 4 stat cards fetched from `/api/applications/stats/overview?role=wakil_ngo`
  - Quick actions, recent applications table
  - NGO profile card (no ROS, no akreditasi PEKB, negeri operasi, daerah operasi, status akreditasi)
  - Notifications preview
  - "Trek 2 · Geran PEKB" info section with 2 categories (Geran Ekonomi/Mikro-usahawan, Bantuan Sara Hidup) — HandCoins / HeartHandshake icons
- `src/components/views/kpkt-dashboard.tsx` — `KpktDashboardView` (Trek 1 + Trek 2)
  - Welcome header with role badge (supports both `pegawai_kpkt` and `pegawai_kpkt_pusat`); shows duplicate-detection count
  - 6 stat cards (Total, Trek 1, Trek 2, Diluluskan, Ditolak, Jumlah Nilai Diluluskan via `formatRM`) from `/api/analytics/overview`
  - Trek comparison section: 2-column glass cards with `TrekBadge` (total, approved, pending, rejected, value approved, approval rate)
  - Baris Semakan table from `/api/applications?status=semakan_daerah` (or `semakan_negeri` for pusat) with Semak button → review-queue view
  - Recent activity (last 5 audit logs) from `/api/audit-logs?limit=5`
  - Notifications preview
  - High-value pending approvals section (only when `isPusat`): filters applications ≥ RM 50,000 awaiting pusat approval
  - Monthly trend mini-chart (recharts `BarChart` via `ResponsiveContainer`) comparing Trek 1 vs Trek 2 over 6 months, with Bahasa Malaysia month labels (Jan/Feb/Mac/...)
- `src/components/views/admin-dashboard.tsx` — `AdminDashboardView` (Pentadbir Sistem)
  - "Pusat Pentadbiran Sistem" header with Pentadbir badge + RoleBadge
  - 5 system overview cards (Total Pengguna, Total PBT, Total NGO, Total Permohonan, Total Nilai Diluluskan) — uses `total` field from `/api/admin/users?limit=1`, `/api/admin/pbt?limit=1`, `/api/admin/ngo?limit=1`, plus `/api/analytics/overview`
  - Pintasan Pentadbiran grid: 4 admin link cards (admin-users, admin-pbt-ngo, admin-audit, admin-ai-config) with icons + descriptions
  - System health card: shows AI config (modelAi, ambangSkorLulus, ambangSkorSemak) and 4 toggle indicators (screening, doc verify, chatbot, fraud) from `/api/ai/config`
  - Recent audit logs table (last 8) from `/api/admin/audit-logs?limit=8` with `max-h-96 overflow-y-auto scrollbar-thin`
  - Recent user registrations (last 5) with masked IC

### Key decisions
- All 4 dashboards use a consistent `StatCard` pattern (icon in colored rounded square, big tabular-nums number, label, optional Activity-icon trend) inlined per file to keep them self-contained.
- All API calls use `api.get` from `@/lib/api-client`, which auto-injects `userId` for endpoints that need it. For role-scoped stats endpoints, the explicit `role` query param is passed.
- Used `Promise.all` to parallelise independent fetches and a single `loading` boolean to gate Skeleton rendering.
- For KPKT pusat vs daerah, the pending-review status filter switches (`semakan_negeri` vs `semakan_daerah`) and the high-value section only renders when `isPusat` is true.
- Recharts `BarChart` chosen over LineChart for clearer per-month comparison between the two treks; data transformed via `useMemo` with Bahasa Malaysia month formatting.
- All error handling centralised in a single try/catch per dashboard that fires a `sonner` toast with the error message and leaves the existing state empty so Skeletons fall back to graceful empty-state UIs.
- Fixed an initial import mistake: `AppView` type lives in `@/lib/store`, not `@/lib/types` — corrected the import in admin-dashboard.
- Ran `bun run lint` → **0 errors** across the whole project (exit code 0). The pre-existing page.tsx issues mentioned in earlier worklog entries have been resolved by other agents.

---
Task ID: 4-e
Agent: full-stack-developer
Task: Build admin views, notifications, profile, AI chatbot widget

Work Log:
- Read worklog.md, src/lib/types.ts, src/lib/store.ts, src/lib/api-client.ts, src/components/shared/badges.tsx, src/app/globals.css, and all relevant backend API route files to confirm request/response shapes.
- Inspected shadcn/ui component APIs (Dialog, Select, Table, Tabs, AlertDialog, Switch, Avatar, Skeleton) for correct usage.
- Built admin-users.tsx: page header with Tambah Pengguna button; filter bar (search + role + status + PBT/NGO affiliation); glass data table with skeletons; Add/Edit dialog with conditional PBT/NGO dropdowns; Reset password AlertDialog; Block/Activate AlertDialog; pagination (10/page).
- Built admin-pbt-ngo.tsx: Tabs (PBT | NGO); each tab has search + status filter + glass table with _count columns + Add/Edit dialog + status toggle + soft-delete AlertDialog.
- Built admin-audit.tsx: header with Export (toast); immutability banner (PRD §9/§15.1); filter bar (date range + tindakan dropdown + penggunaId + applicationId); color-coded tindakan badges; 50/page pagination; clickable application ref link.
- Built admin-ai-config.tsx: current config tiles; editable form with ambang skor + live TOLAK/SEMAK/LULUS preview bar; 4 toggle switches; 4 module cards with Uji Modul button; AI governance notice (PRD §7.6).
- Built notifications.tsx: header with Tandai Semua Dibaca button; filter chips (All/Unread/Sistem/Status/Emel/SMS); notification cards with jenis badge + unread ring; click marks read + navigates to application-detail; empty state.
- Built profile.tsx: header card (avatar, role badge, status); 6 info items; conditional affiliation card (PBT/NGO); account status card; recent activity (5 latest audit logs); Kemaskini Profil dialog (noTelefon+jawatan editable, nama/emel read-only); Tukar Kata Laluan dialog (mock).
- Built ai-chatbot-widget.tsx: floating button (fixed bottom-right) with pulse-glow + Sparkles; chat panel with header (GLM-4.5 badge), scrollable messages, 4 quick suggestion chips, input + send button, 3-dot typing indicator; framer-motion entrance (slide up + fade); responsive (mobile full-width bottom sheet / desktop 380px fixed); uses Zustand chatbotOpen + toggleChatbot; sends last 6 messages as history.
- All views are "use client"; all text in Bahasa Malaysia; glass styling throughout; loading skeletons + error retry + empty states everywhere.
- Ran `bun run lint` — verified zero new lint errors in my 7 files.

Stage Summary:
- src/components/views/admin-users.tsx — AdminUsersView (filter + table + add/edit/reset/block dialogs + pagination)
- src/components/views/admin-pbt-ngo.tsx — AdminPbtNgoView (Tabs PBT/NGO with full CRUD + status toggle)
- src/components/views/admin-audit.tsx — AdminAuditView (immutable audit log viewer with date/tindakan/penggunaId/applicationId filters, 50/page)
- src/components/views/admin-ai-config.tsx — AdminAiConfigView (threshold form with live preview, 4 module toggles, 4 module cards, governance notice)
- src/components/views/notifications.tsx — NotificationsView (filter chips, mark-all-read, click-to-open application)
- src/components/views/profile.tsx — ProfileView (profile/affiliation/status/recent activity + edit profile & change password dialogs)
- src/components/views/ai-chatbot-widget.tsx — AIChatbotWidget (floating button + glass panel + typing indicator + quick suggestions)

Key decisions:
- Conditional PBT/NGO dropdowns in user form (only show for relevant roles)
- Soft delete for PBT/NGO via status endpoint (preserves referential integrity)
- PBT/NGO affiliation filter in users view applied client-side (server doesn't expose)
- Profile edit uses admin PATCH endpoint (self-edit permitted, no dedicated endpoint)
- Change password mocked with input validation (min 6, must match, must differ)
- Audit date range sends ISO timestamps; endDate gets end-of-day for inclusive filtering
- AI config live preview bar updates in real-time as thresholds change
- Chatbot sends last 6 messages as history (matches backend slice(-6))
- Color coding for audit tindakan: green=lulus, red=tolak, amber=pulangkan, sky=hantar/naik_peringkat, gray=log_masuk, purple=cipta_pengguna, slate=kemaskini, teal=muat_naik_dokumen

---
Task ID: 4-b
Agent: full-stack-developer
Task: Build core shared views (applications list, application detail, application wizard)

Work Log:
- Read worklog.md, src/lib/types.ts, src/lib/store.ts, src/lib/api-client.ts, src/components/shared/badges.tsx, src/components/shell/app-shell.tsx, src/app/globals.css to absorb the full project context (schema, API contracts, design system, shared badges, view-routing convention).
- Listed src/app/api/applications/* and read route.ts + [id]/route.ts + [id]/action/route.ts to confirm exact request/response shapes: GET list returns `{ data, total, page, limit }`; GET single returns `{ application }` with pbt/ngo/disediakanOleh/documents/auditLogs.pengguna relations; POST action accepts `{ tindakan, nota, alasan, penggunaId }` and updates statusPermohonan + peringkatSemasa + audit log + notification. Confirmed duplicate-check auto-persists `statusPertindihanAi`, while eligibility & decision-support return only (so detail view PATCHes AI fields after regenerating).
- Read ai/document-verify, ai/eligibility, ai/decision-support, ai/duplicate-check routes to confirm response shapes for the detail view's AI cards.
- Built `ApplicationsListView` — comprehensive list with:
  - Page header + "Permohonan Baharu" button (role-gated via `canSubmit`).
  - 4 stat cards (Total, Dalam Semakan, Diluluskan, Ditolak) using `glass-card` + gradient tones, populated from `/api/applications/stats/overview`.
  - Trek filter tabs (Semua / Trek 1 PBT / Trek 2 NGO) — auto-narrowed based on role (PBT only sees Trek 1, NGO only sees Trek 2, KPKT/Admin sees all).
  - Filter bar with debounced search (no rujukan / nama penerima / no KP), status dropdown (all 8 statuses), kategori dropdown (client-side filter since the list API doesn't filter by kategori).
  - shadcn `Table` with columns No Rujukan, Penerima, Trek/Kategori (md+), Skor AI (SkorIndicator), Status, Tarikh (sm+), Tindakan (Lihat button). Click row → `setActiveApplication` + `setView("application-detail")`.
  - Pagination controls with `page`/`totalPages` derived from total/PAGE_SIZE.
  - Loading skeleton (6 rows), error state with retry, empty state with icon + CTA.
  - `motion.tr` for staggered row entrance animation.
  - Fully responsive: table scrolls horizontally on mobile (Table component already wraps in `overflow-x-auto`), hidden columns on small screens.
- Built `ApplicationDetailView` — single application detail with:
  - Header with back button, No Rujukan (mono), Trek badge, Status badge, Pertindihan badge, penerima/kategori line, created/updated/approved dates.
  - 2-column layout (lg:grid-cols-3, left col-span-2 + right col-span-1 sticky on desktop).
  - Left: Penerima info card (nama, masked IC via `maskIC()`, alamat, telefon, negeri/daerah); Isi Rumah card (pendapatan via `formatRM()`, tanggungan, OKU + jenis, pemilikan, jenis rumah); Trek-specific card (Trek 1: zon/mukim + no rujukan pemeriksaan + nilai anggaran kerja; Trek 2: kawasan operasi + cadangan pelan + nilai geran + nama/jenis perniagaan); Documents card with list of documents showing jenis badge, PengesahanBadge, saiz/tarikh, AI catatan, and "Semak AI" button per doc calling `/api/ai/document-verify`.
  - Right (sticky, scrollable): AI Analysis card (big SkorIndicator, cadangan, PertindihanBadge, justifikasi notaAi, decision ringkasan); Decision Support card (sebab list, faktor risiko list with amber bullets); Timeline card (vertical timeline with audit logs, tindakan + pengguna + perincian + formatDateTime); Review actions card (only for `canReview` roles — Textarea for notaPenilai, 4 buttons Lulus/Tolak/Pulangkan/Naik Peringkat, AlertDialog for tolak confirmation with alasan textarea).
  - "Jana Semula Analisis AI" button: calls eligibility → PATCH application with new skor/cadangan/notaAi → duplicate-check (auto-persists) → decision-support → refresh detail. Loading state on button.
  - Loading skeleton matching layout, error state with back button.
- Built `ApplicationWizardView` — 5-step wizard with:
  - Auto-detect trek from `useRoleAccess()`: PBT → `bantuan_perumahan`, NGO → `geran_pekb`. Trek badge shown in header.
  - Progress stepper (5 steps with icons, current highlighted, completed = emerald check, click to navigate back to completed steps, Progress bar).
  - Step 1 — Penerima: nama, no KP (regex validated `^\d{6}-?\d{2}-?\d{4}$`), alamat (Textarea), negeri (16-state Select), daerah, telefon.
  - Step 2 — Isi Rumah: pendapatan (number, B40/Miskin Tegar hint), tanggungan (number), OKU switch (reveals jenis OKU Select when on), pemilikan rumah (Select), jenis rumah (Select).
  - Step 3 — Kategori: RadioGroup of 2 kategori based on trek (Trek 1: baik_pulih_rumah / rumah_mesra_rakyat; Trek 2: geran_ekonomi / bantuan_sara_hidup). Conditional fields: Trek 1 → zon mukim, no rujukan pemeriksaan, nilai anggaran kerja; Trek 2 → kawasan operasi, nilai geran dipohon, nama/jenis perniagaan (only for geran_ekonomi), cadangan pelan guna (Textarea).
  - Step 4 — Dokumen: dynamic doc checklist built from `requiredDocsForTrek()` (mykad, slip_gaji always required; kad_oku if statusOku; gambar_rumah + optional geran_tanah/laporan_tapak for Trek 1; pelan_perniagaan required for geran_ekonomi). Each row uses native `<input type="file">` wrapped in a Button label (no actual upload — just captures filename/size/mime into pendingDocs state). Shows uploaded filename + size + emerald check, plus "Buang"/"Pilih Fail" buttons.
  - Step 5 — Semakan: read-only review cards (Penerima / Isi Rumah / Kategori / Dokumen) showing all entered data with `formatRM()` for currency values.
  - Navigation buttons: Sebelumnya (prev), Seterusnya (next) with per-step validation; on step 4 can skip; on step 5 — "Simpan Draf" (POST submit:false) and "Hantar Permohonan" (POST submit:true) buttons with separate loading states via submitMode.
  - On submit success: creates application → if pendingDocs, creates each document via POST `/api/documents` (Promise.all, tolerant to per-doc failure) → toast → setActiveApplication(newId) → setView("application-detail").
  - Warning card on step 5 if required docs not all uploaded.
  - Field-level validation with inline error messages (AlertCircle icon).
  - AnimatePresence transitions between steps (slide x), framer-motion for stepper.
- All 3 views use existing shadcn/ui components (Button, Input, Label, Textarea, Select, Table, Tabs, Card, Badge, Skeleton, AlertDialog, Progress, Switch, RadioGroup, Separator) — no custom components built.
- All text in Bahasa Malaysia. Glassmorphism via `.glass-card` for cards. Responsive mobile-first with `sm:`/`md:`/`lg:` breakpoints.
- Ran `bun run lint` — my 3 files produce 0 lint errors (only pre-existing errors remain in src/components/views/analytics.tsx, src/components/shell/app-shell.tsx, src/components/views/profile.tsx, src/components/views/admin-users.tsx — those are owned by other agents).
- Ran `npx tsc --noEmit` — my 3 files produce 0 type errors.

Stage Summary:
### Files created/modified (3 files — all overwrites of stubs):
- `src/components/views/applications-list.tsx` — `ApplicationsListView`: stats summary cards, trek tabs, filter bar (search + status + kategori), shadcn Table with row click → detail, pagination, loading/error/empty states, role-aware "Permohonan Baharu" button. ~330 LOC.
- `src/components/views/application-detail.tsx` — `ApplicationDetailView`: 2-column layout, left column has Penerima/Isi Rumah/Trek-specific/Documents cards; right column (sticky, scrollable) has AI Analysis / Decision Support / Timeline / Review actions cards. AI regeneration calls eligibility+decision-support+duplicate-check and PATCHes application. Document verify button per doc. AlertDialog confirmation for reject. ~530 LOC.
- `src/components/views/application-wizard.tsx` — `ApplicationWizardView`: 5-step wizard with progress stepper, per-step validation, trek auto-detection from role, dynamic doc checklist, review step, and "Simpan Draf"/"Hantar Permohonan" actions that POST application + create documents in parallel. ~620 LOC.

### Key UX decisions:
- **Stats source of truth**: Stats summary cards in list view pull from `/api/applications/stats/overview` (already exists) — separate from the paginated table query, so changing filters/search in the table doesn't make the top-level stats change (intentional — stats reflect the user's overall scope, table reflects the active filter).
- **Kategori filter**: applied client-side after fetching from `/api/applications` because the list API doesn't support `kategori` query — the dataset per page is small (≤10 rows) so client filtering is acceptable.
- **Trek tabs auto-narrowing**: PBT users only see "Semua" + "Trek 1 PBT" tabs (no point showing Trek 2 tab when their role can never see Trek 2 records); similarly for NGO. KPKT/Admin sees all 3 tabs.
- **Detail view AI flow**: "Jana Semula Analisis AI" calls all 3 AI endpoints (eligibility → PATCH /applications/[id] with new skor/cadangan/nota; duplicate-check → auto-persists statusPertindihanAi; decision-support → displayed inline only). This matches backend persistence model where eligibility/decision-support are stateless (no DB writes from AI routes) while duplicate-check writes back.
- **Detail view sticky right column**: On desktop, the right column (AI Analysis / Decision Support / Timeline / Review Actions) is `lg:sticky lg:top-20` and scrolls independently within `max-h-[calc(100vh-6rem)]` — the long left column (Penerima / Isi Rumah / Trek / Documents) can be browsed while reviewer keeps the AI summary + action buttons in view.
- **Wizard submit flow**: Rather than creating a draft on step 4 then uploading docs then submitting (3 network round-trips), the wizard collects all data + pending docs in state and submits everything atomically on step 5: POST `/api/applications` (submit:true|false) first to get the applicationId, then `Promise.all` over pendingDocs calling POST `/api/documents` with that ID. Per-doc failures are tolerated (caught + swallowed) so a flaky single-doc upload doesn't block the whole submission.
- **Wizard validation**: Manual per-step validation (no react-hook-form / zod — kept simple and dependency-light for this PoC). IC format regex, positive-number checks, required field checks. Errors clear as user types.
- **Wizard step navigation**: Can navigate back to any completed step by clicking the stepper, but cannot jump forward past an unvalidated step (forward only via "Seterusnya" button which runs validation). Step 4 (Documents) can be skipped — submission still works but with a warning card on step 5.
- **Document upload in wizard**: Uses native `<input type="file">` wrapped in a shadcn Button via `<label>` — no actual file upload happens (matches backend which only stores metadata: namaFail, saizFail, jenisMime). The file content is never sent; only the metadata is captured client-side and POSTed to `/api/documents` on final submit.

---
Task ID: 4-d
Agent: full-stack-developer
Task: Build review queue and analytics views

Work Log:
- Read worklog.md, src/lib/types.ts, src/lib/store.ts, src/lib/api-client.ts, src/components/shared/badges.tsx, src/app/globals.css, all 6 analytics API routes, and the applications list/action API routes to understand context, conventions, response shapes, and the design system.
- Verified `recharts`, `framer-motion`, `sonner`, `lucide-react`, and all shadcn/ui components (Card, Button, Badge, Table, Tabs, Select, Skeleton, Dialog, Textarea, Separator, Label) are installed and importable.
- Smoke-tested all analytics endpoints (`/api/analytics/overview`, `/api/analytics/trek-comparison`, `/api/analytics/trend?months=6`, `/api/analytics/heatmap`, `/api/analytics/pbt-performance`, `/api/analytics/ngo-performance`) and the applications list endpoint against the running dev server — all return well-formed JSON matching the documented shapes.
- Overwrote `src/components/views/review-queue.tsx` (was a stub) with a full `ReviewQueueView`:
  - Role-aware defaults via `getRoleDefaults(role)`: penilai_pbt → semakan_pbt_ngo + Trek 1, penilai_ngo → semakan_pbt_ngo + Trek 2, pegawai_kpkt → semakan_daerah, pegawai_kpkt_pusat → semakan_negeri, admin → semakan_pbt_ngo (no trek restriction). Subtitle line per role.
  - Filter bar: Tabs (Menunggu Semakan / Dipulangkan / Semua), trek Select (Semua / Trek 1 / Trek 2), debounced search Input (no rujukan / nama / KP).
  - Stats summary row (3 cards): Jumlah Dalam Baris, Purata Skor AI, Kes Pertindihan Dikesan — computed from the full filtered result set fetched with `limit=200` so summary stats and paged display come from a single request.
  - AI-priority sort: client-side `priorityRank` = `pertindihanPriority × 1000 − skorKelayakanAi` (disahkan_pertindihan=3, disyaki=2, tiada=0). Top 3 cards show a "Keutamaan #N" ribbon; disahkan_pertindihan cards get a red ring.
  - Application cards (glass-card, 1-col mobile / 2-col tablet / 3-col xl): No Rujukan + Trek badge + Status badge header; Penerima name + masked IC + alamat/negeri; KategoriBadge + pendapatan/tanggungan chips + OKU indicator (purple); AI section with SkorIndicator (sm) + cadangan AI pill (colored) + sebab cadangan + PertindihanBadge; nilai dipohon + tarikh; "Semak Permohonan" primary button → `setActiveApplication(id)` + `setView("application-detail")`; 4 quick action buttons (Lulus green / Tolak red / Pulangkan amber / Naik Peringkat blue — blue explicitly requested by spec).
  - Action dialog (shadcn Dialog): title/description per ACTION_META, app summary box, Textarea for nota/alasan (alasan wajib for tolak — confirm button disabled until non-empty), confirm button colored to match the action. On confirm calls `POST /api/applications/[id]/action` with `{ tindakan, penggunaId, nota|alasan }`, toast.success on success, toast.error on failure, then refreshes the list.
  - Loading skeletons (6 card skeletons in grid), EmptyState (with reset-filters CTA), ErrorState (with retry CTA), pagination at bottom (prev/next + page X of Y) when results > PAGE_SIZE.
  - All labels in Bahasa Malaysia. Glassmorphism throughout. motion.div entrance animation per card.
- Overwrote `src/components/views/analytics.tsx` (was a stub) with a full `AnalyticsView`:
  - Page header "Dashboard Analitik & Laporan" + months Select (3/6/12/24, default 6) + Eksport PDF / Eksport Excel buttons (toast.info mock "Laporan sedang dijana…") + Refresh button.
  - 6 KPI cards in a responsive grid (2 / 3 / 6 cols): Total Permohonan, Diluluskan, Ditolak, Jumlah Nilai Diluluskan (formatRM), Purata Skor AI, Kes Pertindihan Dikesan — each with tone-colored icon, value, hint.
  - Trek comparison section (lg:col-span-2): two side-by-side TrekDonutCards (Trek 1 navy / Trek 2 teal) each with a donut (Diluluskan/Menunggu/Ditolak), legend, approval-rate %, total + value approved footer. Fetches `/api/analytics/trek-comparison`.
  - Status distribution PieChart (donut) with per-status colors and legend chips. Built from `overview.byStatus`.
  - Monthly trend AreaChart with two gradient-filled areas (Trek 1 navy, Trek 2 teal), CartesianGrid, XAxis (BM month labels Jan..Dis), YAxis, custom Tooltip, Legend. Refetches when months changes (separate useEffect).
  - Kategori distribution horizontal BarChart (layout="vertical") with per-kategori colored Cells.
  - State heatmap Table: each row colored by `intensityBg(total/maxTotal)` teal-opacity gradient, with negeri / total / approved / nilai columns. Scrollable (`max-h-[280px] overflow-y-auto scrollbar-thin`). Fetches `/api/analytics/heatmap`.
  - PBT performance Table (top 8): PBT name + kod + negeri, Jumlah, Lulus, Kadar % (Badge colored green if ≥50% else amber), Skor AI avg. Fetches `/api/analytics/pbt-performance`.
  - NGO performance Table (top 8): same shape with NGO fields. Fetches `/api/analytics/ngo-performance`.
  - Custom ChartTooltip component for BM labels and consistent styling.
  - Each section has its own loading skeleton and error banner — partial failures don't break the whole dashboard. All fetchers wrapped in `useCallback` (matches the pattern in `notifications.tsx` that passes the `react-hooks/set-state-in-effect` rule).
  - Chart palette uses hex equivalents of the CSS `--chart-1..5` design tokens (navy #0f2747, teal #0d9488, green #16a34a, gold #d97706, coral #dc2626) plus purple/pink/sky/orange/slate for status variety.
  - Glassmorphism throughout (ChartCard wrapper), responsive (charts stack on mobile, 2-col on lg). All labels in Bahasa Malaysia.
- Ran `bun run lint` — initially hit 2 `react-hooks/set-state-in-effect` errors in analytics.tsx because the original `fetchAll` was a plain (non-`useCallback`) function called from useEffect with `[]` deps. Refactored to split into 6 `useCallback`-wrapped fetchers (fetchOverview, fetchTrek, fetchTrend, fetchHeat, fetchPbt, fetchNgo) + a `fetchAll` aggregator, each listed in the useEffect deps array — matches the pattern used by the previously-completed `notifications.tsx` view which passes the same lint rule cleanly. Re-ran lint: 0 errors, 0 warnings across the whole project.
- Also removed unused `Card, CardContent` imports from both files (kept the codebase clean even though the project's eslint config does not flag unused imports as errors).

Stage Summary:
### Files modified (2 — both overwrite stubs)
- `src/components/views/review-queue.tsx` — `ReviewQueueView`: role-aware reviewer work queue with filter bar (tabs + trek + search), AI-priority-sorted glass-card grid, per-card quick action buttons (Lulus/Tolak/Pulangkan/Naik Peringkat) wired to `POST /api/applications/[id]/action` via shadcn Dialog, stats summary, loading skeletons, empty/error states, pagination.
- `src/components/views/analytics.tsx` — `AnalyticsView`: KPKT analytics dashboard with 6 KPI cards, trek comparison donuts, monthly trend AreaChart, status PieChart, kategori horizontal BarChart, state heatmap Table, PBT/NGO performance tables, export buttons (mock toast), and per-section loading/error handling. All charts via recharts.

### Key decisions
- Fetched the review-queue list with `limit=200&page=1` (effectively all matching items) so summary stats (avg AI score, flagged count) and paginated display come from a single request — avoids a second stats fetch round-trip and keeps the queue responsive for typical queue sizes (5–50 items).
- AI-priority sort is purely client-side: `priorityRank = pertindihanPriority × 1000 − skorKelayakanAi` — pertindihan dominates (disahkan > disyaki > tiada), then ascending AI score surfaces low-scoring applications next. Top-3 cards get a "Keutamaan #N" ribbon and disahkan_pertindihan cards get a red ring for instant visual triage.
- Action dialog is shared (one Dialog component, action type in state) — `ACTION_META` map drives title/description/label/placeholder/confirmLabel/variant/requireText. For `tolak`, alasan is required (confirm button disabled until non-empty); for other actions nota is optional. Body sent to API: `{ tindakan, penggunaId, alasan? | nota? }` — `penggunaId` read from `useAppStore.getState().user?.id` at submit time.
- Used `useCallback` for every fetcher in analytics.tsx (and listed them in useEffect deps) to satisfy the strict `react-hooks/set-state-in-effect` lint rule that Next.js 16 / React 19 enables. This matches the existing `notifications.tsx` pattern.
- Heatmap is a styled Table (not a real geographic map) with per-row teal-opacity background derived from `total/maxTotal` ratio — keeps the implementation simple while still conveying intensity.
- Chart colors are hex literals mirroring the CSS `--chart-1..5` design tokens so recharts' inline SVG fills render consistently across light/dark themes.
- All user-facing strings in Bahasa Malaysia. Blue color used only for the "Naik Peringkat" quick action button (explicitly requested by the task spec); everywhere else the KPKT navy/teal palette is used.
