import { NextRequest, NextResponse } from "next/server";

// POST /api/auth/verify-otp
// Mock endpoint — demo OTP ialah "123456"
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { emel, otp } = body as { emel?: string; otp?: string };

    if (!emel || !otp) {
      return NextResponse.json(
        { error: "Emel dan OTP diperlukan." },
        { status: 400 }
      );
    }

    if (otp === "123456") {
      return NextResponse.json({
        verified: true,
        message: "Pengesahan OTP berjaya.",
      });
    }

    return NextResponse.json(
      { verified: false, error: "OTP tidak sah. Sila cuba lagi." },
      { status: 400 }
    );
  } catch (err) {
    console.error("[auth/verify-otp] Error:", err);
    return NextResponse.json(
      { error: "Ralat pelayan semasa pengesahan OTP." },
      { status: 500 }
    );
  }
}
