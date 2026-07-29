import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Pemetaan peringkat aliran kelulusan
const PERINGKAT_NEXT: Record<string, string> = {
  pbt: "kpkt_daerah",
  kpkt_daerah: "kpkt_negeri",
  kpkt_negeri: "selesai",
  selesai: "selesai",
  draf: "pbt",
};

// POST /api/applications/[id]/action
// Body: { tindakan: "lulus"|"tolak"|"pulangkan"|"naik_peringkat", nota?, alasan?, penggunaId? }
export async function POST(req: NextRequest, ctx: RouteContext) {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const { tindakan, nota, alasan, penggunaId } = body as {
      tindakan?: string;
      nota?: string;
      alasan?: string;
      penggunaId?: string;
    };

    if (!tindakan) {
      return NextResponse.json(
        { error: "tindakan diperlukan." },
        { status: 400 }
      );
    }

    const validTindakan = ["lulus", "tolak", "pulangkan", "naik_peringkat"];
    if (!validTindakan.includes(tindakan)) {
      return NextResponse.json(
        { error: `tindakan tidak sah. Sah: ${validTindakan.join(", ")}` },
        { status: 400 }
      );
    }

    const application = await db.application.findUnique({
      where: { applicationId: id },
      include: { disediakanOleh: true },
    });

    if (!application) {
      return NextResponse.json(
        { error: "Permohonan tidak dijumpai." },
        { status: 404 }
      );
    }

    const auditUserId = penggunaId || application.disediakanOlehPenggunaId;

    // Sahkan pengguna pelaku wujud
    const pelaku = await db.user.findUnique({
      where: { id: auditUserId },
      select: { id: true, namaPenuh: true, peranan: true },
    });
    if (!pelaku) {
      return NextResponse.json(
        { error: "Pengguna pelaku tidak dijumpai." },
        { status: 404 }
      );
    }

    let newStatus = application.statusPermohonan;
    let newPeringkat = application.peringkatSemasa;
    let auditTindakan = tindakan;
    let perincian = "";
    let tajukNotifikasi = "";
    let mesejNotifikasi = "";

    if (tindakan === "lulus") {
      newStatus = "diluluskan";
      newPeringkat = "selesai";
      auditTindakan = "lulus";
      perincian = `Permohonan ${application.noRujukan} diluluskan oleh ${pelaku.namaPenuh}.${
        nota ? ` Nota: ${nota}` : ""
      }`;
      tajukNotifikasi = "Permohonan Diluluskan";
      mesejNotifikasi = `Permohonan ${application.noRujukan} telah diluluskan.`;
    } else if (tindakan === "tolak") {
      newStatus = "ditolak";
      auditTindakan = "tolak";
      perincian = `Permohonan ${application.noRujukan} ditolak oleh ${pelaku.namaPenuh}. Alasan: ${
        alasan || nota || "Tidak dinyatakan"
      }`;
      tajukNotifikasi = "Permohonan Ditolak";
      mesejNotifikasi = `Permohonan ${application.noRujukan} telah ditolak. Alasan: ${
        alasan || nota || "Tidak dinyatakan"
      }`;
    } else if (tindakan === "pulangkan") {
      newStatus = "dipulangkan";
      auditTindakan = "pulangkan";
      perincian = `Permohonan ${application.noRujukan} dipulangkan kepada pengemukaan oleh ${pelaku.namaPenuh}.${
        nota ? ` Nota: ${nota}` : ""
      }`;
      tajukNotifikasi = "Permohonan Dipulangkan";
      mesejNotifikasi = `Permohonan ${application.noRujukan} dipulangkan untuk pembetulan. ${
        nota ? `Nota: ${nota}` : ""
      }`;
    } else if (tindakan === "naik_peringkat") {
      newPeringkat = PERINGKAT_NEXT[application.peringkatSemasa] || "selesai";
      // Status berkaitan peringkat
      if (newPeringkat === "kpkt_daerah") newStatus = "semakan_daerah";
      else if (newPeringkat === "kpkt_negeri") newStatus = "semakan_negeri";
      else if (newPeringkat === "selesai") newStatus = "diluluskan";
      else newStatus = "semakan_pbt_ngo";

      auditTindakan = "naik_peringkat";
      perincian = `Permohonan ${application.noRujukan} dinaikkan ke peringkat '${newPeringkat}' oleh ${pelaku.namaPenuh}.${
        nota ? ` Nota: ${nota}` : ""
      }`;
      tajukNotifikasi = "Permohonan Dinaikkan Peringkat";
      mesejNotifikasi = `Permohonan ${application.noRujukan} kini di peringkat ${newPeringkat}.`;
    }

    // Kemaskini permohonan
    const updated = await db.application.update({
      where: { applicationId: id },
      data: {
        statusPermohonan: newStatus,
        peringkatSemasa: newPeringkat,
        notaPenilai: nota ?? application.notaPenilai,
        alasanPenolakan:
          tindakan === "tolak"
            ? alasan || nota || application.alasanPenolakan
            : application.alasanPenolakan,
        tarikhDiluluskan:
          newStatus === "diluluskan" ? new Date() : application.tarikhDiluluskan,
      },
      include: { pbt: true, ngo: true, disediakanOleh: true },
    });

    // Log audit
    await db.auditLog.create({
      data: {
        applicationId: id,
        penggunaId: auditUserId,
        tindakan: auditTindakan,
        perincian,
      },
    });

    // Notifikasi kepada pengemuka
    if (tajukNotifikasi) {
      await db.notification.create({
        data: {
          penggunaId: application.disediakanOlehPenggunaId,
          applicationId: id,
          tajuk: tajukNotifikasi,
          mesej: mesejNotifikasi,
          jenis: "status",
        },
      });
    }

    return NextResponse.json({
      application: updated,
      message: "Tindakan berjaya diproses.",
    });
  } catch (err) {
    console.error("[applications/action] Error:", err);
    return NextResponse.json(
      { error: "Ralat pelayan semasa memproses tindakan." },
      { status: 500 }
    );
  }
}
