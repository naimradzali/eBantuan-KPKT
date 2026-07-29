import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

// GET /api/applications
// Query params: userId, role, status, trek, search, page (default 1), limit (default 20)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");
    const role = searchParams.get("role") || undefined;
    const status = searchParams.get("status") || undefined;
    const trek = searchParams.get("trek") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.max(
      1,
      Math.min(100, parseInt(searchParams.get("limit") || "20", 10))
    );

    // Bina penapis where berdasarkan peranan
    const where: Prisma.ApplicationWhereInput = {};

    if (status) where.statusPermohonan = status;
    if (trek) where.trek = trek;

    if (search) {
      where.OR = [
        { noRujukan: { contains: search } },
        { namaPenerima: { contains: search } },
        { noKpPenerima: { contains: search } },
      ];
    }

    // Penapis berdasarkan peranan pengguna
    if (userId) {
      const currentUser = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, peranan: true, pbtId: true, ngoId: true },
      });

      if (currentUser) {
        const r = currentUser.peranan;
        if (r === "pegawai_pbt" || r === "penilai_pbt") {
          where.pbtId = currentUser.pbtId;
        } else if (r === "wakil_ngo" || r === "penilai_ngo") {
          where.ngoId = currentUser.ngoId;
        } else if (
          r === "pegawai_kpkt" ||
          r === "pegawai_kpkt_pusat" ||
          r === "admin"
        ) {
          // Lihat semua permohonan
        } else {
          // Peranan lain — hanya papar permohonan yang disediakan olehnya
          where.disediakanOlehPenggunaId = userId;
        }
      }
    }

    const [total, data] = await Promise.all([
      db.application.count({ where }),
      db.application.findMany({
        where,
        include: {
          pbt: true,
          ngo: true,
          disediakanOleh: {
            select: {
              id: true,
              namaPenuh: true,
              emel: true,
              peranan: true,
            },
          },
          _count: { select: { documents: true } },
        },
        orderBy: { tarikhDicipta: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return NextResponse.json({
      data,
      total,
      page,
      limit,
    });
  } catch (err) {
    console.error("[applications/list] Error:", err);
    return NextResponse.json(
      { error: "Ralat pelayan semasa mendapatkan senarai permohonan." },
      { status: 500 }
    );
  }
}

// POST /api/applications — cipta permohonan baharu
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      trek = "bantuan_perumahan",
      entitiPemohonJenis = "pbt",
      pbtId,
      ngoId,
      disediakanOlehPenggunaId,
      penerimaId,
      namaPenerima,
      noKpPenerima,
      alamatPenerima,
      negeriPenerima,
      daerahPenerima,
      telefonPenerima,
      pendapatanIsiRumah = 0,
      bilanganTanggungan = 0,
      statusOku = false,
      jenisOku = "",
      statusPemilikanRumah = "sewa",
      jenisRumah = "papan",
      kategoriBantuan = "baik_pulih_rumah",
      zonMukim = "",
      noRujukanPemeriksaan = "",
      nilaiAnggaranKerja = 0,
      kawasanOperasi = "",
      cadanganPelanGuna = "",
      nilaiGeranDipohon = 0,
      namaPerniagaan = "",
      jenisPerniagaan = "",
      submit = false,
    } = body;

    if (!disediakanOlehPenggunaId) {
      return NextResponse.json(
        { error: "disediakanOlehPenggunaId diperlukan." },
        { status: 400 }
      );
    }
    if (!namaPenerima || !noKpPenerima) {
      return NextResponse.json(
        { error: "namaPenerima dan noKpPenerima diperlukan." },
        { status: 400 }
      );
    }

    // Sahkan pengguna wujud
    const submitter = await db.user.findUnique({
      where: { id: disediakanOlehPenggunaId },
      select: { id: true, peranan: true, pbtId: true, ngoId: true },
    });
    if (!submitter) {
      return NextResponse.json(
        { error: "Pengguna penyedia tidak dijumpai." },
        { status: 404 }
      );
    }

    // Jana noRujukan: BP-2026-XXXXXX / GP-2026-XXXXXX
    const prefix = trek === "geran_pekb" ? "GP" : "BP";
    const tahun = new Date().getFullYear();
    const countSameTrek = await db.application.count({
      where: { trek },
    });
    const seq = String(countSameTrek + 1).padStart(6, "0");
    const noRujukan = `${prefix}-${tahun}-${seq}`;

    // Tentukan status awal
    const isSubmit = Boolean(submit);
    const statusPermohonan = isSubmit ? "dihantar" : "draf";
    const peringkatSemasa = isSubmit ? "pbt" : "draf";
    const tarikhPermohonan = isSubmit ? new Date() : null;

    // Auto-isi pbtId / ngoId berdasarkan pengguna jika tidak diberikan
    const finalPbtId =
      pbtId ||
      (submitter.peranan === "pegawai_pbt" || submitter.peranan === "penilai_pbt"
        ? submitter.pbtId
        : null);
    const finalNgoId =
      ngoId ||
      (submitter.peranan === "wakil_ngo" || submitter.peranan === "penilai_ngo"
        ? submitter.ngoId
        : null);

    const created = await db.application.create({
      data: {
        noRujukan,
        trek,
        entitiPemohonJenis,
        pbtId: finalPbtId,
        ngoId: finalNgoId,
        disediakanOlehPenggunaId,
        penerimaId: penerimaId || null,
        namaPenerima,
        noKpPenerima,
        alamatPenerima: alamatPenerima || "",
        negeriPenerima: negeriPenerima || "",
        daerahPenerima: daerahPenerima || "",
        telefonPenerima: telefonPenerima || "",
        pendapatanIsiRumah,
        bilanganTanggungan,
        statusOku,
        jenisOku,
        statusPemilikanRumah,
        jenisRumah,
        kategoriBantuan,
        zonMukim,
        noRujukanPemeriksaan,
        nilaiAnggaranKerja,
        kawasanOperasi,
        cadanganPelanGuna,
        nilaiGeranDipohon,
        namaPerniagaan,
        jenisPerniagaan,
        statusPermohonan,
        peringkatSemasa,
        tarikhPermohonan,
      },
      include: { pbt: true, ngo: true, disediakanOleh: true },
    });

    // Log audit
    await db.auditLog.create({
      data: {
        applicationId: created.applicationId,
        penggunaId: disediakanOlehPenggunaId,
        tindakan: isSubmit ? "hantar_permohonan" : "cipta_draf",
        perincian: isSubmit
          ? `Permohonan ${noRujukan} dihantar.`
          : `Draf permohonan ${noRujukan} dicipta.`,
      },
    });

    return NextResponse.json(
      { application: created, message: "Permohonan berjaya dicipta." },
      { status: 201 }
    );
  } catch (err) {
    console.error("[applications/create] Error:", err);
    return NextResponse.json(
      { error: "Ralat pelayan semasa mencipta permohonan." },
      { status: 500 }
    );
  }
}
