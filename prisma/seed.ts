/* Sistem eBantuan-PEKB — Database Seed Script
 * Generates dummy data: 10 PBT, 15 NGO, ~50 users, ~120 applications, documents, audit logs
 * Run with: bun run db:seed
 */
import { PrismaClient } from "@prisma/client";
import { db } from "../src/lib/db";

const PBT_LIST = [
  { namaPbt: "Dewan Bandaraya Kuala Lumpur", kodPbt: "DBKL", negeri: "Wilayah Persekutuan Kuala Lumpur", daerah: "WP Kuala Lumpur", kategoriPbt: "dewan_bandaraya" },
  { namaPbt: "Majlis Bandaraya Shah Alam", kodPbt: "MBSA", negeri: "Selangor", daerah: "Shah Alam", kategoriPbt: "dewan_bandaraya" },
  { namaPbt: "Majlis Bandaraya Petaling Jaya", kodPbt: "MBPJ", negeri: "Selangor", daerah: "Petaling Jaya", kategoriPbt: "dewan_bandaraya" },
  { namaPbt: "Majlis Perbandaran Ampang Jaya", kodPbt: "MPAJ", negeri: "Selangor", daerah: "Ampang", kategoriPbt: "majlis_perbandaran" },
  { namaPbt: "Majlis Perbandaran Klang", kodPbt: "MPK", negeri: "Selangor", daerah: "Klang", kategoriPbt: "majlis_perbandaran" },
  { namaPbt: "Majlis Bandaraya Johor Bahru", kodPbt: "MBJB", negeri: "Johor", daerah: "Johor Bahru", kategoriPbt: "dewan_bandaraya" },
  { namaPbt: "Majlis Perbandaran Pulau Pinang", kodPbt: "MPPP", negeri: "Pulau Pinang", daerah: "Pulau Pinang", kategoriPbt: "majlis_perbandaran" },
  { namaPbt: "Majlis Bandaraya Ipoh", kodPbt: "MBI", negeri: "Perak", daerah: "Ipoh", kategoriPbt: "dewan_bandaraya" },
  { namaPbt: "Majlis Perbandaran Alor Gajah", kodPbt: "MPAG", negeri: "Melaka", daerah: "Alor Gajah", kategoriPbt: "majlis_perbandaran" },
  { namaPbt: "Majlis Daerah Kota Tinggi", kodPbt: "MDKT", negeri: "Johor", daerah: "Kota Tinggi", kategoriPbt: "majlis_daerah" },
];

const NGO_LIST = [
  { namaNgo: "Yayasan Bina Ummah", noPendaftaranRos: "ROS-001-NGO-2018", noAkreditasiPekb: "PEKB-NGO-2024-001", negeriOperasi: "Selangor", daerahOperasi: "Shah Alam" },
  { namaNgo: "Pertubuhan IKRAM Malaysia", noPendaftaranRos: "ROS-002-NGO-2015", noAkreditasiPekb: "PEKB-NGO-2024-002", negeriOperasi: "Wilayah Persekutuan Kuala Lumpur", daerahOperasi: "WP Kuala Lumpur" },
  { namaNgo: "Yayasan Sinar Sukma", noPendaftaranRos: "ROS-003-NGO-2019", noAkreditasiPekb: "PEKB-NGO-2024-003", negeriOperasi: "Johor", daerahOperasi: "Johor Bahru" },
  { namaNgo: "Pertubuhan Prihatin Komuniti Bandar", noPendaftaranRos: "ROS-004-NGO-2020", noAkreditasiPekb: "PEKB-NGO-2024-004", negeriOperasi: "Pulau Pinang", daerahOperasi: "Pulau Pinang" },
  { namaNgo: "Yayasan Pembangunan Ekonomi Islam", noPendaftaranRos: "ROS-005-NGO-2017", noAkreditasiPekb: "PEKB-NGO-2024-005", negeriOperasi: "Selangor", daerahOperasi: "Klang" },
  { namaNgo: "Pertubuhan Wanita Sinar Harapan", noPendaftaranRos: "ROS-006-NGO-2021", noAkreditasiPekb: "PEKB-NGO-2024-006", negeriOperasi: "Perak", daerahOperasi: "Ipoh" },
  { namaNgo: "Yayasan Usahawan Mikro B40", noPendaftaranRos: "ROS-007-NGO-2019", noAkreditasiPekb: "PEKB-NGO-2024-007", negeriOperasi: "Selangor", daerahOperasi: "Ampang" },
  { namaNgo: "Pertubuhan Belia Prihatin Malaysia", noPendaftaranRos: "ROS-008-NGO-2016", noAkreditasiPekb: "PEKB-NGO-2024-008", negeriOperasi: "Melaka", daerahOperasi: "Alor Gajah" },
  { namaNgo: "Yayasan Kasih Sayang OKU", noPendaftaranRos: "ROS-009-NGO-2018", noAkreditasiPekb: "PEKB-NGO-2024-009", negeriOperasi: "Johor", daerahOperasi: "Kota Tinggi" },
  { namaNgo: "Pertubuhan Pembangunan Komuniti Bandar", noPendaftaranRos: "ROS-010-NGO-2020", noAkreditasiPekb: "PEKB-NGO-2024-010", negeriOperasi: "Wilayah Persekutuan Kuala Lumpur", daerahOperasi: "WP Kuala Lumpur" },
  { namaNgo: "Yayasan Bakti Sosial", noPendaftaranRos: "ROS-011-NGO-2017", noAkreditasiPekb: "PEKB-NGO-2024-011", negeriOperasi: "Selangor", daerahOperasi: "Petaling Jaya" },
  { namaNgo: "Pertubuhan Kebajikan Anak Yatim Bandar", noPendaftaranRos: "ROS-012-NGO-2021", noAkreditasiPekb: "PEKB-NGO-2024-012", negeriOperasi: "Perak", daerahOperasi: "Ipoh" },
  { namaNgo: "Yayasan Ekonomi Ummah Sejahtera", noPendaftaranRos: "ROS-013-NGO-2019", noAkreditasiPekb: "PEKB-NGO-2024-013", negeriOperasi: "Pulau Pinang", daerahOperasi: "Pulau Pinang" },
  { namaNgo: "Pertubuhan Sokongan Usahawan Wanita", noPendaftaranRos: "ROS-014-NGO-2020", noAkreditasiPekb: "PEKB-NGO-2024-014", negeriOperasi: "Johor", daerahOperasi: "Johor Bahru" },
  { namaNgo: "Yayasan Komuniti Mesra Rakyat", noPendaftaranRos: "ROS-015-NGO-2018", noAkreditasiPekb: "PEKB-NGO-2024-015", negeriOperasi: "Selangor", daerahOperasi: "Klang" },
];

const NEGERI_LIST = [
  "Wilayah Persekutuan Kuala Lumpur", "Selangor", "Johor", "Pulau Pinang", "Perak", "Melaka",
  "Negeri Sembilan", "Pahang", "Kelantan", "Terengganu", "Kedah", "Sabah", "Sarawak",
];

const NAMA_DEPAN = ["Ahmad", "Siti", "Mohd", "Nur", "Abdul", "Fatimah", "Rahman", "Aisyah", "Hassan", "Khadijah", "Yusof", "Zainab", "Ibrahim", "Mariam", "Omar", "Hawa", "Ali", "Rohani", "Lim", "Tan", "Wong", "Raj", "Kumar", "Annuar"];
const NAMA_TENGAH = ["bin", "binti", "a/l", "a/p"];
const NAMA_AKHIR = ["Rahman", "Hassan", "Ismail", "Abdullah", "Yusof", "Mohamed", "Ahmad", "Salleh", "Ibrahim", "Omar", "Lim", "Tan", "Wong", "Subramaniam", "Chandran", "Krishnan", "Lee", "Goh"];

const KATEGORI_TREK1 = ["baik_pulih_rumah", "rumah_mesra_rakyat"];
const KATEGORI_TREK2 = ["geran_ekonomi", "bantuan_sara_hidup"];

const STATUS_LIST = ["dihantar", "semakan_pbt_ngo", "semakan_daerah", "semakan_negeri", "diluluskan", "ditolak", "dipulangkan"];
const JENIS_DOK = ["mykad", "slip_gaji", "kad_oku", "geran_tanah", "gambar_rumah", "laporan_tapak", "pelan_perniagaan"];

function rand<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function genIC(): string {
  const yy = String(randInt(50, 95));
  const mm = String(randInt(1, 12)).padStart(2, "0");
  const dd = String(randInt(1, 28)).padStart(2, "0");
  const b = String(randInt(0, 99)).padStart(2, "0");
  const c = String(randInt(0, 9999)).padStart(4, "0");
  return `${yy}${mm}${dd}-${b}-${c}`;
}
function genNama() {
  return `${rand(NAMA_DEPAN)} ${rand(NAMA_TENGAH)} ${rand(NAMA_AKHIR)}`;
}
function genNoRujukan(trek: string, idx: number) {
  const prefix = trek === "bantuan_perumahan" ? "BP" : "GP";
  return `${prefix}-2026-${String(idx).padStart(6, "0")}`;
}

async function main() {
  console.log("🌱 Memulakan seed data eBantuan-PEKB...");

  // Bersihkan data sedia ada
  await db.notification.deleteMany();
  await db.auditLog.deleteMany();
  await db.document.deleteMany();
  await db.application.deleteMany();
  await db.user.deleteMany();
  await db.ngoProfile.deleteMany();
  await db.pbtProfile.deleteMany();
  await db.aiConfig.deleteMany();

  // 1. PBT Profiles
  const pbts = [];
  for (const p of PBT_LIST) {
    const pbt = await db.pbtProfile.create({
      data: { ...p, statusAkaunPbt: "aktif" },
    });
    pbts.push(pbt);
  }
  console.log(`✅ ${pbts.length} profil PBT dicipta`);

  // 2. NGO Profiles
  const ngos = [];
  for (const n of NGO_LIST) {
    const ngo = await db.ngoProfile.create({
      data: { ...n, statusAkreditasi: "aktif" },
    });
    ngos.push(ngo);
  }
  console.log(`✅ ${ngos.length} profil NGO dicipta`);

  // 3. Users — Admin & KPKT
  await db.user.create({
    data: {
      namaPenuh: "Sistem Pentadbir",
      noKadPengenalan: "880101-14-5566",
      peranan: "admin",
      emel: "admin@kpkt.gov.my",
      noTelefon: "0123456789",
      kataLaluanHash: "admin123",
      jawatan: "Pentadbir Sistem",
      negeri: "Wilayah Persekutuan Putrajaya",
    },
  });

  // KPKT officers
  const kpktUsers = [];
  for (let i = 0; i < 6; i++) {
    const u = await db.user.create({
      data: {
        namaPenuh: i < 3 ? `Pegawai KPKT Daerah ${i + 1}` : `Pegawai KPKT Negeri ${i - 2}`,
        noKadPengenalan: genIC(),
        peranan: i < 3 ? "pegawai_kpkt" : "pegawai_kpkt_pusat",
        emel: `kpkt${i + 1}@kpkt.gov.my`,
        noTelefon: `01234560${i}${i}`,
        kataLaluanHash: "kpkt123",
        jawatan: i < 3 ? "Pegawai Penilai Daerah" : "Pegawai Pengurusan Negeri",
        negeri: NEGERI_LIST[i % NEGERI_LIST.length],
      },
    });
    kpktUsers.push(u);
  }
  console.log(`✅ ${kpktUsers.length + 1} pengguna KPKT/Admin dicipta`);

  // 4. PBT users (pegawai + penilai)
  const pbtUsers = [];
  for (const pbt of pbts) {
    // 1 pegawai + 1 penilai per PBT
    const pegawai = await db.user.create({
      data: {
        namaPenuh: `Pegawai PBT ${pbt.kodPbt}`,
        noKadPengenalan: genIC(),
        peranan: "pegawai_pbt",
        pbtId: pbt.pbtId,
        emel: `pegawai.${pbt.kodPbt.toLowerCase()}@pbt.gov.my`,
        noTelefon: `01345670${randInt(10, 99)}`,
        kataLaluanHash: "pbt123",
        jawatan: "Pegawai Pembangunan",
        negeri: pbt.negeri,
      },
    });
    const penilai = await db.user.create({
      data: {
        namaPenuh: `Penilai PBT ${pbt.kodPbt}`,
        noKadPengenalan: genIC(),
        peranan: "penilai_pbt",
        pbtId: pbt.pbtId,
        emel: `penilai.${pbt.kodPbt.toLowerCase()}@pbt.gov.my`,
        noTelefon: `01345671${randInt(10, 99)}`,
        kataLaluanHash: "pbt123",
        jawatan: "Pegawai Penilai Kelayakan",
        negeri: pbt.negeri,
      },
    });
    pbtUsers.push(pegawai, penilai);
  }
  console.log(`✅ ${pbtUsers.length} pengguna PBT dicipta`);

  // 5. NGO users (wakil + penilai)
  const ngoUsers = [];
  for (const ngo of ngos) {
    const wakil = await db.user.create({
      data: {
        namaPenuh: `Wakil ${ngo.namaNgo.substring(0, 20)}`,
        noKadPengenalan: genIC(),
        peranan: "wakil_ngo",
        ngoId: ngo.ngoId,
        emel: `wakil.${ngo.noAkreditasiPekb.toLowerCase()}@ngo.org.my`,
        noTelefon: `01456780${randInt(10, 99)}`,
        kataLaluanHash: "ngo123",
        jawatan: "Pegawai Projek",
        negeri: ngo.negeriOperasi,
      },
    });
    const penilai = await db.user.create({
      data: {
        namaPenuh: `Penilai ${ngo.namaNgo.substring(0, 20)}`,
        noKadPengenalan: genIC(),
        peranan: "penilai_ngo",
        ngoId: ngo.ngoId,
        emel: `penilai.${ngo.noAkreditasiPekb.toLowerCase()}@ngo.org.my`,
        noTelefon: `01456781${randInt(10, 99)}`,
        kataLaluanHash: "ngo123",
        jawatan: "Pegawai Penilai NGO",
        negeri: ngo.negeriOperasi,
      },
    });
    ngoUsers.push(wakil, penilai);
  }
  console.log(`✅ ${ngoUsers.length} pengguna NGO dicipta`);

  // 6. Applications
  let bpCounter = 1;
  let gpCounter = 1;
  const allApps = [];

  // Trek 1: 65 PBT applications
  for (let i = 0; i < 65; i++) {
    const pbt = rand(pbts);
    const pegawai = pbtUsers.find((u) => u.pbtId === pbt.pbtId && u.peranan === "pegawai_pbt")!;
    const kategori = rand(KATEGORI_TREK1);
    const status = rand(STATUS_LIST);
    const pendapatan = randInt(500, 3000);
    const tanggungan = randInt(1, 7);
    const isOku = Math.random() < 0.25;
    const skor = status === "ditolak" ? randInt(20, 45) : status === "diluluskan" ? randInt(75, 98) : randInt(45, 85);
    const noRujukan = genNoRujukan("bantuan_perumahan", bpCounter++);

    const tarikh = new Date(Date.now() - randInt(1, 120) * 86400000);
    const app = await db.application.create({
      data: {
        noRujukan,
        trek: "bantuan_perumahan",
        entitiPemohonJenis: "pbt",
        pbtId: pbt.pbtId,
        disediakanOlehPenggunaId: pegawai.id,
        namaPenerima: genNama(),
        noKpPenerima: genIC(),
        alamatPenerima: `No. ${randInt(1, 200)}, Jalan ${rand(["Mawar", "Melur", "Kenanga", "Cempaka", "Seroja"])}, ${pbt.daerah}`,
        negeriPenerima: pbt.negeri,
        daerahPenerima: pbt.daerah,
        telefonPenerima: `01${randInt(0, 9)}${randInt(1000000, 9999999)}`,
        pendapatanIsiRumah: pendapatan,
        bilanganTanggungan: tanggungan,
        statusOku: isOku,
        jenisOku: isOku ? rand(["fizikal", "penglihatan", "pendengaran", "mental"]) : "",
        statusPemilikanRumah: rand(["milik_sendiri", "sewa", "tanah_orang"]),
        jenisRumah: rand(["papan", "batu", "kayu", "campuran"]),
        kategoriBantuan: kategori,
        zonMukim: `Zon ${randInt(1, 6)}`,
        noRujukanPemeriksaan: `INS-${pbt.kodPbt}-${randInt(1000, 9999)}`,
        nilaiAnggaranKerja: kategori === "baik_pulih_rumah" ? randInt(15000, 50000) : randInt(60000, 95000),
        skorKelayakanAi: skor,
        statusPertindihanAi: Math.random() < 0.1 ? "disyaki_pertindihan" : "tiada_pertindihan",
        notaAi: `Pendapatan isi rumah RM${pendapatan} berada dalam julat B40 ${pendapatan < 1169 ? "Miskin Tegar" : "B40 Pertengahan"}. Tanggungan ${tanggungan} orang.`,
        cadanganAi: skor >= 70 ? "lulus" : skor >= 50 ? "semak_semula" : "tolak",
        sebabCadanganAi: skor >= 70 ? "Memenuhi kriteria kelayakan B40/PEKB" : skor >= 50 ? "Dokumen perlu disemak semula" : "Tidak memenuhi ambang kelayakan",
        statusPermohonan: status,
        peringkatSemasa: status === "diluluskan" ? "selesai" : status === "ditolak" ? "selesai" : status === "dipulangkan" ? "pbt" : status === "semakan_pbt_ngo" ? "pbt" : status === "semakan_daerah" ? "kpkt_daerah" : status === "semakan_negeri" ? "kpkt_negeri" : "draf",
        tarikhPermohonan: tarikh,
        tarikhDiluluskan: status === "diluluskan" ? new Date(tarikh.getTime() + randInt(7, 30) * 86400000) : null,
      },
    });
    allApps.push(app);

    // documents for app
    const numDocs = randInt(2, 4);
    for (let d = 0; d < numDocs; d++) {
      const jenis = rand(["mykad", "slip_gaji", "gambar_rumah", "laporan_tapak"]);
      await db.document.create({
        data: {
          applicationId: app.applicationId,
          jenisDokumen: jenis,
          namaFail: `${jenis}_${app.noRujukan}_${d + 1}.pdf`,
          saizFail: randInt(80000, 4500000),
          jenisMime: "application/pdf",
          statusPengesahanAi: rand(["sah", "sah", "sah", "tidak_lengkap", "mencurigakan"]),
          dataEkstrakAi: JSON.stringify({ extracted: true, fields: ["nama", "no_kp"] }),
          catatanAi: jenis === "mykad" ? "MyKad jelas, maklumat penerima sepadan" : jenis === "slip_gaji" ? "Slip gaji bulan semasa, pendapatan disahkan" : "Dokumen telah disahkan",
        },
      });
    }

    // audit log: hantar permohonan
    await db.auditLog.create({
      data: {
        applicationId: app.applicationId,
        penggunaId: pegawai.id,
        tindakan: "hantar_permohonan",
        perincian: `Permohonan ${app.noRujukan} dihantar oleh ${pegawai.namaPenuh} (${pbt.kodPbt})`,
        capMasa: tarikh,
      },
    });

    // approval audit if approved
    if (status === "diluluskan" || status === "ditolak") {
      const penilai = kpktUsers[randInt(0, kpktUsers.length - 1)];
      await db.auditLog.create({
        data: {
          applicationId: app.applicationId,
          penggunaId: penilai.id,
          tindakan: status === "diluluskan" ? "lulus" : "tolak",
          perincian: `Permohonan ${app.noRujukan} ${status === "diluluskan" ? "diluluskan" : "ditolak"} oleh ${penilai.namaPenuh}`,
          capMasa: app.tarikhDiluluskan || new Date(tarikh.getTime() + randInt(7, 30) * 86400000),
        },
      });
    }
  }
  console.log(`✅ ${bpCounter - 1} permohonan Trek 1 (PBT) dicipta`);

  // Trek 2: 65 NGO applications
  for (let i = 0; i < 65; i++) {
    const ngo = rand(ngos);
    const wakil = ngoUsers.find((u) => u.ngoId === ngo.ngoId && u.peranan === "wakil_ngo")!;
    const kategori = rand(KATEGORI_TREK2);
    const status = rand(STATUS_LIST);
    const pendapatan = randInt(300, 2800);
    const tanggungan = randInt(1, 6);
    const isOku = Math.random() < 0.2;
    const skor = status === "ditolak" ? randInt(15, 40) : status === "diluluskan" ? randInt(72, 97) : randInt(40, 80);
    const noRujukan = genNoRujukan("geran_pekb", gpCounter++);
    const isGeranEkonomi = kategori === "geran_ekonomi";

    const tarikh = new Date(Date.now() - randInt(1, 120) * 86400000);
    const app = await db.application.create({
      data: {
        noRujukan,
        trek: "geran_pekb",
        entitiPemohonJenis: "ngo",
        ngoId: ngo.ngoId,
        disediakanOlehPenggunaId: wakil.id,
        namaPenerima: genNama(),
        noKpPenerima: genIC(),
        alamatPenerima: `No. ${randInt(1, 150)}, Taman ${rand(["Sungai", "Bukit", "Sri", "Desa", "Taman"])} ${rand(["Jaya", "Maju", "Sentosa", "Murni"])}, ${ngo.daerahOperasi}`,
        negeriPenerima: ngo.negeriOperasi,
        daerahPenerima: ngo.daerahOperasi,
        telefonPenerima: `01${randInt(0, 9)}${randInt(1000000, 9999999)}`,
        pendapatanIsiRumah: pendapatan,
        bilanganTanggungan: tanggungan,
        statusOku: isOku,
        jenisOku: isOku ? rand(["fizikal", "penglihatan", "pendengaran"]) : "",
        kategoriBantuan: kategori,
        kawasanOperasi: `Kawasan ${rand(["B40", "Bandar", "Setinggan", "PPR"])} ${ngo.daerahOperasi}`,
        cadanganPelanGuna: isGeranEkonomi ? `Modal pusingan untuk perniagaan ${rand(["kedai runcit", "kuih-muih", "jahitan", "katering"])}` : "Belian keperluan asas bulanan (beras, minyak, susu kanak-kanak)",
        nilaiGeranDipohon: isGeranEkonomi ? randInt(2000, 10000) : randInt(500, 1500),
        namaPerniagaan: isGeranEkonomi ? `Perniagaan ${rand(["Mak Limah", "Pak Abu", "Kak Long", "Cik Bedah"])}` : "",
        jenisPerniagaan: isGeranEkonomi ? rand(["makanan", "jahitan", "pertanian", "lain"]) : "",
        skorKelayakanAi: skor,
        statusPertindihanAi: Math.random() < 0.08 ? "disyaki_pertindihan" : "tiada_pertindihan",
        notaAi: `Pendapatan isi rumah RM${pendapatan}. ${isGeranEkonomi ? "Geran mikro-usahawan sesuai." : "Bantuan sara hidup diperlukan."} Tanggungan ${tanggungan} orang.`,
        cadanganAi: skor >= 70 ? "lulus" : skor >= 50 ? "semak_semula" : "tolak",
        sebabCadanganAi: skor >= 70 ? "Pemohon layak menerima geran PEKB" : skor >= 50 ? "Pelan penggunaan geran perlu diperincikan" : "Pendapatan melebihi ambang B40",
        statusPermohonan: status,
        peringkatSemasa: status === "diluluskan" ? "selesai" : status === "ditolak" ? "selesai" : status === "dipulangkan" ? "ngo" : status === "semakan_pbt_ngo" ? "ngo" : status === "semakan_daerah" ? "kpkt_daerah" : status === "semakan_negeri" ? "kpkt_negeri" : "draf",
        tarikhPermohonan: tarikh,
        tarikhDiluluskan: status === "diluluskan" ? new Date(tarikh.getTime() + randInt(7, 30) * 86400000) : null,
      },
    });
    allApps.push(app);

    const numDocs = randInt(2, 4);
    for (let d = 0; d < numDocs; d++) {
      const jenis = rand(["mykad", "slip_gaji", "kad_oku", "pelan_perniagaan"]);
      await db.document.create({
        data: {
          applicationId: app.applicationId,
          jenisDokumen: jenis,
          namaFail: `${jenis}_${app.noRujukan}_${d + 1}.pdf`,
          saizFail: randInt(80000, 4500000),
          jenisMime: "application/pdf",
          statusPengesahanAi: rand(["sah", "sah", "sah", "tidak_lengkap"]),
          dataEkstrakAi: JSON.stringify({ extracted: true, fields: ["nama", "no_kp"] }),
          catatanAi: jenis === "mykad" ? "MyKad penerima disahkan" : jenis === "pelan_perniagaan" ? "Pelan perniagaan ringkas, munasabah" : "Dokumen lengkap",
        },
      });
    }

    await db.auditLog.create({
      data: {
        applicationId: app.applicationId,
        penggunaId: wakil.id,
        tindakan: "hantar_permohonan",
        perincian: `Permohonan ${app.noRujukan} dihantar oleh ${wakil.namaPenuh} (${ngo.namaNgo})`,
        capMasa: tarikh,
      },
    });

    if (status === "diluluskan" || status === "ditolak") {
      const penilai = kpktUsers[randInt(0, kpktUsers.length - 1)];
      await db.auditLog.create({
        data: {
          applicationId: app.applicationId,
          penggunaId: penilai.id,
          tindakan: status === "diluluskan" ? "lulus" : "tolak",
          perincian: `Permohonan ${app.noRujukan} ${status === "diluluskan" ? "diluluskan" : "ditolak"} oleh ${penilai.namaPenuh}`,
          capMasa: app.tarikhDiluluskan || new Date(tarikh.getTime() + randInt(7, 30) * 86400000),
        },
      });
    }
  }
  console.log(`✅ ${gpCounter - 1} permohonan Trek 2 (NGO) dicipta`);

  // 7. Buat beberapa kes pertindihan rentas-trek (cross-track duplicate) sengaja
  const bpApps = allApps.filter((a) => a.trek === "bantuan_perumahan");
  for (let i = 0; i < 3 && i < bpApps.length; i++) {
    const bp = bpApps[i];
    const ngo = rand(ngos);
    const wakil = ngoUsers.find((u) => u.ngoId === ngo.ngoId && u.peranan === "wakil_ngo")!;
    const tarikh = new Date(Date.now() - randInt(1, 60) * 86400000);
    const dupApp = await db.application.create({
      data: {
        noRujukan: genNoRujukan("geran_pekb", gpCounter++),
        trek: "geran_pekb",
        entitiPemohonJenis: "ngo",
        ngoId: ngo.ngoId,
        disediakanOlehPenggunaId: wakil.id,
        namaPenerima: bp.namaPenerima,
        noKpPenerima: bp.noKpPenerima, // SAME IC — cross-track duplicate!
        alamatPenerima: bp.alamatPenerima,
        negeriPenerima: bp.negeriPenerima,
        daerahPenerima: bp.daerahPenerima,
        telefonPenerima: bp.telefonPenerima,
        pendapatanIsiRumah: bp.pendapatanIsiRumah,
        bilanganTanggungan: bp.bilanganTanggungan,
        statusOku: bp.statusOku,
        kategoriBantuan: "bantuan_sara_hidup",
        kawasanOperasi: ngo.daerahOperasi,
        nilaiGeranDipohon: 800,
        skorKelayakanAi: 72,
        statusPertindihanAi: "disahkan_pertindihan",
        notaAi: `PERINGATAN: No. KP ${bp.noKpPenerima.substring(0, 6)}-XX-XXXX didapati bertindihan dengan permohonan Trek 1 (${bp.noRujukan}).`,
        cadanganAi: "semak_semula",
        sebabCadanganAi: "Pertindihan rentas-trek dikesan — perlu kelulusan khas KPKT",
        statusPermohonan: "semakan_daerah",
        peringkatSemasa: "kpkt_daerah",
        tarikhPermohonan: tarikh,
      },
    });
    await db.auditLog.create({
      data: {
        applicationId: dupApp.applicationId,
        penggunaId: wakil.id,
        tindakan: "hantar_permohonan",
        perincian: `Permohonan ${dupApp.noRujukan} dihantar — pertindihan rentas-trek dikesan`,
        capMasa: tarikh,
      },
    });
  }
  console.log(`✅ 3 kes pertindihan rentas-trek sengaja dicipta`);

  // 8. Notifications untuk pegawai KPKT & PBT/NGO
  const someApps = allApps.slice(0, 20);
  for (const app of someApps) {
    const submitterId = app.disediakanOlehPenggunaId;
    await db.notification.create({
      data: {
        penggunaId: submitterId,
        applicationId: app.applicationId,
        tajuk: "Kemas kini status permohonan",
        mesej: `Permohonan ${app.noRujukan} kini berstatus: ${app.statusPermohonan}`,
        jenis: "status",
        dibaca: Math.random() < 0.5,
      },
    });
  }
  // KPKT notifications
  for (const kpkt of kpktUsers) {
    await db.notification.create({
      data: {
        penggunaId: kpkt.id,
        tajuk: "Permohonan baharu menunggu semakan",
        mesej: "Terdapat permohonan baharu yang menunggu semakan anda.",
        jenis: "sistem",
        dibaca: Math.random() < 0.5,
      },
    });
  }
  console.log(`✅ Notifikasi dicipta`);

  // 9. AI Config
  await db.aiConfig.create({
    data: {
      ambangSkorLulus: 70,
      ambangSkorSemak: 50,
      modelAi: "glm-4.5",
      enableAiScreening: true,
      enableAiDocVerify: true,
      enableAiChatbot: true,
      enableAiFraud: true,
    },
  });
  console.log(`✅ Konfigurasi AI dicipta`);

  console.log("\n🎉 Seed selesai!");
  console.log(`   - ${pbts.length} PBT, ${ngos.length} NGO`);
  console.log(`   - ${kpktUsers.length + 1 + pbtUsers.length + ngoUsers.length} pengguna`);
  console.log(`   - ${allApps.length + 3} permohonan (termasuk 3 kes pertindihan)`);
  console.log("\n📋 Akaun log masuk demo:");
  console.log("   Admin:  admin@kpkt.gov.my / admin123");
  console.log("   KPKT:   kpkt1@kpkt.gov.my / kpkt123");
  console.log("   PBT:    pegawai.mbsa@pbt.gov.my / pbt123");
  console.log("   NGO:    wakil.pekb-ngo-2024-001@ngo.org.my / ngo123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
