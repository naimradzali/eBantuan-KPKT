import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/analytics/trend?months=6
// Data tren bulanan untuk N bulan terakhir
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const monthsParam = searchParams.get("months");
    const months = Math.max(
      1,
      Math.min(24, Number(monthsParam) || 6)
    );

    // Tarikh mula (bulan pertama dalam julat)
    const now = new Date();
    const startMonth = new Date(
      now.getFullYear(),
      now.getMonth() - (months - 1),
      1,
      0,
      0,
      0,
      0
    );

    const apps = await db.application.findMany({
      where: {
        tarikhDicipta: { gte: startMonth },
      },
      select: {
        tarikhDicipta: true,
        trek: true,
        statusPermohonan: true,
      },
    });

    // Bina senarai bulan terbalik (terlama -> terbaru)
    const buckets: Map<
      string,
      { bantuan_perumahan: number; geran_pekb: number; approved: number }
    > = new Map();

    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      buckets.set(key, {
        bantuan_perumahan: 0,
        geran_pekb: 0,
        approved: 0,
      });
    }

    for (const a of apps) {
      const d = new Date(a.tarikhDicipta);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
        2,
        "0"
      )}`;
      const bucket = buckets.get(key);
      if (!bucket) continue;
      if (a.trek === "bantuan_perumahan") bucket.bantuan_perumahan += 1;
      if (a.trek === "geran_pekb") bucket.geran_pekb += 1;
      if (a.statusPermohonan === "diluluskan") bucket.approved += 1;
    }

    const result = Array.from(buckets.entries()).map(([month, v]) => ({
      month,
      ...v,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error("[analytics/trend] error:", err);
    return NextResponse.json(
      { error: "Gagal mendapatkan data tren bulanan" },
      { status: 500 }
    );
  }
}
