import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/notifications?userId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId diperlukan." },
        { status: 400 }
      );
    }

    const notifications = await db.notification.findMany({
      where: { penggunaId: userId },
      orderBy: { tarikhDicipta: "desc" },
    });

    const belumDibaca = notifications.filter((n) => !n.dibaca).length;

    return NextResponse.json({
      data: notifications,
      total: notifications.length,
      belumDibaca,
    });
  } catch (err) {
    console.error("[notifications/list] Error:", err);
    return NextResponse.json(
      { error: "Ralat pelayan semasa mendapatkan notifikasi." },
      { status: 500 }
    );
  }
}
