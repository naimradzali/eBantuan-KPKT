import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/applications/[id] — dapatkan satu permohonan (lookup by applicationId)
export async function GET(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;

    const application = await db.application.findUnique({
      where: { applicationId: id },
      include: {
        pbt: true,
        ngo: true,
        disediakanOleh: {
          select: {
            id: true,
            namaPenuh: true,
            emel: true,
            noTelefon: true,
            peranan: true,
            pbt: true,
            ngo: true,
          },
        },
        documents: true,
        auditLogs: {
          include: {
            pengguna: {
              select: {
                id: true,
                namaPenuh: true,
                peranan: true,
              },
            },
          },
          orderBy: { capMasa: "desc" },
        },
      },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Permohonan tidak dijumpai." },
        { status: 404 }
      );
    }

    return NextResponse.json({ application });
  } catch (err) {
    console.error("[applications/get] Error:", err);
    return NextResponse.json(
      { error: "Ralat pelayan semasa mendapatkan permohonan." },
      { status: 500 }
    );
  }
}

// PATCH /api/applications/[id] — kemaskini permohonan
export async function PATCH(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();

    const existing = await db.application.findUnique({
      where: { applicationId: id },
      select: {
        applicationId: true,
        statusPermohonan: true,
        noRujukan: true,
        disediakanOlehPenggunaId: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Permohonan tidak dijumpai." },
        { status: 404 }
      );
    }

    const {
      // medan yang dibenarkan untuk dikemaskini
      namaPenerima,
      noKpPenerima,
      alamatPenerima,
      negeriPenerima,
      daerahPenerima,
      telefonPenerima,
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
      notaPenilai,
      statusPermohonan,
      peringkatSemasa,
      skorKelayakanAi,
      statusPertindihanAi,
      notaAi,
      cadanganAi,
      sebabCadanganAi,
      penerimaId,
      pbtId,
      ngoId,
      tarikhPermohonan,
      userId,
    } = body;

    const data: Prisma.ApplicationUpdateInput = {};
    if (namaPenerima !== undefined) data.namaPenerima = namaPenerima;
    if (noKpPenerima !== undefined) data.noKpPenerima = noKpPenerima;
    if (alamatPenerima !== undefined) data.alamatPenerima = alamatPenerima;
    if (negeriPenerima !== undefined) data.negeriPenerima = negeriPenerima;
    if (daerahPenerima !== undefined) data.daerahPenerima = daerahPenerima;
    if (telefonPenerima !== undefined) data.telefonPenerima = telefonPenerima;
    if (pendapatanIsiRumah !== undefined)
      data.pendapatanIsiRumah = pendapatanIsiRumah;
    if (bilanganTanggungan !== undefined)
      data.bilanganTanggungan = bilanganTanggungan;
    if (statusOku !== undefined) data.statusOku = statusOku;
    if (jenisOku !== undefined) data.jenisOku = jenisOku;
    if (statusPemilikanRumah !== undefined)
      data.statusPemilikanRumah = statusPemilikanRumah;
    if (jenisRumah !== undefined) data.jenisRumah = jenisRumah;
    if (kategoriBantuan !== undefined) data.kategoriBantuan = kategoriBantuan;
    if (zonMukim !== undefined) data.zonMukim = zonMukim;
    if (noRujukanPemeriksaan !== undefined)
      data.noRujukanPemeriksaan = noRujukanPemeriksaan;
    if (nilaiAnggaranKerja !== undefined)
      data.nilaiAnggaranKerja = nilaiAnggaranKerja;
    if (kawasanOperasi !== undefined) data.kawasanOperasi = kawasanOperasi;
    if (cadanganPelanGuna !== undefined)
      data.cadanganPelanGuna = cadanganPelanGuna;
    if (nilaiGeranDipohon !== undefined)
      data.nilaiGeranDipohon = nilaiGeranDipohon;
    if (namaPerniagaan !== undefined) data.namaPerniagaan = namaPerniagaan;
    if (jenisPerniagaan !== undefined) data.jenisPerniagaan = jenisPerniagaan;
    if (notaPenilai !== undefined) data.notaPenilai = notaPenilai;
    if (skorKelayakanAi !== undefined)
      data.skorKelayakanAi = skorKelayakanAi;
    if (statusPertindihanAi !== undefined)
      data.statusPertindihanAi = statusPertindihanAi;
    if (notaAi !== undefined) data.notaAi = notaAi;
    if (cadanganAi !== undefined) data.cadanganAi = cadanganAi;
    if (sebabCadanganAi !== undefined)
      data.sebabCadanganAi = sebabCadanganAi;
    if (penerimaId !== undefined) data.penerimaId = penerimaId;
    if (tarikhPermohonan !== undefined)
      data.tarikhPermohonan = tarikhPermohonan
        ? new Date(tarikhPermohonan)
        : null;

    // Hubungan pbt/ngo
    if (pbtId !== undefined) {
      data.pbt = pbtId ? { connect: { pbtId } } : { disconnect: true };
    }
    if (ngoId !== undefined) {
      data.ngo = ngoId ? { connect: { ngoId } } : { disconnect: true };
    }

    // Jejak perubahan status untuk log audit
    let statusChanged = false;
    if (
      statusPermohonan !== undefined &&
      statusPermohonan !== existing.statusPermohonan
    ) {
      data.statusPermohonan = statusPermohonan;
      statusChanged = true;
      if (statusPermohonan === "diluluskan") {
        data.tarikhDiluluskan = new Date();
      }
    }
    if (peringkatSemasa !== undefined) {
      data.peringkatSemasa = peringkatSemasa;
    }

    const updated = await db.application.update({
      where: { applicationId: id },
      data,
      include: { pbt: true, ngo: true, disediakanOleh: true },
    });

    // Cipta log audit kemaskini
    const auditUserId = userId || existing.disediakanOlehPenggunaId;
    await db.auditLog.create({
      data: {
        applicationId: id,
        penggunaId: auditUserId,
        tindakan: statusChanged ? "kemaskini_status" : "kemaskini",
        perincian: statusChanged
          ? `Status kemaskini dari '${existing.statusPermohonan}' ke '${statusPermohonan}' untuk ${existing.noRujukan}.`
          : `Kemaskini maklumat permohonan ${existing.noRujukan}.`,
      },
    });

    return NextResponse.json({ application: updated });
  } catch (err) {
    console.error("[applications/patch] Error:", err);
    return NextResponse.json(
      { error: "Ralat pelayan semasa mengemaskini permohonan." },
      { status: 500 }
    );
  }
}
