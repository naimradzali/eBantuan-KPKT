# Task 4-b — Work Record

**Agent**: full-stack-developer
**Task ID**: 4-b
**Task**: Build core shared views (applications list, application detail, application wizard) for Sistem eBantuan-PEKB

## Context Loaded

Read these files before starting:
- `/home/z/my-project/worklog.md` — full project history (schema, seed data, design system, all completed APIs)
- `/home/z/my-project/src/lib/types.ts` — shared types + label maps + formatters (maskIC, formatRM, formatDate, formatDateTime)
- `/home/z/my-project/src/lib/store.ts` — Zustand store (user, view, activeApplicationId, setView, setActiveApplication) + `useRoleAccess()` hook
- `/home/z/my-project/src/lib/api-client.ts` — `api.get/post/patch/delete` (auto-injects userId query param)
- `/home/z/my-project/src/components/shared/badges.tsx` — StatusBadge, KategoriBadge, PertindihanBadge, PengesahanBadge, TrekBadge, SkorIndicator
- `/home/z/my-project/src/components/shell/app-shell.tsx` — confirmed view routing: `ApplicationsListView`, `ApplicationWizardView`, `ApplicationDetailView` are imported and rendered via switch on `view`
- `/home/z/my-project/src/app/globals.css` — glass utilities: `.glass`, `.glass-card`, `.glass-strong`, `.glass-nav`, `.gradient-mesh`, `.text-gradient-primary`, `.scrollbar-thin`, animations
- `/home/z/my-project/src/app/api/applications/route.ts` — GET (list, paginated, role-filtered), POST (create with noRujukan auto-gen + status auto-set based on `submit` flag)
- `/home/z/my-project/src/app/api/applications/[id]/route.ts` — GET single (includes pbt, ngo, disediakanOleh, documents, auditLogs.pengguna), PATCH (any field)
- `/home/z/my-project/src/app/api/applications/[id]/action/route.ts` — POST action (lulus/tolak/pulangkan/naik_peringkat), updates statusPermohonan + peringkatSemasa + audit log + notification
- `/home/z/my-project/src/app/api/documents/route.ts` — POST create document (requires applicationId + jenisDokumen + namaFail + saizFail + jenisMime)
- AI routes: eligibility (no persist), decision-support (no persist), duplicate-check (auto-persists statusPertindihanAi), document-verify (auto-persists to Document row)

## Files Created / Overwritten

1. **`src/components/views/applications-list.tsx`** — `ApplicationsListView` (~330 LOC)
   - Page header + role-gated "Permohonan Baharu" button
   - 4 stat cards (Total / Dalam Semakan / Diluluskan / Ditolak) from `/api/applications/stats/overview`
   - Trek filter tabs (Semua / Trek 1 PBT / Trek 2 NGO) — auto-narrowed by role
   - Filter bar: debounced search (no rujukan / nama / IC), status dropdown, kategori dropdown (client filter)
   - shadcn `Table` with No Rujukan / Penerima / Trek+Kategori / Skor AI (SkorIndicator) / Status / Tarikh / Tindakan columns
   - Row click → `setActiveApplication` + `setView("application-detail")`
   - Pagination, loading skeleton, error state, empty state with CTA
   - `motion.tr` staggered row entrance

2. **`src/components/views/application-detail.tsx`** — `ApplicationDetailView` (~530 LOC)
   - Header: back button + No Rujukan (mono) + Trek badge + Status badge + Pertindihan badge + dates
   - 2-column layout: left col-span-2 + right col-span-1 sticky/scrollable
   - Left: Penerima info (with `maskIC()`), Isi Rumah, Trek-specific (Trek 1: zon/mukim/no rujukan/nilai anggaran; Trek 2: kawasan/nilai geran/nama perniagaan/jenis/cadangan pelan), Documents list with per-doc "Semak AI" button calling `/api/ai/document-verify`
   - Right: AI Analysis card (SkorIndicator lg + cadangan + Pertindihan + justifikasi + decision ringkasan + "Jana Semula Analisis AI" button); Decision Support card (sebab + faktor risiko lists); Timeline card (vertical timeline of auditLogs); Review actions card (only for `canReview` — Textarea + 4 buttons + AlertDialog for tolak)
   - "Jana Semula Analisis AI": eligibility → PATCH application → duplicate-check → decision-support → refresh detail
   - Actions: POST `/api/applications/[id]/action` with `{ tindakan, nota, alasan, penggunaId }`
   - Loading skeleton, error state

3. **`src/components/views/application-wizard.tsx`** — `ApplicationWizardView` (~620 LOC)
   - Auto-detect trek from `useRoleAccess()`: PBT → bantuan_perumahan, NGO → geran_pekb; trek badge in header
   - Progress stepper (5 steps, icons, click to navigate back, Progress bar)
   - Step 1 Penerima: nama, no KP (regex `^\d{6}-?\d{2}-?\d{4}$`), alamat, negeri Select (16 states), daerah, telefon
   - Step 2 Isi Rumah: pendapatan, tanggungan, OKU switch (reveals jenis Select), pemilikan, jenis rumah
   - Step 3 Kategori: RadioGroup of 2 kategori per trek + trek-specific fields (Trek 1: zon mukim, no rujukan, nilai anggaran; Trek 2: kawasan, nilai geran, nama/jenis perniagaan for geran_ekonomi, cadangan pelan)
   - Step 4 Dokumen: dynamic checklist from `requiredDocsForTrek()`, native `<input type="file">` wrapped in Button label (no actual upload — captures metadata only)
   - Step 5 Semakan: read-only review cards for all entered data
   - Navigation: Sebelumnya / Seterusnya / Simpan Draf / Hantar Permohonan
   - On submit: POST `/api/applications` (submit flag) → `Promise.all` create pending docs → toast → setActiveApplication + setView("application-detail")
   - Per-step manual validation (IC format, positive numbers, required fields)

## Validation / QA

- `bun run lint` on my 3 files → **0 errors** (pre-existing errors in analytics.tsx, app-shell.tsx, profile.tsx, admin-users.tsx are owned by other agents)
- `npx tsc --noEmit` on my 3 files → **0 type errors**
- Dev log shows API calls returning 200, no compilation errors in my files

## Notes for Downstream Agents

- The 3 views assume `useAppStore` exposes: `user`, `view`, `setView`, `activeApplicationId`, `setActiveApplication` — all confirmed in store.ts.
- `useRoleAccess()` exposes: `isPBT`, `isNGO`, `isKPKT`, `isPusat`, `isAdmin`, `canReview` (penilai_pbt, penilai_ngo, pegawai_kpkt, pegawai_kpkt_pusat), `canSubmit` (pegawai_pbt, wakil_ngo), `role` — used for role-aware UI gating.
- Wizard's document upload is metadata-only (filename/size/mime captured client-side, posted to `/api/documents` which stores them as a row in the documents table without persisting the actual file content). Backend `document-verify` AI route then runs VLM on a placeholder 1x1 PNG (or the deterministic fallback per jenisDokumen).
- Detail view's AI flow intentionally does NOT auto-run on mount (would call 3 LLM endpoints every page load). Reviewer must click "Jana Semula Analisis AI" to trigger. Initial skor/cadangan values come from whatever was persisted at application creation time (currently 0/null until first run — backend could be enhanced to run AI on submit, but that's out of scope for this task).
- `application-wizard.tsx` uses framer-motion `AnimatePresence` for step transitions and `motion.div` for the active step slide animation — confirmed `framer-motion@^12.23.2` is in package.json.
