import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// GET /api/admin/users?role=...&search=...&page=1&limit=20
// Senarai semua pengguna dengan penapis. Termasuk relasi pbt/ngo.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const role = searchParams.get("role") || undefined;
    const search = searchParams.get("search") || undefined;
    const statusAkaun = searchParams.get("statusAkaun") || undefined;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));

    const where: Prisma.UserWhereInput = {};
    if (role) where.peranan = role;
    if (statusAkaun) where.statusAkaun = statusAkaun;
    if (search) {
      where.OR = [
        { namaPenuh: { contains: search } },
        { emel: { contains: search } },
        { noKadPengenalan: { contains: search } },
        { noTelefon: { contains: search } },
      ];
    }

    const [total, users] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        include: {
          pbt: { select: { pbtId: true, namaPbt: true, kodPbt: true, negeri: true } },
          ngo: { select: { ngoId: true, namaNgo: true, noAkreditasiPekb: true, negeriOperasi: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      data: users,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("[admin/users GET] error:", err);
    return NextResponse.json(
      { error: "Gagal mendapatkan senarai pengguna" },
      { status: 500 }
    );
  }
}

// POST /api/admin/users
// Cipta pengguna baharu (medan admin)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Validasi asas
    if (!body.namaPenuh || !body.noKadPengenalan || !body.emel) {
      return NextResponse.json(
        { error: "Nama penuh, No. KP, dan emel diperlukan" },
        { status: 400 }
      );
    }

    // Semak unik emel & no KP
    const existing = await db.user.findFirst({
      where: {
        OR: [{ emel: body.emel }, { noKadPengenalan: body.noKadPengenalan }],
      },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Emel atau No. Kad Pengenalan telah wujud" },
        { status: 409 }
      );
    }

    const user = await db.user.create({
      data: {
        namaPenuh: body.namaPenuh,
        noKadPengenalan: body.noKadPengenalan,
        peranan: body.peranan || "pegawai_pbt",
        pbtId: body.pbtId || null,
        ngoId: body.ngoId || null,
        emel: body.emel,
        noTelefon: body.noTelefon || "",
        kataLaluanHash: body.kataLaluanHash || "password123",
        statusAkaun: body.statusAkaun || "aktif",
        negeri: body.negeri || "Wilayah Persekutuan Kuala Lumpur",
        jawatan: body.jawatan || "",
      },
      include: {
        pbt: { select: { pbtId: true, namaPbt: true, kodPbt: true, negeri: true } },
        ngo: { select: { ngoId: true, namaNgo: true, noAkreditasiPekb: true, negeriOperasi: true } },
      },
    });

    // Catat audit log
    await db.auditLog.create({
      data: {
        penggunaId: body.createdBy || "system",
        tindakan: "cipta_pengguna",
        perincian: `Cipta pengguna baharu: ${user.namaPenuh} (${user.peranan})`,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    console.error("[admin/users POST] error:", err);
    return NextResponse.json(
      { error: "Gagal mencipta pengguna baharu" },
      { status: 500 }
    );
  }
}
