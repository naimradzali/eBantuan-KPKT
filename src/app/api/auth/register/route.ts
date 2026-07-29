import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface RegisterBody {
  namaPenuh?: string;
  noKadPengenalan?: string;
  peranan?: string;
  emel?: string;
  noTelefon?: string;
  kataLaluan?: string;
  pbtKod?: string;
  ngoAkreditasi?: string;
}

// POST /api/auth/register
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as RegisterBody;
    const {
      namaPenuh,
      noKadPengenalan,
      peranan,
      emel,
      noTelefon,
      kataLaluan,
      pbtKod,
      ngoAkreditasi,
    } = body;

    // Validasi medan wajib
    if (
      !namaPenuh ||
      !noKadPengenalan ||
      !peranan ||
      !emel ||
      !noTelefon ||
      !kataLaluan
    ) {
      return NextResponse.json(
        {
          error:
            "Medan wajib: namaPenuh, noKadPengenalan, peranan, emel, noTelefon, kataLaluan.",
        },
        { status: 400 }
      );
    }

    // Semak duplikasi emel / IC
    const existing = await db.user.findFirst({
      where: {
        OR: [{ emel }, { noKadPengenalan }],
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Emel atau No. Kad Pengenalan telah berdaftar." },
        { status: 409 }
      );
    }

    let pbtId: string | null = null;
    let ngoId: string | null = null;

    // Untuk peranan PBT, sahkan pbtKod
    if (peranan === "pegawai_pbt" || peranan === "penilai_pbt") {
      if (!pbtKod) {
        return NextResponse.json(
          { error: "pbtKod diperlukan untuk peranan PBT." },
          { status: 400 }
        );
      }
      const pbt = await db.pbtProfile.findUnique({
        where: { kodPbt: pbtKod },
      });
      if (!pbt) {
        return NextResponse.json(
          { error: `Kod PBT '${pbtKod}' tidak sah.` },
          { status: 404 }
        );
      }
      pbtId = pbt.pbtId;
    }

    // Untuk peranan NGO, sahkan ngoAkreditasi
    if (peranan === "wakil_ngo" || peranan === "penilai_ngo") {
      if (!ngoAkreditasi) {
        return NextResponse.json(
          { error: "ngoAkreditasi diperlukan untuk peranan NGO." },
          { status: 400 }
        );
      }
      const ngo = await db.ngoProfile.findUnique({
        where: { noAkreditasiPekb: ngoAkreditasi },
      });
      if (!ngo) {
        return NextResponse.json(
          { error: `No. akreditasi PEKB '${ngoAkreditasi}' tidak sah.` },
          { status: 404 }
        );
      }
      ngoId = ngo.ngoId;
    }

    const newUser = await db.user.create({
      data: {
        namaPenuh,
        noKadPengenalan,
        peranan,
        emel,
        noTelefon,
        kataLaluanHash: kataLaluan,
        pbtId,
        ngoId,
        statusAkaun: "aktif",
      },
      include: { pbt: true, ngo: true },
    });

    // Log audit cipta_pengguna
    await db.auditLog.create({
      data: {
        penggunaId: newUser.id,
        tindakan: "cipta_pengguna",
        perincian: `Pengguna baharu didaftarkan: ${newUser.namaPenuh} (${newUser.peranan})`,
      },
    });

    return NextResponse.json(
      { user: newUser, message: "Pendaftaran berjaya." },
      { status: 201 }
    );
  } catch (err) {
    console.error("[auth/register] Error:", err);
    return NextResponse.json(
      { error: "Ralat pelayan semasa pendaftaran." },
      { status: 500 }
    );
  }
}
