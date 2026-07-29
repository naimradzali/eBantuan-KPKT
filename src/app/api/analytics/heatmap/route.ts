import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/analytics/heatmap
// Data heatmap peringkat negeri untuk pemetaan Malaysia
// Returns: [{ negeri, total, approved, pending, valueApproved }]
export async function GET() {
  try {
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
      { total: number; approved: number; pending: number; valueApproved: number }
    >();

    for (const a of apps) {
      const entry =
        negeriMap.get(a.negeriPenerima) ?? {
          total: 0,
          approved: 0,
          pending: 0,
          valueApproved: 0,
        };
      entry.total += 1;
      if (a.statusPermohonan === "diluluskan") {
        entry.approved += 1;
        entry.valueApproved +=
          (a.nilaiAnggaranKerja ?? 0) + (a.nilaiGeranDipohon ?? 0);
      } else if (
        [
          "dihantar",
          "semakan_pbt_ngo",
          "semakan_daerah",
          "semakan_negeri",
        ].includes(a.statusPermohonan)
      ) {
        entry.pending += 1;
      }
      negeriMap.set(a.negeriPenerima, entry);
    }

    const result = Array.from(negeriMap.entries())
      .map(([negeri, v]) => ({ negeri, ...v }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json(result);
  } catch (err) {
    console.error("[analytics/heatmap] error:", err);
    return NextResponse.json(
      { error: "Gagal mendapatkan data heatmap negeri" },
      { status: 500 }
    );
  }
}
