# Task 4-c — Role-based dashboard views (PBT, NGO, KPKT, Admin)

**Agent**: full-stack-developer
**Date**: 2026-07-29
**Status**: ✅ Complete

## Scope

Built 4 role-based dashboard view files (overwrote stubs):

1. `src/components/views/pbt-dashboard.tsx` — `PbtDashboardView` (Trek 1 PBT)
2. `src/components/views/ngo-dashboard.tsx` — `NgoDashboardView` (Trek 2 NGO)
3. `src/components/views/kpkt-dashboard.tsx` — `KpktDashboardView` (Trek 1+2 KPKT Daerah/Negeri/Pusat)
4. `src/components/views/admin-dashboard.tsx` — `AdminDashboardView` (Pentadbir Sistem)

## API endpoints used

| Endpoint | Used by |
|---|---|
| `GET /api/applications/stats/overview?role=pegawai_pbt\|wakil_ngo` | PBT + NGO dashboards (4 stat cards) |
| `GET /api/applications?limit=5` | PBT + NGO recent applications table |
| `GET /api/applications?status=semakan_daerah\|semakan_negeri&limit=10` | KPKT baris semakan table |
| `GET /api/applications?status=semakan_negeri&limit=50` | KPKT pusat high-value pending approvals (filter ≥ RM 50k) |
| `GET /api/analytics/overview` | KPKT 6 stat cards + Admin Total Permohonan / Nilai Diluluskan |
| `GET /api/analytics/trek-comparison` | KPKT 2-column trek comparison cards |
| `GET /api/analytics/trend?months=6` | KPKT recharts BarChart (Trek 1 vs Trek 2) |
| `GET /api/audit-logs?limit=5` | KPKT recent activity feed |
| `GET /api/notifications` | PBT + NGO + KPKT notifications preview (last 3) |
| `GET /api/admin/users?limit=1` | Admin Total Pengguna (uses `total` field) |
| `GET /api/admin/users?limit=5` | Admin recent user registrations |
| `GET /api/admin/pbt?limit=1` | Admin Total PBT |
| `GET /api/admin/ngo?limit=1` | Admin Total NGO |
| `GET /api/admin/audit-logs?limit=8` | Admin recent audit logs table |
| `GET /api/ai/config` | Admin system health card (model, thresholds, 4 toggle indicators) |

## UI conventions

- All `"use client"` components, Bahasa Malaysia throughout.
- Glassmorphism: `.glass-card` for cards, motion entrance animations via framer-motion.
- Stat cards pattern: icon in colored rounded square, `tabular-nums` large number, label, Activity-icon trend.
- Responsive: `grid-cols-2 lg:grid-cols-4` (PBT/NGO), `grid-cols-2 lg:grid-cols-3 xl:grid-cols-6` (KPKT), `grid-cols-2 lg:grid-cols-5` (Admin).
- Tables: shadcn/ui Table inside `overflow-x-auto`, with `max-h-96 overflow-y-auto scrollbar-thin` where lists grow long.
- Loading: Skeleton placeholders everywhere.
- Errors: single `try/catch` per dashboard → `sonner` toast with `error.message`.
- Reusable badges from `src/components/shared/badges.tsx`: StatusBadge, KategoriBadge, SkorIndicator, TrekBadge, RoleBadge.
- Reusable formatters from `src/lib/types.ts`: formatRM, formatDate, formatDateTime, maskIC.
- Navigation via Zustand store: `setView`, `setActiveApplication`.

## Key decisions

- StatCard pattern inlined per file (rather than extracted to shared component) to keep each dashboard self-contained.
- For KPKT, pending status filter switches automatically between `semakan_daerah` (Daerah/Negeri) and `semakan_negeri` (Pusat) via `useRoleAccess().isPusat`.
- High-value pending approvals section (RM ≥ 50k) only rendered for `pegawai_kpkt_pusat` role.
- Recharts `BarChart` (not LineChart) for clearer per-month trek comparison; Bahasa Malaysia month labels (Jan, Feb, Mac, Apr, Mei, Jun, ...).
- AppView type lives in `@/lib/store` not `@/lib/types` — corrected the import in admin-dashboard.
- All API calls go through `api.get` which auto-injects `userId` for endpoints that need it.

## Lint status

- `npx eslint src/components/views/{pbt,ngo,kpkt,admin}-dashboard.tsx` → **0 errors** (clean).
- Project-wide `bun run lint` shows 2 pre-existing errors in `analytics.tsx` and `review-queue.tsx` — these are NOT in this task's scope (other agents' files).

## Dev server verification

- `GET /` returns HTTP 200; dev log shows `✓ Compiled` with no errors after edits.
