import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/analytics/ngo-performance
// Prestasi setiap NGO: jumlah permohonan, diluluskan, menunggu, purata skor AI, jumlah nilai
export async function GET() {
  try {
    const ngos = await db.ngoProfile.findMany({
      select: {
        ngoId: true,
        namaNgo: true,
        noAkreditasiPekb: true,
        noPendaftaranRos: true,
        negeriOperasi: true,
        daerahOperasi: true,
        statusAkreditasi: true,
      },
    });

    const apps = await db.application.findMany({
      where: { trek: "geran_pekb", ngoId: { not: null } },
      select: {
        ngoId: true,
        statusPermohonan: true,
        skorKelayakanAi: true,
        nilaiGeranDipohon: true,
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
      if (!a.ngoId) continue;
      const s =
        stats.get(a.ngoId) ?? {
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
        s.valueApproved += a.nilaiGeranDipohon ?? 0;
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
      stats.set(a.ngoId, s);
    }

    const result = ngos.map((n) => {
      const s = stats.get(n.ngoId);
      return {
        ngoId: n.ngoId,
        namaNgo: n.namaNgo,
        noAkreditasiPekb: n.noAkreditasiPekb,
        noPendaftaranRos: n.noPendaftaranRos,
        negeriOperasi: n.negeriOperasi,
        daerahOperasi: n.daerahOperasi,
        statusAkreditasi: n.statusAkreditasi,
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

    result.sort((a, b) => b.total - a.total);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[analytics/ngo-performance] error:", err);
    return NextResponse.json(
      { error: "Gagal mendapatkan prestasi NGO" },
      { status: 500 }
    );
  }
}
