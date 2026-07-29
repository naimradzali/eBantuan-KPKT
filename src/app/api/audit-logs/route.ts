import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/audit-logs?applicationId=...&penggunaId=...&page=1&limit=50
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const applicationId = searchParams.get("applicationId") || undefined;
    const penggunaId = searchParams.get("penggunaId") || undefined;
    const tindakan = searchParams.get("tindakan") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(
      1,
      Math.min(200, parseInt(searchParams.get("limit") || "50", 10))
    );

    const where: Record<string, unknown> = {};
    if (applicationId) where.applicationId = applicationId;
    if (penggunaId) where.penggunaId = penggunaId;
    if (tindakan) where.tindakan = tindakan;

    const [total, data] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
        include: {
          pengguna: {
            select: {
              id: true,
              namaPenuh: true,
              peranan: true,
              emel: true,
            },
          },
          application: {
            select: {
              applicationId: true,
              noRujukan: true,
              trek: true,
            },
          },
        },
        orderBy: { capMasa: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      limit,
    });
  } catch (err) {
    console.error("[audit-logs/list] Error:", err);
    return NextResponse.json(
      { error: "Ralat pelayan semasa mendapatkan log audit." },
      { status: 500 }
    );
  }
}
