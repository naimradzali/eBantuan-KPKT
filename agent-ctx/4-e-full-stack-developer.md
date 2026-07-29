# Task 4-e — Admin Views, Notifications, Profile, AI Chatbot Widget

**Agent:** full-stack-developer  
**Task:** Build admin views (users, PBT/NGO, audit, AI config), notifications center, profile, AI chatbot widget.

## Work Log

1. Read project context: `worklog.md`, `src/lib/types.ts`, `src/lib/store.ts`, `src/lib/api-client.ts`, `src/components/shared/badges.tsx`, `src/app/globals.css`. Confirmed design system (navy + teal KPKT identity, glassmorphism utilities, sticky footer).
2. Read all relevant backend API route files to confirm request/response shapes:
   - `/api/admin/users` (GET, POST), `/api/admin/users/[id]` (PATCH, DELETE), `/api/admin/users/[id]/reset-password` (POST)
   - `/api/admin/pbt` (GET, POST), `/api/admin/pbt/[id]` (PATCH), `/api/admin/pbt/[id]/status` (PATCH)
   - `/api/admin/ngo` (GET, POST), `/api/admin/ngo/[id]` (PATCH), `/api/admin/ngo/[id]/status` (PATCH)
   - `/api/admin/audit-logs` (GET with date-range + pagination)
   - `/api/audit-logs` (GET for general audit logs)
   - `/api/ai/config` (GET, PATCH), `/api/ai/chatbot` (POST with message + history + userId)
   - `/api/notifications` (GET), `/api/notifications/[id]/read` (PATCH), `/api/notifications/read-all` (POST)
   - `/api/auth/me` (GET)
3. Inspected existing shadcn/ui components for correct API usage (Dialog, Select, Table, Tabs, AlertDialog, Switch, Avatar).
4. Built `src/components/views/admin-users.tsx`:
   - Page header with "Tambah Pengguna" button
   - Filter bar (search + role + status + PBT/NGO affiliation filters)
   - Glass data table with skeleton loaders, role badges, status pills
   - Add/Edit dialog with conditional PBT/NGO selection (only shown for PBT/NGO roles)
   - Reset password AlertDialog confirm
   - Block / Activate AlertDialog confirm
   - Pagination (10 per page)
5. Built `src/components/views/admin-pbt-ngo.tsx`:
   - Tabs (Profil PBT | Profil NGO)
   - Each tab has: search, status filter, table with _count columns, add/edit dialog, status toggle, delete (soft) AlertDialog
   - PBT form: nama, kod, negeri, daerah, kategori, status
   - NGO form: nama, ROS, akreditasi, negeri, daerah, status
6. Built `src/components/views/admin-audit.tsx`:
   - Page header with "Log Audit Sistem" + export button (toast)
   - Immutability banner explaining PRD §9 / §15.1
   - Filter bar: date range, tindakan dropdown, penggunaId search, applicationId search
   - Color-coded tindakan badges (green=lulus, red=tolak, amber=pulangkan, sky=hantar/naik_peringkat, gray=log_masuk)
   - 50-per-page pagination
   - Clickable application reference link → opens application-detail view
7. Built `src/components/views/admin-ai-config.tsx`:
   - Current config card with 6 status tiles
   - Editable form: ambang skor lulus, ambang skor semak (with live preview of score ranges TOLAK/SEMAK/LULUS)
   - 4 toggle switches for AI modules
   - 4 module cards with descriptions, status badge, "Uji Modul" button (toast)
   - AI Governance notice (PRD §7.6) — human-in-the-loop principle
8. Built `src/components/views/notifications.tsx`:
   - Page header with "Tandai Semua Dibaca" button
   - Filter chips: All / Unread / Sistem / Status / Emel / SMS
   - Notification cards with jenis badge (icon), unread ring indicator
   - Click → mark as read + navigate to application-detail if has applicationId
   - Empty state
9. Built `src/components/views/profile.tsx`:
   - Profile header card (avatar, name, role badge, account status)
   - 6 info items (emel, telefon, KP masked, jawatan, negeri, tarikh dicipta)
   - Affiliation card (conditional PBT or NGO details)
   - Account status card
   - Recent activity card (5 latest audit logs by this user)
   - "Kemaskini Profil" dialog (noTelefon + jawatan editable; nama/emel read-only)
   - "Tukar Kata Laluan" dialog (current + new + confirm; mock toast)
10. Built `src/components/views/ai-chatbot-widget.tsx`:
    - Floating button (fixed bottom-right) with pulse-glow animation + Sparkles icon
    - Welcome message on first open
    - 4 quick suggestion chips
    - Message bubbles (user right-aligned gradient; assistant left-aligned glass)
    - 3-dot typing indicator with bounce animation while waiting for GLM-4.5 reply
    - Calls POST /api/ai/chatbot with { message, history: last 6 messages, userId }
    - Framer Motion panel entrance (slide up + fade)
    - Responsive: mobile = full-width bottom sheet; desktop = 380px fixed bottom-right
    - Uses Zustand `chatbotOpen` and `toggleChatbot`
11. All text in Bahasa Malaysia. All views are `"use client"`. Glass styling throughout. Loading skeletons + error states + empty states in every view.
12. Ran `bun run lint` — verified no new lint errors introduced in the 7 files.

## Stage Summary

### Files created / overwritten (7)
- `src/components/views/admin-users.tsx` — `AdminUsersView`
- `src/components/views/admin-pbt-ngo.tsx` — `AdminPbtNgoView`
- `src/components/views/admin-audit.tsx` — `AdminAuditView`
- `src/components/views/admin-ai-config.tsx` — `AdminAiConfigView`
- `src/components/views/notifications.tsx` — `NotificationsView`
- `src/components/views/profile.tsx` — `ProfileView`
- `src/components/views/ai-chatbot-widget.tsx` — `AIChatbotWidget`

### Key Decisions
- **Conditional fields in user form**: PBT dropdown only shown for `pegawai_pbt`/`penilai_pbt` roles; NGO dropdown only for `wakil_ngo`/`penilai_ngo`. This keeps the form clean.
- **Soft delete for PBT/NGO**: Delete buttons call status endpoint to set `tidak_aktif` / `tamat_tempo` rather than hard delete — preserves referential integrity.
- **PBT/NGO affiliation filter in users view**: applied client-side since the admin users API doesn't expose server-side affiliation filtering. Acceptable for PoC.
- **Profile edit dialog**: uses admin PATCH endpoint (`/api/admin/users/[id]`) since self-edit is permitted and there's no separate /api/users/me PATCH endpoint. namaPenuh and emel are locked (read-only) per the task spec.
- **Change password**: mocked — validates input (min 6 chars, must match, must differ from current), then toasts success. No real endpoint needed per task spec.
- **Audit logs**: 50-per-page pagination. Date range filter sends ISO timestamps; endDate gets end-of-day (23:59:59) so inclusive of that calendar day.
- **AI config**: live preview bar showing TOLAK / SEMAK / LULUS ranges updates in real-time as admin adjusts thresholds.
- **Chatbot**: history is sent as last 6 messages (matches backend's slice(-6) handling). Welcome message is shown only once. Quick suggestions only appear when conversation has just the welcome message.
- **Color coding for audit tindakan**: lulus=emerald, tolak=red, pulangkan=amber, hantar_permohonan/naik_peringkat=sky, log_masuk=muted gray, cipta_pengguna=purple, kemaskini=slate, muat_naik_dokumen=teal.

### Notes for downstream agents
- All 7 views are fully implemented and ready to be wired into the app shell (already imported in `src/components/shell/app-shell.tsx`).
- The chatbot widget is already rendered at the bottom of the app shell via `<AIChatbotWidget />`.
- All views handle loading skeletons, error states with retry buttons, and empty states with appropriate icons.
- All mutations show sonner toast feedback.
- Framer Motion is used for entrance animations in headers and chatbot panel.
