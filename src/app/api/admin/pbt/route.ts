import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// GET /api/admin/pbt?search=...&page=1&limit=20
// Senarai profil PBT
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const negeri = searchParams.get("negeri") || undefined;
    const statusAkaunPbt = searchParams.get("statusAkaunPbt") || undefined;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));

    const where: Prisma.PbtProfileWhereInput = {};
    if (statusAkaunPbt) where.statusAkaunPbt = statusAkaunPbt;
    if (negeri) where.negeri = negeri;
    if (search) {
      where.OR = [
        { namaPbt: { contains: search } },
        { kodPbt: { contains: search } },
        { daerah: { contains: search } },
      ];
    }

    const [total, pbts] = await Promise.all([
      db.pbtProfile.count({ where }),
      db.pbtProfile.findMany({
        where,
        include: {
          _count: {
            select: {
              users: true,
              applications: true,
            },
          },
        },
        orderBy: { namaPbt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      data: pbts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[admin/pbt GET] error:", err);
    return NextResponse.json(
      { error: "Gagal mendapatkan senarai PBT" },
      { status: 500 }
    );
  }
}

// POST /api/admin/pbt
// Cipta profil PBT baharu
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.namaPbt || !body.kodPbt) {
      return NextResponse.json(
        { error: "Nama PBT dan Kod PBT diperlukan" },
        { status: 400 }
      );
    }

    // Semak unik kodPbt
    const existing = await db.pbtProfile.findUnique({
      where: { kodPbt: body.kodPbt },
      select: { pbtId: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Kod PBT telah wujud" },
        { status: 409 }
      );
    }

    const pbt = await db.pbtProfile.create({
      data: {
        namaPbt: body.namaPbt,
        kodPbt: body.kodPbt,
        negeri: body.negeri || "",
        daerah: body.daerah || "",
        kategoriPbt: body.kategoriPbt || "majlis_perbandaran",
        statusAkaunPbt: body.statusAkaunPbt || "aktif",
      },
    });

    await db.auditLog.create({
      data: {
        penggunaId: body.createdBy || "system",
        tindakan: "cipta_pengguna",
        perincian: `Cipta profil PBT baharu: ${pbt.namaPbt} (${pbt.kodPbt})`,
      },
    });

    return NextResponse.json(pbt, { status: 201 });
  } catch (err) {
    console.error("[admin/pbt POST] error:", err);
    return NextResponse.json(
      { error: "Gagal mencipta profil PBT" },
      { status: 500 }
    );
  }
}
