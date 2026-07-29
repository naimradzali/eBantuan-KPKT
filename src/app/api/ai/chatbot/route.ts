// Sistem eBantuan-PEKB — AI Chatbot
// POST /api/ai/chatbot
//
// Accepts { message, history?, userId? } and uses GLM-4.5 chat completions
// to answer questions about the PEKB system in Bahasa Malaysia.
//
// FALLBACK: If the SDK fails, a keyword-matched canned response is returned.

import { NextRequest, NextResponse } from "next/server";
import { chatComplete } from "@/lib/ai/sdk";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatInput {
  message?: string;
  history?: ChatMessage[];
  userId?: string;
}

const SYSTEM_PROMPT = `Anda ialah "PEKB Assistant" — pembantu maya untuk Sistem eBantuan-PEKB (Program Bantuan Perumahan dan Geran PEKB) di bawah Kementerian Perumahan dan Kerajaan Tempatan (KPKT) Malaysia.

Tugas anda:
- Membantu pengguna (pegawai PBT, wakil NGO, pegawai KPKT, dan pemohon) memahami sistem eBantuan-PEKB.
- Menjawab soalan dalam BAHASA MALAYSIA sahaja.

Topik yang anda kuasai:
1. KRITERIA KELAYAKAN:
   - B40 = pendapatan isi rumah ≤ RM4,850 sebulan.
   - Miskin Tegar = pendapatan ≤ RM1,169 sebulan (keutamaan tinggi).
   - OKU mendapat bonus +15 mata, tanggungan > 4 orang mendapat bonus +10 mata.
   - Milik sendiri diutamakan untuk "baik_pulih_rumah"; sewa boleh untuk "rumah_mesra_rakyat" (RMR).
   - Geran ekonomi memerlukan pendapatan ≤ RM2,500 (mikro-usahawan B40).

2. DOKUMEN DIPERLUKAN mengikut kategori:
   - baik_pulih_rumah: MyKad, slip gaji, geran tanah / surat akuan pemilikan, gambar rumah, laporan pemeriksaan tapak.
   - rumah_mesra_rakyat: MyKad, slip gaji, kad OKU (jika berkenaan), surat sewa / persetujuan pemilik.
   - geran_ekonomi: MyKad, slip gaji / surat akuan pendapatan, pelan perniagaan, sijil pendaftaran perniagaan.
   - bantuan_sara_hidup: MyKad, slip gaji, kad OKU (jika berkenaan).

3. MAKNA STATUS PERMOHONAN:
   - draf: permohonan belum dihantar.
   - dihantar: permohonan dihantar menunggu semakan.
   - semakan_pbt_ngo: disemak oleh PBT (Trek 1) atau NGO (Trek 2).
   - semakan_daerah: disemak oleh pegawai KPKT daerah.
   - semakan_negeri: disemak oleh pegawai KPKT negeri.
   - diluluskan: permohonan diluluskan.
   - ditolak: permohonan ditolak.
   - dipulangkan: permohonan dipulangkan untuk pembetulan.

4. PERBEZAAN TREK:
   - Trek 1 (bantuan_perumahan): melalui Pihak Berkuasa Tempatan (PBT) — baik pulih rumah, RMR, bantuan sara hidup.
   - Trek 2 (geran_pekb): melalui NGO akreditasi PEKB — geran ekonomi / mikro-usahawan.

5. LANGKAH PERMOHONAN:
   a. Pemohon / pegawai PBT atau NGO mendaftar maklumat penerima.
   b. Muat naik dokumen sokongan.
   c. Hantar permohonan (auto-saringan AI menjalankan semakan kelayakan, dokumen & pertindihan).
   d. Semakan berperingkat: PBT/NGO → KPKT daerah → KPKT negeri.
   e. Keputusan: lulus / tolak / pulang.

Jawapan anda hendaklah ringkas (3-6 ayat), jelas, dan sopan. Jika soalan di luar skop PEKB, beritahu pengguna secara sopan bahawa anda hanya boleh membantu dengan topik berkaitan eBantuan-PEKB.`;

/**
 * Deterministic keyword-based fallback (Bahasa Malaysia).
 */
function fallbackReply(message: string): string {
  const m = (message || "").toLowerCase();

  if (/kelayakan|layak|b40|miskin/.test(m)) {
    return [
      "Kriteria kelayakan PEKB:",
      "• B40: pendapatan isi rumah ≤ RM4,850 sebulan.",
      "• Miskin Tegar: pendapatan ≤ RM1,169 sebulan (keutamaan tinggi).",
      "• OKU mendapat bonus +15 mata; tanggungan > 4 orang mendapat bonus +10 mata.",
      "• Pemilik rumah milik sendiri diutamakan untuk baik pulih; penyewa layak untuk Rumah Mesra Rakyat (RMR).",
    ].join("\n");
  }

  if (/dokumen|muat naik|lampir/.test(m)) {
    return [
      "Dokumen yang biasa diperlukan mengikut kategori bantuan:",
      "• Baik pulih rumah: MyKad, slip gaji, geran tanah, gambar rumah, laporan tapak.",
      "• RMR: MyKad, slip gaji, kad OKU (jika ada), surat sewa.",
      "• Geran ekonomi: MyKad, slip gaji, pelan perniagaan, sijil pendaftaran.",
      "• Bantuan sara hidup: MyKad, slip gaji, kad OKU (jika ada).",
    ].join("\n");
  }

  if (/status|semak|draf|dihantar|lulus|ditolak|dipulangkan/.test(m)) {
    return [
      "Status permohonan dan maknanya:",
      "• draf — belum dihantar.",
      "• dihantar — menunggu semakan.",
      "• semakan_pbt_ngo — disemak PBT (Trek 1) / NGO (Trek 2).",
      "• semakan_daerah — disemak pegawai KPKT daerah.",
      "• semakan_negeri — disemak pegawai KPKT negeri.",
      "• diluluskan / ditolak / dipulangkan — keputusan akhir.",
    ].join("\n");
  }

  if (/trek|pbt|ngo|perbezaan/.test(m)) {
    return [
      "Perbezaan Trek PEKB:",
      "• Trek 1 (bantuan_perumahan): melalui Pihak Berkuasa Tempatan (PBT) — baik pulih rumah, RMR, bantuan sara hidup.",
      "• Trek 2 (geran_pekb): melalui NGO akreditasi PEKB — geran ekonomi / mikro-usahawan.",
    ].join("\n");
  }

  if (/proses|langkah|cara|daftar/.test(m)) {
    return [
      "Langkah permohonan:",
      "1. Daftar maklumat penerima (pegawai PBT/NGO).",
      "2. Muat naik dokumen sokongan.",
      "3. Hantar permohonan (auto-saringan AI akan berjalan).",
      "4. Semakan berperingkat: PBT/NGO → KPKT daerah → KPKT negeri.",
      "5. Keputusan: lulus / tolak / pulang.",
    ].join("\n");
  }

  if (/halo|hai|hi|hello|salam/.test(m)) {
    return "Salam! Saya PEKB Assistant. Boleh saya bantu dengan soalan tentang kelayakan, dokumen, status permohonan, atau proses eBantuan-PEKB?";
  }

  return "Maaf, saya tidak pasti jawapan tepat untuk soalan itu. Saya boleh membantu topik berkaitan: kelayakan PEKB, dokumen diperlukan, status permohonan, perbezaan Trek (PBT vs NGO), dan langkah permohonan. Sila tanya soalan khusus tentang salah satu topik ini.";
}

export async function POST(req: NextRequest) {
  let body: ChatInput = {};
  try {
    body = (await req.json()) as ChatInput;
  } catch {
    body = {};
  }

  const message = (body.message || "").trim();
  if (!message) {
    return NextResponse.json(
      { error: "Mesej diperlukan." },
      { status: 400 }
    );
  }

  // Optional: enrich context if a userId is supplied.
  let userContext = "";
  if (body.userId) {
    try {
      const u = await db.user.findUnique({
        where: { id: body.userId },
        include: { pbt: true, ngo: true },
      });
      if (u) {
        userContext = `\n\n[ Konteks pengguna: ${u.namaPenuh} — peranan: ${u.peranan}${
          u.pbt ? `, PBT: ${u.pbt.namaPbt}` : ""
        }${u.ngo ? `, NGO: ${u.ngo.namaNgo}` : ""} ]`;
      }
    } catch (err) {
      console.error("[AI chatbot] user lookup failed:", err);
    }
  }

  // Build conversation history. The SDK uses 'assistant' role for the system
  // prompt (per z-ai-web-dev-sdk conventions).
  const history = Array.isArray(body.history) ? body.history : [];

  // ---- Try AI path. ----
  try {
    // Compose a single user message combining history for the non-streaming
    // chat() helper. The SDK accepts role 'assistant' for system prompt.
    const conversationPrompt =
      history
        .slice(-6)
        .map((m) => `${m.role === "user" ? "Pengguna" : "PEKB Assistant"}: ${m.content}`)
        .join("\n") + `\nPengguna: ${message}${userContext}`;

    const reply = await chatComplete(
      SYSTEM_PROMPT,
      conversationPrompt
    );

    if (reply && reply.trim().length > 0) {
      return NextResponse.json({
        reply: reply.trim(),
        fallback: false,
      });
    }
    throw new Error("Empty AI reply");
  } catch (err) {
    console.error("[AI chatbot] SDK call failed, using fallback:", err);
    return NextResponse.json({
      reply: fallbackReply(message),
      fallback: true,
    });
  }
}
