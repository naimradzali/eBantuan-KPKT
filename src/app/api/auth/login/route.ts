import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// POST /api/auth/login
// Body: { emel, kataLaluan }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { emel, kataLaluan } = body as { emel?: string; kataLaluan?: string };

    if (!emel || !kataLaluan) {
      return NextResponse.json(
        { error: "Emel dan kata laluan diperlukan." },
        { status: 400 }
      );
    }

    const user = await db.user.findUnique({
      where: { emel },
      include: { pbt: true, ngo: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Pengguna tidak dijumpai." },
        { status: 404 }
      );
    }

    if (user.kataLaluanHash !== kataLaluan) {
      return NextResponse.json(
        { error: "Kata laluan tidak sah." },
        { status: 401 }
      );
    }

    if (user.statusAkaun !== "aktif") {
      return NextResponse.json(
        { error: `Akaun ${user.statusAkaun}. Sila hubungi pentadbir.` },
        { status: 403 }
      );
    }

    // Buat log audit log_masuk
    await db.auditLog.create({
      data: {
        penggunaId: user.id,
        tindakan: "log_masuk",
        perincian: `Log masuk berjaya untuk ${user.emel}`,
      },
    });

    // Token JWT palsu (demo sahaja)
    const token = `demo.${Buffer.from(user.id).toString("base64url")}.${Date.now()}`;

    return NextResponse.json({
      user,
      token,
      message: "Log masuk berjaya.",
    });
  } catch (err) {
    console.error("[auth/login] Error:", err);
    return NextResponse.json(
      { error: "Ralat pelayan semasa log masuk." },
      { status: 500 }
    );
  }
}
