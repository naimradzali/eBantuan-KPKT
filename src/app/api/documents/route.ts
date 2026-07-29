import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/documents?applicationId=...
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const applicationId = searchParams.get("applicationId");

    if (!applicationId) {
      return NextResponse.json(
        { error: "applicationId diperlukan." },
        { status: 400 }
      );
    }

    const documents = await db.document.findMany({
      where: { applicationId },
      orderBy: { tarikhMuatNaik: "desc" },
    });

    return NextResponse.json({ data: documents, total: documents.length });
  } catch (err) {
    console.error("[documents/list] Error:", err);
    return NextResponse.json(
      { error: "Ralat pelayan semasa mendapatkan dokumen." },
      { status: 500 }
    );
  }
}

// POST /api/documents
// Body: { applicationId, jenisDokumen, namaFail, saizFail, jenisMime }
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { applicationId, jenisDokumen, namaFail, saizFail, jenisMime } =
      body as {
        applicationId?: string;
        jenisDokumen?: string;
        namaFail?: string;
        saizFail?: number;
        jenisMime?: string;
      };

    if (!applicationId || !namaFail) {
      return NextResponse.json(
        { error: "applicationId dan namaFail diperlukan." },
        { status: 400 }
      );
    }

    const application = await db.application.findUnique({
      where: { applicationId },
      select: { applicationId: true, disediakanOlehPenggunaId: true },
    });
    if (!application) {
      return NextResponse.json(
        { error: "Permohonan tidak dijumpai." },
        { status: 404 }
      );
    }

    const document = await db.document.create({
      data: {
        applicationId,
        jenisDokumen: jenisDokumen || "lain_lain",
        namaFail,
        saizFail: saizFail || 0,
        jenisMime: jenisMime || "application/pdf",
        statusPengesahanAi: "belum_disemak",
      },
    });

    // Log audit muat_naik_dokumen
    await db.auditLog.create({
      data: {
        applicationId,
        penggunaId: application.disediakanOlehPenggunaId,
        tindakan: "muat_naik_dokumen",
        perincian: `Dokumen '${namaFail}' (${jenisDokumen || "lain_lain"}) dimuat naik.`,
      },
    });

    return NextResponse.json(
      { document, message: "Dokumen berjaya dimuat naik." },
      { status: 201 }
    );
  } catch (err) {
    console.error("[documents/create] Error:", err);
    return NextResponse.json(
      { error: "Ralat pelayan semasa memuat naik dokumen." },
      { status: 500 }
    );
  }
}
