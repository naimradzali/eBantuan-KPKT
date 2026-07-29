import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// GET /api/admin/audit-logs?penggunaId=...&tindakan=...&startDate=...&endDate=...&page=1&limit=50
// Senarai log audit dengan penapis. Termasuk relasi pengguna.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const penggunaId = searchParams.get("penggunaId") || undefined;
    const tindakan = searchParams.get("tindakan") || undefined;
    const applicationId = searchParams.get("applicationId") || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(
      200,
      Math.max(1, Number(searchParams.get("limit")) || 50)
    );

    const where: Prisma.AuditLogWhereInput = {};
    if (penggunaId) where.penggunaId = penggunaId;
    if (tindakan) where.tindakan = tindakan;
    if (applicationId) where.applicationId = applicationId;
    if (startDate || endDate) {
      where.capMasa = {};
      if (startDate) where.capMasa.gte = new Date(startDate);
      if (endDate) where.capMasa.lte = new Date(endDate);
    }

    const [total, logs] = await Promise.all([
      db.auditLog.count({ where }),
      db.auditLog.findMany({
        where,
        include: {
          pengguna: {
            select: {
              id: true,
              namaPenuh: true,
              emel: true,
              peranan: true,
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
      data: logs,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[admin/audit-logs GET] error:", err);
    return NextResponse.json(
      { error: "Gagal mendapatkan senarai log audit" },
      { status: 500 }
    );
  }
}
