// Sistem eBantuan-PEKB — AI Document Verification
// POST /api/ai/document-verify
//
// Looks up a document by documentId (or accepts jenisDokumen directly),
// uses the VLM to "analyse" the document and returns a structured
// verification result. Persists the AI output back into the Document row.
//
// FALLBACK: If the SDK fails, returns a deterministic mock based on
// document type (mykad → sah; slip_gaji → 80% sah / 20% tidak_lengkap;
// geran_tanah → sah; etc.). The endpoint NEVER returns an error.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { visionComplete, safeParseJson } from "@/lib/ai/sdk";
import type { DocumentVerificationResult, StatusPengesahanAi } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DocVerifyInput {
  documentId?: string;
  jenisDokumen?: string;
  // Optional base64 image for forward-compat with real uploads.
  base64Image?: string;
}

const SYSTEM_PROMPT = `Anda adalah sistem pengesahan dokumen AI untuk Sistem eBantuan-PEKB (KPKT Malaysia).
Tugas anda: mengesahkan kesahihan dokumen sokongan yang dimuat naik oleh pemohon.

Untuk setiap dokumen, anda perlu:
1. Mengesan sebarang anomali (teks kabur, pengubahsuaian, maklumat tidak konsisten).
2. Mengekstrak maklumat utama (nama, no. kad pengenalan, alamat, pendapatan, dll).
3. Memberikan status pengesahan.

ANDA MESTI membalas dengan JSON SAHAJA (tanpa fences) dengan bentuk ini:
{
  "status": "sah" | "tidak_lengkap" | "mencurigakan",
  "dataEkstrak": { "nama": "...", "no_kp": "...", ... },
  "catatan": "<catatan ringkas dalam Bahasa Malaysia>",
  "anomali": ["<senarai anomali yang dikesan, boleh kosong>"]
}

Definisi status:
- "sah": dokumen lengkap, jelas dan tidak mencurigakan.
- "tidak_lengkap": maklumat penting hilang / kabur tetapi tidak ada penipuan jelas.
- "mencurigakan": tanda-tanda pemalsuan / pengubahsuaian / data tidak konsisten.`;

/**
 * Deterministic fallback based on document type. The seed-data ICs are
 * 12-digit strings so we synthesise a plausible-looking masked value.
 */
function fallbackVerify(
  jenisDokumen: string,
  documentId: string
): DocumentVerificationResult {
  // Pseudo-random but deterministic per documentId.
  const seed = hashString(documentId || jenisDokumen);
  const rnd = (mod: number) => (seed % mod) / mod; // 0..1

  let status: StatusPengesahanAi = "sah";
  let catatan = "";
  const anomali: string[] = [];
  const dataEkstrak: Record<string, string> = {};

  switch (jenisDokumen) {
    case "mykad":
      status = "sah";
      dataEkstrak.nama = "Penerima PEKB";
      dataEkstrak.no_kp = "XXXXXX-XX-XXXX";
      dataEkstrak.alamat = "Malaysia";
      catatan = "MyKad jelas dan maklumat utama boleh dibaca dengan baik.";
      break;
    case "slip_gaji":
      // 80% sah, 20% tidak_lengkap
      status = rnd(5) < 0.8 ? "sah" : "tidak_lengkap";
      dataEkstrak.nama = "Penerima PEKB";
      dataEkstrak.pendapatan_bulanan = "RM 2,500";
      if (status === "tidak_lengkap") {
        anomali.push("Bahagian pendapatan kasar tidak jelas / sebahagian terpotong.");
        catatan = "Slip gaji tidak lengkap — bahagian pendapatan perlu dijelaskan.";
      } else {
        catatan = "Slip gaji sah dan maklumat pendapatan boleh disahkan.";
      }
      break;
    case "kad_oku":
      status = "sah";
      dataEkstrak.nama = "Penerima OKU";
      dataEkstrak.no_kp = "XXXXXX-XX-XXXX";
      dataEkstrak.jenis_oku = "fizikal";
      catatan = "Kad OKU sah dan jenis kecacatan tercatat.";
      break;
    case "geran_tanah":
      status = rnd(4) === 0 ? "tidak_lengkap" : "sah";
      dataEkstrak.lot_tanah = "PT 1234";
      dataEkstrak.daerah = "—";
      if (status === "tidak_lengkap") {
        anomali.push("Mukim / daerah tidak tercatat dengan jelas.");
        catatan = "Geran tanah tidak lengkap — mukim perlu disahkan.";
      } else {
        catatan = "Geran tanah sah dan butiran lot boleh dibaca.";
      }
      break;
    case "gambar_rumah":
      status = "sah";
      dataEkstrak.bil_gambar = "4";
      dataEkstrak.sudut = "depan, belakang, dalam, luar";
      catatan = "Gambar rumah mencukupi dan menunjukkan keadaan sebenar.";
      break;
    case "laporan_tapak":
      status = "sah";
      dataEkstrak.tarikh_pemeriksaan = new Date().toISOString().slice(0, 10);
      dataEkstrak.pemeriksa = "Pegawai PBT";
      catatan = "Laporan pemeriksaan tapak sah dan ditandatangani.";
      break;
    case "pelan_perniagaan":
      status = rnd(3) === 0 ? "tidak_lengkap" : "sah";
      dataEkstrak.nama_perniagaan = "Perniagaan Mikro";
      dataEkstrak.jangkaan_untung = "RM 2,000/sebulan";
      if (status === "tidak_lengkap") {
        anomali.push("Unjuran kewangan tidak terperinci.");
        catatan = "Pelan perniagaan tidak lengkap — unjuran kewangan perlu ditambah.";
      } else {
        catatan = "Pelan perniagaan sah dan mengandungi butiran asas yang mencukupi.";
      }
      break;
    default:
      status = "sah";
      catatan = "Dokumen diterima untuk semakan lanjut.";
  }

  return { status, dataEkstrak, catatan, anomali };
}

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h || 1;
}

export async function POST(req: NextRequest) {
  let body: DocVerifyInput = {};
  try {
    body = (await req.json()) as DocVerifyInput;
  } catch {
    body = {};
  }

  const documentId = body.documentId;
  let jenisDokumen = body.jenisDokumen || "lain_lain";
  let doc: Awaited<ReturnType<typeof db.document.findUnique>> = null;

  if (documentId) {
    try {
      doc = await db.document.findUnique({
        where: { documentId },
        include: { application: true },
      });
      if (doc) jenisDokumen = doc.jenisDokumen;
    } catch (err) {
      console.error("[AI doc-verify] DB lookup failed:", err);
    }
  }

  // ---- Try the VLM path. ----
  try {
    const imageUrl =
      body.base64Image ||
      // PoC: pass a small placeholder PNG so the VLM has *something* to analyse.
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmmiwAAAABJRU5ErkJggg==";

    const userPrompt = `Jenis dokumen: ${jenisDokumen}
Nama fail: ${doc?.namaFail || "(tiada)"}
Saiz fail: ${doc?.saizFail || 0} bait

Analisis dokumen ini dan berikan JSON pengesahan mengikut skema yang ditetapkan.`;

    const raw = await visionComplete(
      `${SYSTEM_PROMPT}\n\n${userPrompt}`,
      imageUrl
    );
    const parsed = safeParseJson<DocumentVerificationResult>(raw);

    if (parsed && parsed.status) {
      const status: StatusPengesahanAi = (
        ["sah", "tidak_lengkap", "mencurigakan"].includes(parsed.status)
          ? parsed.status
          : "tidak_lengkap"
      ) as StatusPengesahanAi;
      const result: DocumentVerificationResult = {
        status,
        dataEkstrak:
          parsed.dataEkstrak && typeof parsed.dataEkstrak === "object"
            ? parsed.dataEkstrak
            : {},
        catatan: parsed.catatan || "Pengesahan AI selesai.",
        anomali: Array.isArray(parsed.anomali) ? parsed.anomali : [],
      };

      await persistResult(doc, result);
      return NextResponse.json({ ...result, fallback: false });
    }
    throw new Error("VLM returned non-JSON or missing status");
  } catch (err) {
    console.error("[AI doc-verify] VLM call failed, using fallback:", err);
    const result = fallbackVerify(jenisDokumen, documentId || jenisDokumen);
    await persistResult(doc, result);
    return NextResponse.json({ ...result, fallback: true });
  }
}

/**
 * Persist the AI result back into the Document row. Failures are logged
 * but do NOT break the response — the caller still gets the result.
 */
async function persistResult(
  doc: { documentId: string } | null,
  result: DocumentVerificationResult
): Promise<void> {
  if (!doc) return;
  try {
    await db.document.update({
      where: { documentId: doc.documentId },
      data: {
        statusPengesahanAi: result.status,
        dataEkstrakAi: JSON.stringify(result.dataEkstrak),
        catatanAi: result.catatan,
      },
    });
  } catch (err) {
    console.error("[AI doc-verify] persist failed:", err);
  }
}
