import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// PATCH /api/admin/users/[id]
// Kemaskini pengguna (peranan, statusAkaun, dll)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const existing = await db.user.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Pengguna tidak dijumpai" },
        { status: 404 }
      );
    }

    // Bina data kemaskini (hanya medan yang dibenarkan)
    const data: Prisma.UserUpdateInput = {};
    if (body.namaPenuh !== undefined) data.namaPenuh = body.namaPenuh;
    if (body.peranan !== undefined) data.peranan = body.peranan;
    if (body.emel !== undefined) data.emel = body.emel;
    if (body.noTelefon !== undefined) data.noTelefon = body.noTelefon;
    if (body.statusAkaun !== undefined) data.statusAkaun = body.statusAkaun;
    if (body.negeri !== undefined) data.negeri = body.negeri;
    if (body.jawatan !== undefined) data.jawatan = body.jawatan;
    if (body.pbtId !== undefined) {
      data.pbt = body.pbtId
        ? { connect: { pbtId: body.pbtId } }
        : { disconnect: true };
    }
    if (body.ngoId !== undefined) {
      data.ngo = body.ngoId
        ? { connect: { ngoId: body.ngoId } }
        : { disconnect: true };
    }

    const updated = await db.user.update({
      where: { id },
      data,
      include: {
        pbt: { select: { pbtId: true, namaPbt: true, kodPbt: true, negeri: true } },
        ngo: { select: { ngoId: true, namaNgo: true, noAkreditasiPekb: true, negeriOperasi: true } },
      },
    });

    // Catat audit log
    await db.auditLog.create({
      data: {
        penggunaId: body.updatedBy || "system",
        tindakan: "kemaskini",
        perincian: `Kemaskini pengguna: ${updated.namaPenuh} (${updated.id})`,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[admin/users PATCH] error:", err);
    return NextResponse.json(
      { error: "Gagal mengemaskini pengguna" },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/users/[id]
// Soft delete — set statusAkaun="disekat"
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await db.user.findUnique({
      where: { id },
      select: { id: true, namaPenuh: true },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Pengguna tidak dijumpai" },
        { status: 404 }
      );
    }

    const updated = await db.user.update({
      where: { id },
      data: { statusAkaun: "disekat" },
      select: { id: true, namaPenuh: true, statusAkaun: true },
    });

    // Catat audit log
    await db.auditLog.create({
      data: {
        penggunaId: "system",
        tindakan: "kemaskini",
        perincian: `Sekat akaun pengguna: ${existing.namaPenuh} (${id})`,
      },
    });

    return NextResponse.json({
      message: "Akaun pengguna telah disekat",
      user: updated,
    });
  } catch (err) {
    console.error("[admin/users DELETE] error:", err);
    return NextResponse.json(
      { error: "Gagal menyekat akaun pengguna" },
      { status: 500 }
    );
  }
}
