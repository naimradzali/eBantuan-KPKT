import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/notifications/[id]/read — tanda sebagai dibaca
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;

    const existing = await db.notification.findUnique({
      where: { notifikasiId: id },
      select: { notifikasiId: true, penggunaId: true },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Notifikasi tidak dijumpai." },
        { status: 404 }
      );
    }

    const updated = await db.notification.update({
      where: { notifikasiId: id },
      data: { dibaca: true },
    });

    return NextResponse.json({ notification: updated });
  } catch (err) {
    console.error("[notifications/read] Error:", err);
    return NextResponse.json(
      { error: "Ralat pelayan semasa menandai notifikasi." },
      { status: 500 }
    );
  }
}
