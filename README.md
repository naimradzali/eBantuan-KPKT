# Sistem eBantuan-PEKB

**Sistem Permohonan Bantuan Perumahan dan Geran PEKB**
Kementerian Perumahan dan Kerajaan Tempatan (KPKT) Malaysia

Sistem prototaip (Proof of Concept) bagi Pelaksanaan Program Ekonomi Kediaman Bandar (PEKB) yang menghubungkan Pihak Berkuasa Tempatan (PBT) dan Pertubuhan Bukan Kerajaan (NGO) dalam satu platform bersepadu dengan keupayaan Kecerdasan Buatan (AI).

---

## Tentang Sistem

Sistem ini menampung **DUA (2) trek permohonan** yang berasingan dalam satu platform bersepadu:

| Trek | Pemohon | Kategori Bantuan |
|------|---------|------------------|
| **Trek 1 — Bantuan Perumahan** | Pegawai PBT | Baik Pulih Rumah, Rumah Mesra Rakyat (RMR) |
| **Trek 2 — Geran PEKB** | Wakil NGO | Geran Ekonomi/Mikro-usahawan, Bantuan Sara Hidup |

### Modul AI (GLM-4.5 melalui z.ai)
- **Penyaringan Kelayakan Pintar** — Skor kelayakan 0-100 dengan justifikasi
- **Pengesahan Dokumen (VLM)** — Ekstraksi & pengesahan dokumen sokongan
- **Pengesanan Pertindihan Rentas-Trek** — Mengesan penerima yang sama merentasi PBT & NGO
- **Cadangan Keputusan** — Ringkasan & cadangan untuk pegawai penilai (human-in-the-loop)
- **Chatbot Bantuan** — Pembantu Maya PEKB dalam Bahasa Malaysia

---

## Teknologi

| Lapisan | Teknologi |
|---------|-----------|
| Frontend | Next.js 16 (App Router), React 19, TypeScript 5 |
| UI | Tailwind CSS 4, shadcn/ui, Framer Motion, Recharts |
| Backend | Next.js API Routes (App Router) |
| Pangkalan Data | Prisma ORM + SQLite |
| AI | z-ai-web-dev-sdk (Model GLM-4.5) |
| State | Zustand |

---

## Pemasangan & Penyediaan

### Keperluan
- [Node.js](https://nodejs.org/) 18+ atau [Bun](https://bun.sh/) runtime
- npm / bun package manager

### Langkah-Langkah

```bash
# 1. Klon repositori
git clone https://github.com/naimradzali/eBantuan-KPKT.git
cd eBantuan-KPKT

# 2. Pasang kebergantungan
bun install        # atau: npm install

# 3. Sedakan pemboleh ubah persekitaran
cp .env.example .env

# 4. Segerakkan skema pangkalan data
bun run db:push

# 5. Jana data dummy (10 PBT, 15 NGO, 57 pengguna, 133 permohonan)
bun run db:seed

# 6. Mulakan pelayan pembangunan
bun run dev        # atau: npm run dev
```

Buka `http://localhost:3000` dalam pelayar anda.

---

## Akaun Log Masuk Demo

| Peranan | E-mel | Kata Laluan |
|---------|-------|-------------|
| Pentadbir Sistem | `admin@kpkt.gov.my` | `admin123` |
| Pegawai KPKT | `kpkt1@kpkt.gov.my` | `kpkt123` |
| Pegawai PBT | `pegawai.mbsa@pbt.gov.my` | `pbt123` |
| Wakil NGO | `wakil.pekb-ngo-2024-001@ngo.org.my` | `ngo123` |

> Demo OTP: `123456`

---

## Struktur Projek

```
├── prisma/
│   ├── schema.prisma         # Skema pangkalan data (8 model)
│   └── seed.ts               # Skrip janaan data dummy
├── src/
│   ├── app/
│   │   ├── api/              # 38 routes (auth, applications, AI, analytics, admin)
│   │   ├── globals.css       # Sistem reka + glassmorphism
│   │   ├── layout.tsx
│   │   └── page.tsx          # SPA entry (login / app shell)
│   ├── components/
│   │   ├── auth/             # Halaman log masuk
│   │   ├── shell/            # App shell (sidebar, header, footer)
│   │   ├── shared/           # Badge komponen boleh guna semula
│   │   ├── ui/               # shadcn/ui components
│   │   └── views/            # 16 komponen paparan (dashboards, wizard, dll)
│   └── lib/
│       ├── ai/sdk.ts         # Pembungkus z-ai-web-dev-sdk
│       ├── api-client.ts     # Klien API frontend
│       ├── db.ts             # Prisma client
│       ├── store.ts          # Zustand store (auth, routing)
│       ├── types.ts          # Jenis TypeScript + peta label
│       └── utils.ts
├── .env.example
└── package.json
```

---

## Peranan Pengguna & Kawalan Akses (RBAC)

| Peranan | Trek | Fungsi Utama |
|---------|------|--------------|
| Pegawai PBT | Bantuan Perumahan | Isi & hantar permohonan Trek 1 bagi pihak penduduk |
| Penilai PBT | Bantuan Perumahan | Semakan peringkat pertama Trek 1 |
| Wakil NGO | Geran PEKB | Isi & hantar permohonan Trek 2 bagi pihak komuniti |
| Penilai NGO | Geran PEKB | Semakan peringkat pertama Trek 2 |
| Pegawai KPKT | Kedua-dua Trek | Semakan daerah/negeri, kelulusan, analitik |
| Pentadbir Sistem | Kedua-dua Trek | Pengurusan pengguna, PBT/NGO, konfigurasi AI, log audit |

---

## Aliran Kelulusan (3 Peringkat)

```
Trek 1 (PBT):  PBT → KPKT Daerah → KPKT Negeri/Pusat → Diluluskan
Trek 2 (NGO):  NGO → KPKT Daerah → KPKT Negeri/Pusat → Diluluskan
```

Setiap peringkat boleh: **Lulus** / **Tolak** / **Pulangkan untuk pembetulan** / **Naik Peringkat**

---

## Tadbir Urus AI

Semua keputusan akhir kelulusan **KEKAL** sebagai tanggungjawab pegawai manusia (human-in-the-loop). AI berfungsi sebagai alat sokongan keputusan sahaja — selaras dengan prinsip ketelusan dan akauntabiliti sektor awam (PRD §7.6).

---

## Pematuhan

- Akta Perlindungan Data Peribadi 2010 (PDPA)
- Penyamaran data (data masking) bagi No. Kad Pengenalan
- Log audit tidak boleh diubah (immutable audit trail)
- Kawalan akses berperanan (RBAC)

---

## Klasifikasi Dokumen

**TERHAD** — Dokumen prototaip untuk semakan pihak pengurusan KPKT.

---

## Lesen

Hak Cipta © 2026 Kementerian Perumahan dan Kerajaan Tempatan (KPKT) Malaysia.
