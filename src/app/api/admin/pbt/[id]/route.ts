import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// PATCH /api/admin/pbt/[id]
// Kemaskini profil PBT
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.pbtProfile.findUnique({
      where: { pbtId: id },
      select: { pbtId: true, namaPbt: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Profil PBT tidak dijumpai" },
        { status: 404 }
      );
    }

    const data: Prisma.PbtProfileUpdateInput = {};
    if (body.namaPbt !== undefined) data.namaPbt = body.namaPbt;
    if (body.kodPbt !== undefined) data.kodPbt = body.kodPbt;
    if (body.negeri !== undefined) data.negeri = body.negeri;
    if (body.daerah !== undefined) data.daerah = body.daerah;
    if (body.kategoriPbt !== undefined) data.kategoriPbt = body.kategoriPbt;
    if (body.statusAkaunPbt !== undefined)
      data.statusAkaunPbt = body.statusAkaunPbt;

    const updated = await db.pbtProfile.update({
      where: { pbtId: id },
      data,
    });

    await db.auditLog.create({
      data: {
        penggunaId: body.updatedBy || "system",
        tindakan: "kemaskini",
        perincian: `Kemaskini profil PBT: ${updated.namaPbt} (${updated.kodPbt})`,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[admin/pbt PATCH] error:", err);
    return NextResponse.json(
      { error: "Gagal mengemaskini profil PBT" },
      { status: 500 }
    );
  }
}
