import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/admin/users/[id]/reset-password
// Set semula kata laluan kepada lalai ("password123")
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.user.findUnique({
      where: { id },
      select: { id: true, namaPenuh: true, emel: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Pengguna tidak dijumpai" },
        { status: 404 }
      );
    }

    const DEFAULT_PASSWORD = "password123";
    await db.user.update({
      where: { id },
      data: { kataLaluanHash: DEFAULT_PASSWORD },
    });

    // Catat audit log
    await db.auditLog.create({
      data: {
        penggunaId: "system",
        tindakan: "kemaskini",
        perincian: `Set semula kata laluan pengguna: ${existing.namaPenuh} (${existing.emel})`,
      },
    });

    return NextResponse.json({
      message: `Kata laluan telah direset kepada "${DEFAULT_PASSWORD}"`,
      userId: id,
    });
  } catch (err) {
    console.error("[admin/users reset-password] error:", err);
    return NextResponse.json(
      { error: "Gagal reset kata laluan pengguna" },
      { status: 500 }
    );
  }
}
