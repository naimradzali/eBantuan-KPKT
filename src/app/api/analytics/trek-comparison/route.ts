import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/analytics/trek-comparison
// Perbandingan data antara Trek 1 (PBT) dan Trek 2 (NGO)
export async function GET() {
  try {
    const [bp, gp] = await Promise.all([
      buildTrekComparison("bantuan_perumahan"),
      buildTrekComparison("geran_pekb"),
    ]);

    return NextResponse.json({
      bantuan_perumahan: bp,
      geran_pekb: gp,
    });
  } catch (err) {
    console.error("[analytics/trek-comparison] error:", err);
    return NextResponse.json(
      { error: "Gagal mendapatkan perbandingan trek" },
      { status: 500 }
    );
  }
}

async function buildTrekComparison(trek: "bantuan_perumahan" | "geran_pekb") {
  const [total, approved, pending, rejected, valueAgg] = await Promise.all([
    db.application.count({ where: { trek } }),
    db.application.count({
      where: { trek, statusPermohonan: "diluluskan" },
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
    db.application.count({
      where: { trek, statusPermohonan: "ditolak" },
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

  // Pengasingan negeri untuk trek ini
  const apps = await db.application.findMany({
    where: { trek, negeriPenerima: { not: "" } },
    select: {
      negeriPenerima: true,
      statusPermohonan: true,
      nilaiAnggaranKerja: true,
      nilaiGeranDipohon: true,
    },
  });
  const negeriMap = new Map<
    string,
    { total: number; approved: number; value: number }
  >();
  for (const a of apps) {
    const entry = negeriMap.get(a.negeriPenerima) ?? {
      total: 0,
      approved: 0,
      value: 0,
    };
    entry.total += 1;
    if (a.statusPermohonan === "diluluskan") {
      entry.approved += 1;
      entry.value +=
        (a.nilaiAnggaranKerja ?? 0) + (a.nilaiGeranDipohon ?? 0);
    }
    negeriMap.set(a.negeriPenerima, entry);
  }
  const byNegeri = Array.from(negeriMap.entries())
    .map(([negeri, v]) => ({ negeri, ...v }))
    .sort((a, b) => b.total - a.total);

  return { total, approved, pending, rejected, valueApproved, byNegeri };
}
