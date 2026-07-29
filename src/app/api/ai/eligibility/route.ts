// Sistem eBantuan-PEKB — AI Eligibility Screening
// POST /api/ai/eligibility
//
// Accepts application data and returns an EligibilityResult with a 0-100 score,
// a Bahasa Malaysia recommendation, justification, alternative categories
// and weighted contributing factors.
//
// FALLBACK: If the SDK fails (missing key, network error, malformed JSON),
// a deterministic local scorer using the same PEKB criteria is used and the
// response includes `fallback: true`. The endpoint NEVER returns an error.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatComplete, safeParseJson, scoreToCadangan } from "@/lib/ai/sdk";
import type { EligibilityResult, CadanganAi } from "@/lib/types";

export const runtime = "nodejs";
// Always run dynamically — we hit the DB and external SDK.
export const dynamic = "force-dynamic";

interface EligibilityInput {
  pendapatanIsiRumah?: number;
  bilanganTanggungan?: number;
  statusOku?: boolean;
  jenisOku?: string;
  statusPemilikanRumah?: string;
  jenisRumah?: string;
  kategoriBantuan?: string;
  negeri?: string;
  daerah?: string;
}

const SYSTEM_PROMPT = `Anda adalah Penilai Kelayakan AI untuk Sistem eBantuan-PEKB (KPKT Malaysia).
Tugas anda: menilai kelayakan pemohon bantuan perumahan dan geran PEKB berdasarkan kriteria berikut.

KRITERIA KELAYAKAN PEKB:
1. B40 = pendapatan isi rumah ≤ RM4,850 sebulan (kelayakan asas).
2. Miskin Tegar = pendapatan isi rumah ≤ RM1,169 sebulan (keutamaan tinggi).
3. OKU (Orang Kurang Upaya) mendapat bonus +15 mata.
4. Bilangan tanggungan > 4 orang mendapat bonus +10 mata.
5. Status pemilikan rumah "milik_sendiri" diutamakan untuk bantuan "baik_pulih_rumah".
6. Status "sewa" boleh diterima untuk "rumah_mesra_rakyat" (RMR).
7. Pendapatan melebihi RM4,850 → tidak layak (skor rendah).
8. Kategori "geran_ekonomi" memerlukan pendapatan ≤ RM2,500 (mikro-usahawan B40).

ANDA MESTI membalas dengan JSON SAHAJA (tanpa fences atau teks lain) dengan bentuk ini:
{
  "skor": <integer 0-100>,
  "cadangan": "lulus" | "tolak" | "semak_semula",
  "justifikasi": "<penjelasan ringkas dalam Bahasa Malaysia>",
  "kategoriAlternatif": ["<kategori alternatif yang mungkin lebih sesuai>"],
  "faktor": [
    { "label": "<nama faktor>", "impact": "positif" | "negatif", "weight": <0-100> }
  ]
}

Ambang skor: ≥70 = lulus, 50-69 = semak_semula, <50 = tolak.`;

/**
 * Deterministic local eligibility scorer — used when the SDK is unavailable.
 * Mirrors the PEKB criteria described in the system prompt.
 */
async function localEligibility(input: EligibilityInput): Promise<EligibilityResult> {
  const pendapatan = Number(input.pendapatanIsiRumah ?? 0);
  const tanggungan = Number(input.bilanganTanggungan ?? 0);
  const isOku = Boolean(input.statusOku);
  const milikan = input.statusPemilikanRumah ?? "sewa";
  const kategori = input.kategoriBantuan ?? "baik_pulih_rumah";

  const faktor: EligibilityResult["faktor"] = [];
  let skor = 50; // baseline netral

  // Pendapatan
  if (pendapatan <= 1169) {
    skor += 30;
    faktor.push({
      label: "Pendapatan ≤ RM1,169 (Miskin Tegar)",
      impact: "positif",
      weight: 30,
    });
  } else if (pendapatan <= 2500) {
    skor += 22;
    faktor.push({
      label: "Pendapatan ≤ RM2,500 (B40 bawahan)",
      impact: "positif",
      weight: 22,
    });
  } else if (pendapatan <= 4850) {
    skor += 12;
    faktor.push({
      label: "Pendapatan ≤ RM4,850 (B40)",
      impact: "positif",
      weight: 12,
    });
  } else if (pendapatan <= 6000) {
    skor -= 15;
    faktor.push({
      label: "Pendapatan melebihi RM4,850 (Bukan B40)",
      impact: "negatif",
      weight: 25,
    });
  } else {
    skor -= 40;
    faktor.push({
      label: "Pendapatan tinggi — tidak layak B40",
      impact: "negatif",
      weight: 50,
    });
  }

  // OKU
  if (isOku) {
    skor += 15;
    faktor.push({
      label: `Status OKU (${input.jenisOku || "tidak dinyatakan"})`,
      impact: "positif",
      weight: 15,
    });
  }

  // Tanggungan
  if (tanggungan > 4) {
    skor += 10;
    faktor.push({
      label: `Tanggungan ${tanggungan} orang (> 4)`,
      impact: "positif",
      weight: 10,
    });
  } else if (tanggungan >= 1) {
    skor += 4;
    faktor.push({
      label: `Tanggungan ${tanggungan} orang`,
      impact: "positif",
      weight: 4,
    });
  }

  // Pemilikan rumah vs kategori
  if (kategori === "baik_pulih_rumah") {
    if (milikan === "milik_sendiri") {
      skor += 6;
      faktor.push({
        label: "Milik sendiri (sesuai untuk baik pulih)",
        impact: "positif",
        weight: 6,
      });
    } else if (milikan === "sewa") {
      skor -= 4;
      faktor.push({
        label: "Rumah sewa (kurang sesuai untuk baik pulih)",
        impact: "negatif",
        weight: 8,
      });
    }
  } else if (kategori === "rumah_mesra_rakyat") {
    if (milikan === "sewa") {
      skor += 5;
      faktor.push({
        label: "Penyewa (sesuai untuk RMR)",
        impact: "positif",
        weight: 5,
      });
    }
  } else if (kategori === "geran_ekonomi") {
    if (pendapatan > 2500) {
      skor -= 12;
      faktor.push({
        label: "Pendapatan melebihi had geran ekonomi (≤ RM2,500)",
        impact: "negatif",
        weight: 15,
      });
    }
  }

  // Clamp 0–100
  skor = Math.max(0, Math.min(100, Math.round(skor)));

  // Kategori alternatif
  const kategoriAlternatif: string[] = [];
  if (kategori === "baik_pulih_rumah" && milikan === "sewa") {
    kategoriAlternatif.push("rumah_mesra_rakyat");
  }
  if (kategori === "geran_ekonomi" && pendapatan <= 1169) {
    kategoriAlternatif.push("bantuan_sara_hidup");
  }
  if (kategori !== "geran_ekonomi" && pendapatan <= 2500) {
    kategoriAlternatif.push("geran_ekonomi");
  }

  // Cadangan
  let ambangLulus = 70;
  let ambangSemak = 50;
  try {
    const cfg = await db.aiConfig.findUnique({ where: { id: 1 } });
    if (cfg) {
      ambangLulus = cfg.ambangSkorLulus;
      ambangSemak = cfg.ambangSkorSemak;
    }
  } catch {
    /* ignore — use defaults */
  }
  const cadangan: CadanganAi = scoreToCadangan(skor, ambangLulus, ambangSemak);

  const justifikasi = buildLocalJustifikasi(input, skor, cadangan);

  return {
    skor,
    cadangan,
    justifikasi,
    kategoriAlternatif,
    faktor,
  };
}

function buildLocalJustifikasi(
  input: EligibilityInput,
  skor: number,
  cadangan: CadanganAi
): string {
  const pendapatan = Number(input.pendapatanIsiRumah ?? 0);
  const tanggungan = Number(input.bilanganTanggungan ?? 0);
  const parts: string[] = [];
  parts.push(
    `Pendapatan isi rumah RM${pendapatan.toLocaleString("ms-MY")}/bulan.`
  );
  if (pendapatan <= 1169) {
    parts.push("Penerima berada dalam kategori Miskin Tegar (keutamaan tinggi).");
  } else if (pendapatan <= 4850) {
    parts.push("Penerima layak dalam kumpulan B40.");
  } else {
    parts.push("Pendapatan melebihi had B40 (RM4,850).");
  }
  if (input.statusOku) parts.push("Penerima berstatus OKU (bonus +15).");
  if (tanggungan > 4) parts.push(`Tanggungan ${tanggungan} orang (bonus +10).`);
  parts.push(`Skor akhir: ${skor}/100 → cadangan: ${cadangan.toUpperCase()}.`);
  return parts.join(" ");
}

export async function POST(req: NextRequest) {
  let body: EligibilityInput = {};
  try {
    body = (await req.json()) as EligibilityInput;
  } catch {
    body = {};
  }

  // Attempt AI path first.
  try {
    const userPrompt = `Nilai kelayakan pemohon berikut dan berikan JSON:\n${JSON.stringify(
      body,
      null,
      2
    )}`;

    const raw = await chatComplete(SYSTEM_PROMPT, userPrompt);
    const parsed = safeParseJson<EligibilityResult>(raw);
    if (parsed && typeof parsed.skor === "number" && parsed.cadangan) {
      // Normalise fields.
      const skor = Math.max(0, Math.min(100, Math.round(parsed.skor)));
      const cadangan =
        parsed.cadangan === "lulus" ||
        parsed.cadangan === "tolak" ||
        parsed.cadangan === "semak_semula"
          ? parsed.cadangan
          : "semak_semula";
      const result: EligibilityResult = {
        skor,
        cadangan,
        justifikasi: parsed.justifikasi || "Penilaian AI selesai.",
        kategoriAlternatif: Array.isArray(parsed.kategoriAlternatif)
          ? parsed.kategoriAlternatif
          : [],
        faktor: Array.isArray(parsed.faktor) ? parsed.faktor : [],
      };
      return NextResponse.json({ ...result, fallback: false });
    }
    throw new Error("AI returned non-JSON or missing fields");
  } catch (err) {
    console.error("[AI eligibility] SDK call failed, using fallback:", err);
    const result = await localEligibility(body);
    return NextResponse.json({ ...result, fallback: true });
  }
}
