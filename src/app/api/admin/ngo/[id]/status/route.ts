import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH /api/admin/ngo/[id]/status
// Kemaskini status akreditasi NGO (aktif | dalam_semakan | tamat_tempoh)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const validStatuses = ["aktif", "dalam_semakan", "tamat_tempoh"];
    if (!validStatuses.includes(body.statusAkreditasi)) {
      return NextResponse.json(
        {
          error: `statusAkreditasi mesti salah satu daripada: ${validStatuses.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    const existing = await db.ngoProfile.findUnique({
      where: { ngoId: id },
      select: { ngoId: true, namaNgo: true, noAkreditasiPekb: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Profil NGO tidak dijumpai" },
        { status: 404 }
      );
    }

    const updated = await db.ngoProfile.update({
      where: { ngoId: id },
      data: { statusAkreditasi: body.statusAkreditasi },
      select: {
        ngoId: true,
        namaNgo: true,
        noAkreditasiPekb: true,
        statusAkreditasi: true,
      },
    });

    await db.auditLog.create({
      data: {
        penggunaId: body.updatedBy || "system",
        tindakan: "kemaskini",
        perincian: `Kemaskini status akreditasi NGO: ${existing.namaNgo} (${existing.noAkreditasiPekb}) -> ${body.statusAkreditasi}`,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[admin/ngo status PATCH] error:", err);
    return NextResponse.json(
      { error: "Gagal mengemaskini status NGO" },
      { status: 500 }
    );
  }
}
