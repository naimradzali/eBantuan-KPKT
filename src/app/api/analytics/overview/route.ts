import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/analytics/overview
// Ringkasan analitik peringkat tinggi untuk dashboard KPKT (PRD §6.7 FR-19)
export async function GET() {
  try {
    // Total keseluruhan mengikut status utama
    const [
      totalApplications,
      totalApproved,
      totalRejected,
      totalPending,
      totalValueApprovedAgg,
      avgSkorAiAgg,
      duplicateDetected,
    ] = await Promise.all([
      db.application.count(),
      db.application.count({ where: { statusPermohonan: "diluluskan" } }),
      db.application.count({ where: { statusPermohonan: "ditolak" } }),
      db.application.count({
        where: {
          statusPermohonan: {
            in: [
              "dihantar",
              "semakan_pbt_ngo",
              "semakan_daerah",
              "semakan_negeri",
            ],
          },
        },
      }),
      db.application.aggregate({
        where: { statusPermohonan: "diluluskan" },
        _sum: {
          nilaiAnggaranKerja: true,
          nilaiGeranDipohon: true,
        },
      }),
      db.application.aggregate({
        _avg: { skorKelayakanAi: true },
      }),
      db.application.count({
        where: {
          statusPertindihanAi: {
            in: ["disyaki_pertindihan", "disahkan_pertindihan"],
          },
        },
      }),
    ]);

    const totalValueApproved =
      (totalValueApprovedAgg._sum.nilaiAnggaranKerja ?? 0) +
      (totalValueApprovedAgg._sum.nilaiGeranDipohon ?? 0);

    // Pengasingan mengikut trek
    const [trekBp, trekGp] = await Promise.all([
      buildTrekSummary("bantuan_perumahan"),
      buildTrekSummary("geran_pekb"),
    ]);

    // Pengasingan mengikut status permohonan
    const byStatusGroup = await db.application.groupBy({
      by: ["statusPermohonan"],
      _count: { _all: true },
    });
    const byStatus: Record<string, number> = {};
    for (const r of byStatusGroup) {
      byStatus[r.statusPermohonan] = r._count._all;
    }

    // Pengasingan mengikut kategori bantuan
    const byKategoriGroup = await db.application.groupBy({
      by: ["kategoriBantuan"],
      _count: { _all: true },
    });
    const byKategori: Record<string, number> = {};
    for (const r of byKategoriGroup) {
      byKategori[r.kategoriBantuan] = r._count._all;
    }

    // Pengasingan mengikut negeri penerima (perlu fetch + reduce)
    const apps = await db.application.findMany({
      where: { negeriPenerima: { not: "" } },
      select: {
        negeriPenerima: true,
        statusPermohonan: true,
        nilaiAnggaranKerja: true,
        nilaiGeranDipohon: true,
      },
    });
    const negeriMap = new Map<
      string,
      { count: number; approved: number; value: number }
    >();
    for (const a of apps) {
      const key = a.negeriPenerima;
      const entry = negeriMap.get(key) ?? { count: 0, approved: 0, value: 0 };
      entry.count += 1;
      if (a.statusPermohonan === "diluluskan") {
        entry.approved += 1;
        entry.value +=
          (a.nilaiAnggaranKerja ?? 0) + (a.nilaiGeranDipohon ?? 0);
      }
      negeriMap.set(key, entry);
    }
    const byNegeri = Array.from(negeriMap.entries())
      .map(([negeri, v]) => ({ negeri, ...v }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json({
      totalApplications,
      totalApproved,
      totalRejected,
      totalPending,
      totalValueApproved,
      byTrek: {
        bantuan_perumahan: trekBp,
        geran_pekb: trekGp,
      },
      byStatus,
      byKategori,
      byNegeri,
      avgSkorAi: avgSkorAiAgg._avg.skorKelayakanAi ?? 0,
      duplicateDetected,
    });
  } catch (err) {
    console.error("[analytics/overview] error:", err);
    return NextResponse.json(
      { error: "Gagal mendapatkan ringkasan analitik" },
      { status: 500 }
    );
  }
}

async function buildTrekSummary(trek: "bantuan_perumahan" | "geran_pekb") {
  const [total, approved, rejected, pending, valueAgg] = await Promise.all([
    db.application.count({ where: { trek } }),
    db.application.count({
      where: { trek, statusPermohonan: "diluluskan" },
    }),
    db.application.count({
      where: { trek, statusPermohonan: "ditolak" },
    }),
    db.application.count({
      where: {
        trek,
        statusPermohonan: {
          in: [
            "dihantar",
            "semakan_pbt_ngo",
            "semakan_daerah",
            "semakan_negeri",
          ],
        },
      },
    }),
    db.application.aggregate({
      where: { trek, statusPermohonan: "diluluskan" },
      _sum: {
        nilaiAnggaranKerja: true,
        nilaiGeranDipohon: true,
      },
    }),
  ]);

  const valueApproved =
    trek === "bantuan_perumahan"
      ? valueAgg._sum.nilaiAnggaranKerja ?? 0
      : valueAgg._sum.nilaiGeranDipohon ?? 0;

  return { total, approved, pending, rejected, valueApproved };
}
