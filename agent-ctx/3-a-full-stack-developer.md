# Task 3-a — Backend API Routes

**Agent:** full-stack-developer
**Task:** Build backend APIs for auth, applications, documents, notifications, audit logs
**Status:** ✅ Complete

## Summary

Built 14 API route files (across 5 resource groups) implementing the full backend surface required by the Sistem eBantuan-PEKB PoC. All routes follow Next.js 16 App Router conventions, use Prisma via `@/lib/db`, return JSON, and use Bahasa Malaysia for user-facing strings.

## Routes Created

### Auth (`/api/auth/*`)
- `POST /api/auth/login` — validates `emel` + `kataLaluan` against `db.user.kataLaluanHash`, checks `statusAkaun === "aktif"`, returns user (with pbt+ngo) + fake JWT (`demo.<base64(userId)>.<timestamp>`), creates audit log `log_masuk`.
- `POST /api/auth/register` — accepts `{ namaPenuh, noKadPengenalan, peranan, emel, noTelefon, kataLaluan, pbtKod?, ngoAkreditasi? }`. For PBT roles validates `pbtKod` against `PbtProfile.kodPbt`. For NGO roles validates `ngoAkreditasi` against `NgoProfile.noAkreditasiPekb`. Creates user with `statusAkaun="aktif"`, audit log `cipta_pengguna`.
- `POST /api/auth/verify-otp` — mock endpoint; returns `{ verified: true }` only when `otp === "123456"`.
- `GET /api/auth/me?userId=...` — returns current user with pbt+ngo relations.

### Applications (`/api/applications*`)
- `GET /api/applications?userId&role&status&trek&search&page=1&limit=20` — role-based filtering:
  - `pegawai_pbt`/`penilai_pbt` → filter by user's `pbtId`
  - `wakil_ngo`/`penilai_ngo` → filter by user's `ngoId`
  - `pegawai_kpkt`/`pegawai_kpkt_pusat`/`admin` → all applications
  - returns `{ data, total, page, limit }` with `pbt`, `ngo`, `disediakanOleh`, `_count.documents` included.
- `POST /api/applications` — generates `noRujukan` as `BP-2026-XXXXXX` (bantuan_perumahan) or `GP-2026-XXXXXX` (geran_pekb) where XXXXXX is `(count+1)` zero-padded to 6 digits. `statusPermohonan="draf"` by default, `"dihantar"` if `submit:true`. Auto-fills `pbtId`/`ngoId` from submitter role if not provided. Audit log `cipta_draf` or `hantar_permohonan`.
- `GET /api/applications/[id]` — lookup by `applicationId` (cuid, NOT `noRujukan`). Includes pbt, ngo, disedediakanOleh, documents, auditLogs (with pengguna).
- `PATCH /api/applications/[id]` — partial update; if `statusPermohonan` changes, creates audit log `kemaskini_status`; auto-sets `tarikhDiluluskan` when status becomes `diluluskan`.
- `POST /api/applications/[id]/action` — body `{ tindakan, nota?, alasan?, penggunaId? }`. Valid tindakan: `lulus|tolak|pulangkan|naik_peringkat`.
  - `lulus` → `statusPermohonan="diluluskan"`, `peringkatSemasa="selesai"`, sets `tarikhDiluluskan`.
  - `tolak` → `statusPermohonan="ditolak"`, sets `alasanPenolakan`.
  - `pulangkan` → `statusPermohonan="dipulangkan"`.
  - `naik_peringkat` → advances `peringkatSemasa`: `draf→pbt→kpkt_daerah→kpkt_negeri→selesai`, with `statusPermohonan` synced (`semakan_pbt_ngo` / `semakan_daerah` / `semakan_negeri` / `diluluskan`).
  - Creates audit log + a `status` notification for the submitter (`disediakanOlehPenggunaId`).
- `GET /api/applications/stats/overview?userId&role` — returns `{ total, byStatus, byTrek, byKategori, totalNilaiDiluluskan, jumlahDiluluskan, nilaiTrek1Diluluskan, nilaiTrek2Diluluskan, bilTrek1Diluluskan, bilTrek2Diluluskan }`. Role-filtered like the list endpoint.

### Documents (`/api/documents*`)
- `POST /api/documents` — body `{ applicationId, jenisDokumen, namaFail, saizFail, jenisMime }`. Creates with `statusPengesahanAi="belum_disemak"`. Audit log `muat_naik_dokumen`.
- `GET /api/documents?applicationId=...` — list documents for an application, newest first.
- `PATCH /api/documents/[id]` — update `jenisDokumen`, `namaFail`, `saizFail`, `jenisMime`, `statusPengesahanAi`, `dataEkstrakAi`, `catatanAi`.
- `DELETE /api/documents/[id]` — delete + audit log `kemaskini`.

### Notifications (`/api/notifications*`)
- `GET /api/notifications?userId=...` — list user's notifications newest first + `belumDibaca` count.
- `PATCH /api/notifications/[id]/read` — mark single as read.
- `POST /api/notifications/read-all?userId=...` — `updateMany` on unread notifications for the user.

### Audit Logs (`/api/audit-logs`)
- `GET /api/audit-logs?applicationId&penggunaId&tindakan&page=1&limit=50` — paginated, includes `pengguna` and `application` relations, newest first.

## Conventions Followed
- All routes use `import { NextRequest, NextResponse } from "next/server"` and `import { db } from "@/lib/db"`.
- Dynamic routes use the Next.js 16 async params pattern: `interface RouteContext { params: Promise<{ id: string }> }` then `const { id } = await ctx.params`.
- Try/catch wraps every handler; errors return `{ error: string }` with appropriate status (400/404/409/500).
- User-facing strings in Bahasa Malaysia.
- No server actions — pure API routes only.
- No test files written.

## Lint Result
- `bunx eslint src/app/api` → **0 errors, 0 warnings** across all new files.
- `bun run lint` shows 1 pre-existing error in `src/app/page.tsx` (setMounted inside useEffect) — not introduced by this task, left untouched.

## Notes for Downstream Agents
- Frontend should pass the logged-in user's `id` via `userId` query param or `penggunaId` body field — no real auth middleware is wired up yet (the fake JWT is purely illustrative).
- `noRujukan` is generated as `count+1` per trek — fine for PoC but racy under concurrent writes.
- The `naik_peringkat` flow uses `peringkatSemasa` as the source of truth for stage progression.
- Notification `jenis="status"` is used for all action-driven notifications (lulus/tolak/pulangkan/naik_peringkat).
- All audit log entries include `penggunaId`; the `[id]/action` route falls back to the application submitter if `penggunaId` is missing from the body.
- The `/api/applications` list endpoint accepts an optional `role` query param but it's informational — actual role-based filtering is driven by looking up the user's `peranan` from `userId`.
