import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/notifications/read-all?userId=...
export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId diperlukan." },
        { status: 400 }
      );
    }

    const result = await db.notification.updateMany({
      where: { penggunaId: userId, dibaca: false },
      data: { dibaca: true },
    });

    return NextResponse.json({
      message: "Semua notifikasi ditandai dibaca.",
      updated: result.count,
    });
  } catch (err) {
    console.error("[notifications/read-all] Error:", err);
    return NextResponse.json(
      { error: "Ralat pelayan semasa menandai semua notifikasi." },
      { status: 500 }
    );
  }
}
