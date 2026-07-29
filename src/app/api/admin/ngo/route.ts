import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// GET /api/admin/ngo?search=...&page=1&limit=20
// Senarai profil NGO
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const negeriOperasi = searchParams.get("negeriOperasi") || undefined;
    const statusAkreditasi =
      searchParams.get("statusAkreditasi") || undefined;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));

    const where: Prisma.NgoProfileWhereInput = {};
    if (statusAkreditasi) where.statusAkreditasi = statusAkreditasi;
    if (negeriOperasi) where.negeriOperasi = negeriOperasi;
    if (search) {
      where.OR = [
        { namaNgo: { contains: search } },
        { noPendaftaranRos: { contains: search } },
        { noAkreditasiPekb: { contains: search } },
        { daerahOperasi: { contains: search } },
      ];
    }

    const [total, ngos] = await Promise.all([
      db.ngoProfile.count({ where }),
      db.ngoProfile.findMany({
        where,
        include: {
          _count: {
            select: {
              users: true,
              applications: true,
            },
          },
        },
        orderBy: { namaNgo: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      data: ngos,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[admin/ngo GET] error:", err);
    return NextResponse.json(
      { error: "Gagal mendapatkan senarai NGO" },
      { status: 500 }
    );
  }
}

// POST /api/admin/ngo
// Cipta profil NGO baharu
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.namaNgo || !body.noPendaftaranRos || !body.noAkreditasiPekb) {
      return NextResponse.json(
        {
          error:
            "Nama NGO, No. Pendaftaran ROS, dan No. Akreditasi PEKB diperlukan",
        },
        { status: 400 }
      );
    }

    // Semak unik noPendaftaranRos & noAkreditasiPekb
    const existing = await db.ngoProfile.findFirst({
      where: {
        OR: [
          { noPendaftaranRos: body.noPendaftaranRos },
          { noAkreditasiPekb: body.noAkreditasiPekb },
        ],
      },
      select: { ngoId: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "No. Pendaftaran ROS atau No. Akreditasi PEKB telah wujud" },
        { status: 409 }
      );
    }

    const ngo = await db.ngoProfile.create({
      data: {
        namaNgo: body.namaNgo,
        noPendaftaranRos: body.noPendaftaranRos,
        noAkreditasiPekb: body.noAkreditasiPekb,
        negeriOperasi: body.negeriOperasi || "",
        daerahOperasi: body.daerahOperasi || "",
        statusAkreditasi: body.statusAkreditasi || "aktif",
      },
    });

    await db.auditLog.create({
      data: {
        penggunaId: body.createdBy || "system",
        tindakan: "cipta_pengguna",
        perincian: `Cipta profil NGO baharu: ${ngo.namaNgo} (${ngo.noAkreditasiPekb})`,
      },
    });

    return NextResponse.json(ngo, { status: 201 });
  } catch (err) {
    console.error("[admin/ngo POST] error:", err);
    return NextResponse.json(
      { error: "Gagal mencipta profil NGO" },
      { status: 500 }
    );
  }
}
