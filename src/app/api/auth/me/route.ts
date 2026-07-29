import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/auth/me?userId=...
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

    const user = await db.user.findUnique({
      where: { id: userId },
      include: { pbt: true, ngo: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Pengguna tidak dijumpai." },
        { status: 404 }
      );
    }

    return NextResponse.json({ user });
  } catch (err) {
    console.error("[auth/me] Error:", err);
    return NextResponse.json(
      { error: "Ralat pelayan." },
      { status: 500 }
    );
  }
}
