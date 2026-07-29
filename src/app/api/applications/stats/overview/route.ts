import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/applications/stats/overview?userId=...&role=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId") || undefined;
    const role = searchParams.get("role") || undefined;

    // Bina penapis berdasarkan peranan
    const where: Record<string, unknown> = {};

    if (userId) {
      const currentUser = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, peranan: true, pbtId: true, ngoId: true },
      });
      if (currentUser) {
        const r = currentUser.peranan;
        if (r === "pegawai_pbt" || r === "penilai_pbt") {
          where.pbtId = currentUser.pbtId;
        } else if (r === "wakil_ngo" || r === "penilai_ngo") {
          where.ngoId = currentUser.ngoId;
        }
        // pegawai_kpkt, admin — semua
      }
    }

    const [
      total,
      byStatusRows,
      byTrekRows,
      byKategoriRows,
      approvedAgg,
      approvedTrek1Agg,
      approvedTrek2Agg,
    ] = await Promise.all([
      db.application.count({ where }),
      db.application.groupBy({
        by: ["statusPermohonan"],
        where,
        _count: { _all: true },
      }),
      db.application.groupBy({
        by: ["trek"],
        where,
        _count: { _all: true },
      }),
      db.application.groupBy({
        by: ["kategoriBantuan"],
        where,
        _count: { _all: true },
      }),
      db.application.aggregate({
        where: { ...where, statusPermohonan: "diluluskan" },
        _sum: { nilaiAnggaranKerja: true, nilaiGeranDipohon: true },
      }),
      db.application.aggregate({
        where: {
          ...where,
          statusPermohonan: "diluluskan",
          trek: "bantuan_perumahan",
        },
        _sum: { nilaiAnggaranKerja: true },
        _count: { _all: true },
      }),
      db.application.aggregate({
        where: {
          ...where,
          statusPermohonan: "diluluskan",
          trek: "geran_pekb",
        },
        _sum: { nilaiGeranDipohon: true },
        _count: { _all: true },
      }),
    ]);

    const byStatus: Record<string, number> = {};
    byStatusRows.forEach((r) => {
      byStatus[r.statusPermohonan] = r._count._all;
    });

    const byTrek: Record<string, number> = {};
    byTrekRows.forEach((r) => {
      byTrek[r.trek] = r._count._all;
    });

    const byKategori: Record<string, number> = {};
    byKategoriRows.forEach((r) => {
      byKategori[r.kategoriBantuan] = r._count._all;
    });

    const totalNilaiDiluluskan =
      (approvedAgg._sum.nilaiAnggaranKerja || 0) +
      (approvedAgg._sum.nilaiGeranDipohon || 0);

    return NextResponse.json({
      total,
      byStatus,
      byTrek,
      byKategori,
      totalNilaiDiluluskan,
      jumlahDiluluskan:
        (approvedTrek1Agg._count._all || 0) + (approvedTrek2Agg._count._all || 0),
      nilaiTrek1Diluluskan: approvedTrek1Agg._sum.nilaiAnggaranKerja || 0,
      nilaiTrek2Diluluskan: approvedTrek2Agg._sum.nilaiGeranDipohon || 0,
      bilTrek1Diluluskan: approvedTrek1Agg._count._all || 0,
      bilTrek2Diluluskan: approvedTrek2Agg._count._all || 0,
      role: role || (userId ? "auto" : "all"),
    });
  } catch (err) {
    console.error("[applications/stats] Error:", err);
    return NextResponse.json(
      { error: "Ralat pelayan semasa mendapatkan statistik." },
      { status: 500 }
    );
  }
}
