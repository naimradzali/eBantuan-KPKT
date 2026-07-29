import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// PATCH /api/admin/ngo/[id]
// Kemaskini profil NGO
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.ngoProfile.findUnique({
      where: { ngoId: id },
      select: { ngoId: true, namaNgo: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Profil NGO tidak dijumpai" },
        { status: 404 }
      );
    }

    const data: Prisma.NgoProfileUpdateInput = {};
    if (body.namaNgo !== undefined) data.namaNgo = body.namaNgo;
    if (body.noPendaftaranRos !== undefined)
      data.noPendaftaranRos = body.noPendaftaranRos;
    if (body.noAkreditasiPekb !== undefined)
      data.noAkreditasiPekb = body.noAkreditasiPekb;
    if (body.negeriOperasi !== undefined)
      data.negeriOperasi = body.negeriOperasi;
    if (body.daerahOperasi !== undefined)
      data.daerahOperasi = body.daerahOperasi;
    if (body.statusAkreditasi !== undefined)
      data.statusAkreditasi = body.statusAkreditasi;

    const updated = await db.ngoProfile.update({
      where: { ngoId: id },
      data,
    });

    await db.auditLog.create({
      data: {
        penggunaId: body.updatedBy || "system",
        tindakan: "kemaskini",
        perincian: `Kemaskini profil NGO: ${updated.namaNgo} (${updated.noAkreditasiPekb})`,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[admin/ngo PATCH] error:", err);
    return NextResponse.json(
      { error: "Gagal mengemaskini profil NGO" },
      { status: 500 }
    );
  }
}
