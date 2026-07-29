// Sistem eBantuan-PEKB — AI Duplicate Detection
// POST /api/ai/duplicate-check
//
// Accepts { applicationId } or { noKpPenerima, alamatPenerima, namaPenerima }.
// Looks up the application, then searches the DB for OTHER applications
// (cross-track: both bantuan_perumahan and geran_pekb) sharing the same
// noKpPenerima or a similar alamatPenerima. Uses the LLM to assess similarity.
//
// FALLBACK: If the SDK fails, deterministic matching:
//   - exact IC match → disahkan_pertindihan (100%)
//   - same address different IC → disyaki_pertindihan (60%)
//   - no match → tiada_pertindihan (0%)
// The endpoint NEVER returns an error.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatComplete, safeParseJson } from "@/lib/ai/sdk";
import type {
  DuplicateDetectionResult,
  StatusPertindihanAi,
  Trek,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface DupInput {
  applicationId?: string;
  noKpPenerima?: string;
  alamatPenerima?: string;
  namaPenerima?: string;
}

const SYSTEM_PROMPT = `Anda adalah Sistem Pengesanan Pertindihan AI untuk Sistem eBantuan-PEKB (KPKT Malaysia).
Tugas anda: mengesan permohonan pertindihan antara Trek 1 (Bantuan Perumahan PBT) dan Trek 2 (Geran PEKB NGO).

Pertindihan berlaku apabila penerima yang sama (no. KP sama) atau alamat yang serupa memohon lebih daripada satu bantuan dalam tempoh yang sama.

ANDA MESTI membalis dengan JSON SAHAJA (tanpa fences) dengan bentuk ini:
{
  "adaPertindihan": true | false,
  "tahapKeyakinan": <integer 0-100>,
  "padanan": [
    { "noRujukan": "...", "trek": "bantuan_perumahan" | "geran_pekb", "persamaan": "<sebab padanan>" }
  ]
}

Peraturan:
- no. KP yang sama = pertindihan disahkan (keyakinan ≥ 90).
- alamat sama tetapi no. KP berbeza = pertindihan disyaki (keyakinan 40-70).
- nama sama + negeri sama tetapi alamat berbeza = keyakinan rendah (10-30).`;

function normaliseAddr(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function addressSimilarity(a: string, b: string): number {
  const na = normaliseAddr(a);
  const nb = normaliseAddr(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  // Token-overlap Jaccard.
  const ta = new Set(na.split(" "));
  const tb = new Set(nb.split(" "));
  let inter = 0;
  ta.forEach((t) => {
    if (tb.has(t)) inter += 1;
  });
  const union = ta.size + tb.size - inter;
  return union === 0 ? 0 : inter / union;
}

/**
 * Deterministic fallback detector.
 */
function localDuplicate(
  input: DupInput,
  candidates: Array<{
    applicationId: string;
    noRujukan: string;
    trek: string;
    noKpPenerima: string;
    alamatPenerima: string;
    namaPenerima: string;
  }>
): DuplicateDetectionResult {
  const padanan: DuplicateDetectionResult["padanan"] = [];
  let maxKeyakinan = 0;

  for (const c of candidates) {
    const icMatch = c.noKpPenerima && c.noKpPenerima === input.noKpPenerima;
    const addrSim = addressSimilarity(
      c.alamatPenerima || "",
      input.alamatPenerima || ""
    );
    const nameSim =
      (c.namaPenerima || "").toLowerCase() ===
      (input.namaPenerima || "").toLowerCase();

    let keyakinan = 0;
    let persamaan = "";

    if (icMatch) {
      keyakinan = 100;
      persamaan = `No. KP penerima sepadan (${c.noKpPenerima}).`;
    } else if (addrSim >= 0.7) {
      keyakinan = Math.round(60 + addrSim * 20);
      persamaan = `Alamat penerima sangat serupa (${Math.round(
        addrSim * 100
      )}% padanan).`;
    } else if (addrSim >= 0.4 || nameSim) {
      keyakinan = Math.round(40 + addrSim * 20);
      persamaan = `Alamat / nama penerima mempunyai persamaan (${Math.round(
        addrSim * 100
      )}%).`;
    }

    if (keyakinan > 0) {
      padanan.push({
        noRujukan: c.noRujukan,
        trek: c.trek as Trek,
        persamaan,
      });
      if (keyakinan > maxKeyakinan) maxKeyakinan = keyakinan;
    }
  }

  return {
    adaPertindihan: padanan.length > 0,
    tahapKeyakinan: maxKeyakinan,
    padanan,
  };
}

function statusFromKeyakinan(k: number): StatusPertindihanAi {
  if (k >= 90) return "disahkan_pertindihan";
  if (k >= 40) return "disyaki_pertindihan";
  return "tiada_pertindihan";
}

export async function POST(req: NextRequest) {
  let body: DupInput = {};
  try {
    body = (await req.json()) as DupInput;
  } catch {
    body = {};
  }

  // Resolve input fields from the application if only applicationId is provided.
  let applicationId: string | undefined = body.applicationId;
  let noKp = body.noKpPenerima || "";
  let alamat = body.alamatPenerima || "";
  let nama = body.namaPenerima || "";

  if (applicationId) {
    try {
      const app = await db.application.findUnique({
        where: { applicationId },
      });
      if (app) {
        noKp = noKp || app.noKpPenerima;
        alamat = alamat || app.alamatPenerima;
        nama = nama || app.namaPenerima;
      }
    } catch (err) {
      console.error("[AI dup-check] application lookup failed:", err);
    }
  }

  // Search DB for candidate matches (exclude self).
  const candidates: Array<{
    applicationId: string;
    noRujukan: string;
    trek: string;
    noKpPenerima: string;
    alamatPenerima: string;
    namaPenerima: string;
  }> = [];

  try {
    // SQLite has no full-text search — fetch a broad pool (excluding self) and
    // filter meaningfully in JS. Capped to keep the response snappy.
    const rows = await db.application.findMany({
      where: applicationId ? { NOT: { applicationId } } : undefined,
      select: {
        applicationId: true,
        noRujukan: true,
        trek: true,
        noKpPenerima: true,
        alamatPenerima: true,
        namaPenerima: true,
      },
      take: 500,
    });

    // In-JS filter: same IC OR meaningful address overlap.
    for (const r of rows) {
      if (noKp && r.noKpPenerima === noKp) {
        candidates.push(r);
        continue;
      }
      const sim = addressSimilarity(r.alamatPenerima, alamat);
      if (sim >= 0.4 || (nama && r.namaPenerima.toLowerCase() === nama.toLowerCase())) {
        candidates.push(r);
      }
    }
  } catch (err) {
    console.error("[AI dup-check] candidate search failed:", err);
  }

  // ---- Try AI similarity assessment. ----
  try {
    const userPrompt = `Penerima rujukan:
- noKpPenerima: ${noKp || "(tiada)"}
- namaPenerima: ${nama || "(tiada)"}
- alamatPenerima: ${alamat || "(tiada)"}

Calon-calon pertindihan yang ditemui dalam pangkalan data:
${JSON.stringify(candidates, null, 2)}

Berikan penilaian JSON pengesanan pertindihan.`;

    const raw = await chatComplete(SYSTEM_PROMPT, userPrompt);
    const parsed = safeParseJson<DuplicateDetectionResult>(raw);

    if (parsed && typeof parsed.adaPertindihan === "boolean") {
      const result: DuplicateDetectionResult = {
        adaPertindihan: parsed.adaPertindihan,
        tahapKeyakinan: Math.max(
          0,
          Math.min(100, Math.round(parsed.tahapKeyakinan ?? 0))
        ),
        padanan: Array.isArray(parsed.padanan) ? parsed.padanan : [],
      };

      await persistStatus(applicationId, result.tahapKeyakinan);
      return NextResponse.json({ ...result, fallback: false });
    }
    throw new Error("AI returned non-JSON or missing adaPertindihan");
  } catch (err) {
    console.error("[AI dup-check] SDK call failed, using fallback:", err);
    const result = localDuplicate(body, candidates);
    await persistStatus(applicationId, result.tahapKeyakinan);
    return NextResponse.json({ ...result, fallback: true });
  }
}

async function persistStatus(
  applicationId: string | undefined,
  keyakinan: number
): Promise<void> {
  if (!applicationId) return;
  try {
    await db.application.update({
      where: { applicationId },
      data: { statusPertindihanAi: statusFromKeyakinan(keyakinan) },
    });
  } catch (err) {
    console.error("[AI dup-check] persist failed:", err);
  }
}
