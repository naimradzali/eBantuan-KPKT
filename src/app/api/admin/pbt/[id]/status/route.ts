import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// PATCH /api/admin/pbt/[id]/status
// Kemaskini status akaun PBT (aktif | dalam_semakan | tidak_aktif)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const validStatuses = ["aktif", "dalam_semakan", "tidak_aktif"];
    if (!validStatuses.includes(body.statusAkaunPbt)) {
      return NextResponse.json(
        {
          error: `statusAkaunPbt mesti salah satu daripada: ${validStatuses.join(
            ", "
          )}`,
        },
        { status: 400 }
      );
    }

    const existing = await db.pbtProfile.findUnique({
      where: { pbtId: id },
      select: { pbtId: true, namaPbt: true, kodPbt: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Profil PBT tidak dijumpai" },
        { status: 404 }
      );
    }

    const updated = await db.pbtProfile.update({
      where: { pbtId: id },
      data: { statusAkaunPbt: body.statusAkaunPbt },
      select: {
        pbtId: true,
        namaPbt: true,
        kodPbt: true,
        statusAkaunPbt: true,
      },
    });

    await db.auditLog.create({
      data: {
        penggunaId: body.updatedBy || "system",
        tindakan: "kemaskini",
        perincian: `Kemaskini status PBT: ${existing.namaPbt} (${existing.kodPbt}) -> ${body.statusAkaunPbt}`,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[admin/pbt status PATCH] error:", err);
    return NextResponse.json(
      { error: "Gagal mengemaskini status PBT" },
      { status: 500 }
    );
  }
}
