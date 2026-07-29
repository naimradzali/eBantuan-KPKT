// Sistem eBantuan-PEKB — AI Decision Support
// POST /api/ai/decision-support
//
// Looks up the full application (penerima, documents, AI scores, audit trail)
// and uses the LLM to produce a Bahasa Malaysia summary, a recommendation,
// a list of reasons and risk factors.
//
// FALLBACK: If the SDK fails, builds the summary from the DB fields and
// recommends based on the AiConfig thresholds. The endpoint NEVER errors.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { chatComplete, safeParseJson, scoreToCadangan } from "@/lib/ai/sdk";
import type { Prisma } from "@prisma/client";
import type { DecisionSupportResult, CadanganAi } from "@/lib/types";
import { KATEGORI_LABELS, PERTINDIHAN_LABELS } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ApplicationWithRelations = Prisma.ApplicationGetPayload<{
  include: {
    pbt: true;
    ngo: true;
    disediakanOleh: true;
    documents: true;
    auditLogs: { include: { pengguna: true } };
  };
}>;

interface DecisionInput {
  applicationId: string;
}

const SYSTEM_PROMPT = `Anda adalah Penasihat Keputusan AI untuk Sistem eBantuan-PEKB (KPKT Malaysia).
Tugas anda: membantu pegawai penilai membuat keputusan sama ada permohonan patut:
- "lulus" — disokong untuk kelulusan,
- "tolak" — tidak disokong,
- "semak_semula" — perlu semakan tambahan oleh pegawai.

Pertimbangkan:
1. Skor kelayakan AI dan faktor yang mempengaruhi skor.
2. Status pengesahan dokumen (sah / tidak_lengkap / mencurigakan).
3. Status pertindihan AI (tiada / disyaki / disahkan pertindihan).
4. Pendapatan, tanggungan, status OKU.
5. Catatan audit / nota penilai sebelumnya.

ANDA MESTI membalas dengan JSON SAHAJA (tanpa fences) dengan bentuk ini:
{
  "ringkasan": "<3-5 ayat ringkasan dalam Bahasa Malaysia>",
  "cadangan": "lulus" | "tolak" | "semak_semula",
  "sebab": ["<sebab 1>", "<sebab 2>", "..."],
  "faktorRisiko": ["<faktor risiko 1>", "..."]
}`;

export async function POST(req: NextRequest) {
  let body: DecisionInput = { applicationId: "" };
  try {
    body = (await req.json()) as DecisionInput;
  } catch {
    /* ignore */
  }

  const applicationId = body.applicationId;
  if (!applicationId) {
    return NextResponse.json(
      { error: "applicationId diperlukan." },
      { status: 400 }
    );
  }

  // Load full application with relations.
  let app: ApplicationWithRelations | null = null;
  let config: Awaited<ReturnType<typeof db.aiConfig.findUnique>> = null;
  try {
    [app, config] = await Promise.all([
      db.application.findUnique({
        where: { applicationId },
        include: {
          pbt: true,
          ngo: true,
          disediakanOleh: true,
          documents: true,
          auditLogs: { include: { pengguna: true }, take: 20, orderBy: { capMasa: "desc" } },
        },
      }),
      db.aiConfig.findUnique({ where: { id: 1 } }),
    ]);
  } catch (err) {
    console.error("[AI decision-support] DB lookup failed:", err);
  }

  if (!app) {
    return NextResponse.json(
      { error: "Permohonan tidak dijumpai." },
      { status: 404 }
    );
  }

  const ambangLulus = config?.ambangSkorLulus ?? 70;
  const ambangSemak = config?.ambangSkorSemak ?? 50;

  // ---- Try AI path. ----
  try {
    const payload = {
      noRujukan: app.noRujukan,
      trek: app.trek,
      kategoriBantuan: KATEGORI_LABELS[app.kategoriBantuan as keyof typeof KATEGORI_LABELS] || app.kategoriBantuan,
      namaPenerima: app.namaPenerima,
      noKpPenerima: app.noKpPenerima,
      pendapatanIsiRumah: app.pendapatanIsiRumah,
      bilanganTanggungan: app.bilanganTanggungan,
      statusOku: app.statusOku,
      jenisOku: app.jenisOku,
      statusPemilikanRumah: app.statusPemilikanRumah,
      jenisRumah: app.jenisRumah,
      statusPermohonan: app.statusPermohonan,
      skorKelayakanAi: app.skorKelayakanAi,
      cadanganAi: app.cadanganAi,
      statusPertindihanAi:
        PERTINDIHAN_LABELS[app.statusPertindihanAi as keyof typeof PERTINDIHAN_LABELS] ||
        app.statusPertindihanAi,
      notaAi: app.notaAi,
      nilaiAnggaranKerja: app.nilaiAnggaranKerja,
      nilaiGeranDipohon: app.nilaiGeranDipohon,
      dokumen: app.documents.map((d) => ({
        jenisDokumen: d.jenisDokumen,
        statusPengesahanAi: d.statusPengesahanAi,
        catatanAi: d.catatanAi,
      })),
      auditTerbaru: app.auditLogs.slice(0, 5).map((l) => ({
        tindakan: l.tindakan,
        perincian: l.perincian,
        capMasa: l.capMasa,
      })),
    };

    const userPrompt = `Beri cadangan keputusan untuk permohonan berikut:\n${JSON.stringify(
      payload,
      null,
      2
    )}\n\nAmbang skor: lulus ≥ ${ambangLulus}, semak_semula ≥ ${ambangSemak}.`;

    const raw = await chatComplete(SYSTEM_PROMPT, userPrompt);
    const parsed = safeParseJson<DecisionSupportResult>(raw);

    if (parsed && parsed.ringkasan && parsed.cadangan) {
      const cadangan: CadanganAi = (
        ["lulus", "tolak", "semak_semula"].includes(parsed.cadangan)
          ? parsed.cadangan
          : "semak_semula"
      ) as CadanganAi;
      const result: DecisionSupportResult = {
        ringkasan: parsed.ringkasan,
        cadangan,
        sebab: Array.isArray(parsed.sebab) ? parsed.sebab : [],
        faktorRisiko: Array.isArray(parsed.faktorRisiko)
          ? parsed.faktorRisiko
          : [],
      };
      return NextResponse.json({ ...result, fallback: false });
    }
    throw new Error("AI returned non-JSON or missing fields");
  } catch (err) {
    console.error("[AI decision-support] SDK call failed, using fallback:", err);
    const result = localDecision(app, ambangLulus, ambangSemak);
    return NextResponse.json({ ...result, fallback: true });
  }
}

/**
 * Deterministic decision support built from DB fields.
 */
function localDecision(
  app: ApplicationWithRelations,
  ambangLulus: number,
  ambangSemak: number
): DecisionSupportResult {
  const skor = app.skorKelayakanAi || 0;
  const cadangan: CadanganAi = scoreToCadangan(skor, ambangLulus, ambangSemak);

  const ringkasanParts: string[] = [];
  ringkasanParts.push(
    `Permohonan ${app.noRujukan} bagi ${app.namaPenerima} (${KATEGORI_LABELS[app.kategoriBantuan as keyof typeof KATEGORI_LABELS] || app.kategoriBantuan}).`
  );
  ringkasanParts.push(`Skor kelayakan AI: ${skor}/100.`);
  ringkasanParts.push(
    `Pendapatan isi rumah RM${app.pendapatanIsiRumah.toLocaleString("ms-MY")}.`
  );
  if (app.statusOku) ringkasanParts.push("Penerima berstatus OKU.");
  if (app.bilanganTanggungan > 4)
    ringkasanParts.push(`Tanggungan ${app.bilanganTanggungan} orang.`);
  ringkasanParts.push(
    `Status pertindihan AI: ${PERTINDIHAN_LABELS[app.statusPertindihanAi as keyof typeof PERTINDIHAN_LABELS] || app.statusPertindihanAi}.`
  );
  const ringkasan = ringkasanParts.join(" ");

  const sebab: string[] = [];
  const faktorRisiko: string[] = [];

  if (skor >= ambangLulus) {
    sebab.push(`Skor kelayakan AI (${skor}) melepasi ambang lulus (${ambangLulus}).`);
  } else if (skor >= ambangSemak) {
    sebab.push(`Skor kelayakan AI (${skor}) berada dalam zon semak semula.`);
  } else {
    sebab.push(`Skor kelayakan AI (${skor}) di bawah ambang minimum (${ambangSemak}).`);
  }

  if (app.pendapatanIsiRumah <= 1169) {
    sebab.push("Penerima berada dalam kategori Miskin Tegar.");
  } else if (app.pendapatanIsiRumah <= 4850) {
    sebab.push("Penerima layak dalam kumpulan B40.");
  } else {
    faktorRisiko.push("Pendapatan melebihi had B40 — kelayakan diragui.");
  }

  if (app.statusOku) sebab.push("Penerima berstatus OKU (keutamaan tambahan).");

  const docs = app.documents;
  if (docs.length > 0) {
    const mencurigakan = docs.filter((d) => d.statusPengesahanAi === "mencurigakan");
    const tidakLengkap = docs.filter((d) => d.statusPengesahanAi === "tidak_lengkap");
    if (mencurigakan.length > 0) {
      faktorRisiko.push(
        `${mencurigakan.length} dokumen ditanda mencurigakan oleh AI.`
      );
    }
    if (tidakLengkap.length > 0) {
      faktorRisiko.push(
        `${tidakLengkap.length} dokumen tidak lengkap — perlu dimuat naik semula.`
      );
    }
  }

  if (app.statusPertindihanAi === "disahkan_pertindihan") {
    faktorRisiko.push("Pertindihan disahkan dengan permohonan lain — siasatan diperlukan.");
  } else if (app.statusPertindihanAi === "disyaki_pertindihan") {
    faktorRisiko.push("Pertindihan disyaki — pengesahan tambahan disyorkan.");
  }

  return {
    ringkasan,
    cadangan,
    sebab,
    faktorRisiko,
  };
}
