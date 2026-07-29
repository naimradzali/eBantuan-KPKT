import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/documents/[id]
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();

    const existing = await db.document.findUnique({
      where: { documentId: id },
      select: { documentId: true, applicationId: true, namaFail: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Dokumen tidak dijumpai." },
        { status: 404 }
      );
    }

    const {
      jenisDokumen,
      namaFail,
      saizFail,
      jenisMime,
      statusPengesahanAi,
      dataEkstrakAi,
      catatanAi,
    } = body;

    const data: Prisma.DocumentUpdateInput = {};
    if (jenisDokumen !== undefined) data.jenisDokumen = jenisDokumen;
    if (namaFail !== undefined) data.namaFail = namaFail;
    if (saizFail !== undefined) data.saizFail = saizFail;
    if (jenisMime !== undefined) data.jenisMime = jenisMime;
    if (statusPengesahanAi !== undefined)
      data.statusPengesahanAi = statusPengesahanAi;
    if (dataEkstrakAi !== undefined) data.dataEkstrakAi = dataEkstrakAi;
    if (catatanAi !== undefined) data.catatanAi = catatanAi;

    const updated = await db.document.update({
      where: { documentId: id },
      data,
    });

    return NextResponse.json({ document: updated });
  } catch (err) {
    console.error("[documents/patch] Error:", err);
    return NextResponse.json(
      { error: "Ralat pelayan semasa mengemaskini dokumen." },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id]
export async function DELETE(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;

    const existing = await db.document.findUnique({
      where: { documentId: id },
      select: { documentId: true, applicationId: true, namaFail: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Dokumen tidak dijumpai." },
        { status: 404 }
      );
    }

    await db.document.delete({
      where: { documentId: id },
    });

    // Log audit (jika ada applicationId)
    if (existing.applicationId) {
      const app = await db.application.findUnique({
        where: { applicationId: existing.applicationId },
        select: { disediakanOlehPenggunaId: true },
      });
      if (app) {
        await db.auditLog.create({
          data: {
            applicationId: existing.applicationId,
            penggunaId: app.disediakanOlehPenggunaId,
            tindakan: "kemaskini",
            perincian: `Dokumen '${existing.namaFail}' dipadam.`,
          },
        });
      }
    }

    return NextResponse.json({ message: "Dokumen berjaya dipadam." });
  } catch (err) {
    console.error("[documents/delete] Error:", err);
    return NextResponse.json(
      { error: "Ralat pelayan semasa memadam dokumen." },
      { status: 500 }
    );
  }
}
