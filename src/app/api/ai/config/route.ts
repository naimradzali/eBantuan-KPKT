// Sistem eBantuan-PEKB — AI Config (admin)
// GET    /api/ai/config  — returns the AiConfig row (id=1).
// PATCH  /api/ai/config  — updates threshold / enable-* fields on AiConfig.
//
// On GET, if the row doesn't exist yet (fresh DB), it is created with defaults.

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getOrCreateConfig() {
  try {
    const existing = await db.aiConfig.findUnique({ where: { id: 1 } });
    if (existing) return existing;
    return await db.aiConfig.create({ data: { id: 1 } });
  } catch (err) {
    console.error("[AI config] DB error:", err);
    return null;
  }
}

export async function GET() {
  const cfg = await getOrCreateConfig();
  if (!cfg) {
    return NextResponse.json(
      { error: "Konfigurasi AI tidak tersedia." },
      { status: 500 }
    );
  }
  return NextResponse.json(cfg);
}

interface PatchBody {
  ambangSkorLulus?: number;
  ambangSkorSemak?: number;
  enableAiScreening?: boolean;
  enableAiDocVerify?: boolean;
  enableAiChatbot?: boolean;
  enableAiFraud?: boolean;
  modelAi?: string;
}

export async function PATCH(req: NextRequest) {
  let body: PatchBody = {};
  try {
    body = (await req.json()) as PatchBody;
  } catch {
    return NextResponse.json(
      { error: "Body JSON tidak sah." },
      { status: 400 }
    );
  }

  const data: Partial<PatchBody> = {};
  if (typeof body.ambangSkorLulus === "number") {
    data.ambangSkorLulus = Math.max(0, Math.min(100, Math.round(body.ambangSkorLulus)));
  }
  if (typeof body.ambangSkorSemak === "number") {
    data.ambangSkorSemak = Math.max(0, Math.min(100, Math.round(body.ambangSkorSemak)));
  }
  if (typeof body.enableAiScreening === "boolean") data.enableAiScreening = body.enableAiScreening;
  if (typeof body.enableAiDocVerify === "boolean") data.enableAiDocVerify = body.enableAiDocVerify;
  if (typeof body.enableAiChatbot === "boolean") data.enableAiChatbot = body.enableAiChatbot;
  if (typeof body.enableAiFraud === "boolean") data.enableAiFraud = body.enableAiFraud;
  if (typeof body.modelAi === "string" && body.modelAi.trim()) {
    data.modelAi = body.modelAi.trim();
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "Tiada medan sah untuk dikemas kini." },
      { status: 400 }
    );
  }

  try {
    const updated = await db.aiConfig.upsert({
      where: { id: 1 },
      create: { id: 1, ...data },
      update: data,
    });
    return NextResponse.json(updated);
  } catch (err) {
    console.error("[AI config] PATCH failed:", err);
    return NextResponse.json(
      { error: "Gagal mengemas kini konfigurasi AI." },
      { status: 500 }
    );
  }
}
