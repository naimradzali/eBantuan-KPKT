import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/analytics/pbt-performance
// Prestasi setiap PBT: jumlah permohonan, diluluskan, menunggu, purata skor AI, jumlah nilai
export async function GET() {
  try {
    const pbts = await db.pbtProfile.findMany({
      select: {
        pbtId: true,
        namaPbt: true,
        kodPbt: true,
        negeri: true,
        daerah: true,
        kategoriPbt: true,
        statusAkaunPbt: true,
      },
    });

    // Kumpulkan agregat per PBT menggunakan findMany + reduce (lebih ringkas untuk SQLite)
    const apps = await db.application.findMany({
      where: { trek: "bantuan_perumahan", pbtId: { not: null } },
      select: {
        pbtId: true,
        statusPermohonan: true,
        skorKelayakanAi: true,
        nilaiAnggaranKerja: true,
      },
    });

    const stats = new Map<
      string,
      {
        total: number;
        approved: number;
        pending: number;
        rejected: number;
        skorAiSum: number;
        skorAiCount: number;
        valueApproved: number;
      }
    >();

    for (const a of apps) {
      if (!a.pbtId) continue;
      const s =
        stats.get(a.pbtId) ?? {
          total: 0,
          approved: 0,
          pending: 0,
          rejected: 0,
          skorAiSum: 0,
          skorAiCount: 0,
          valueApproved: 0,
        };
      s.total += 1;
      if (a.statusPermohonan === "diluluskan") {
        s.approved += 1;
        s.valueApproved += a.nilaiAnggaranKerja ?? 0;
      } else if (a.statusPermohonan === "ditolak") {
        s.rejected += 1;
      } else if (
        [
          "dihantar",
          "semakan_pbt_ngo",
          "semakan_daerah",
          "semakan_negeri",
        ].includes(a.statusPermohonan)
      ) {
        s.pending += 1;
      }
      s.skorAiSum += a.skorKelayakanAi ?? 0;
      s.skorAiCount += 1;
      stats.set(a.pbtId, s);
    }

    const result = pbts.map((p) => {
      const s = stats.get(p.pbtId);
      return {
        pbtId: p.pbtId,
        namaPbt: p.namaPbt,
        kodPbt: p.kodPbt,
        negeri: p.negeri,
        daerah: p.daerah,
        kategoriPbt: p.kategoriPbt,
        statusAkaunPbt: p.statusAkaunPbt,
        total: s?.total ?? 0,
        approved: s?.approved ?? 0,
        pending: s?.pending ?? 0,
        rejected: s?.rejected ?? 0,
        avgSkorAi:
          s && s.skorAiCount > 0
            ? Math.round((s.skorAiSum / s.skorAiCount) * 100) / 100
            : 0,
        totalValueApproved: s?.valueApproved ?? 0,
      };
    });

    // Susun ikut jumlah permohonan menurun
    result.sort((a, b) => b.total - a.total);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[analytics/pbt-performance] error:", err);
    return NextResponse.json(
      { error: "Gagal mendapatkan prestasi PBT" },
      { status: 500 }
    );
  }
}
