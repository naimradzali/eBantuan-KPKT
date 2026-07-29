// Sistem eBantuan-PEKB — Shared Types
// Kementerian Perumahan dan Kerajaan Tempatan (KPKT)

export type Role =
  | "pegawai_pbt"
  | "penilai_pbt"
  | "wakil_ngo"
  | "penilai_ngo"
  | "pegawai_kpkt"
  | "pegawai_kpkt_pusat"
  | "admin";

export type Trek = "bantuan_perumahan" | "geran_pekb";
export type EntitiPemohon = "pbt" | "ngo";

export type KategoriBantuan =
  | "baik_pulih_rumah"
  | "rumah_mesra_rakyat"
  | "geran_ekonomi"
  | "bantuan_sara_hidup";

export type StatusPermohonan =
  | "draf"
  | "dihantar"
  | "semakan_pbt_ngo"
  | "semakan_daerah"
  | "semakan_negeri"
  | "diluluskan"
  | "ditolak"
  | "dipulangkan";

export type StatusPertindihanAi =
  | "tiada_pertindihan"
  | "disyaki_pertindihan"
  | "disahkan_pertindihan";

export type StatusPengesahanAi =
  | "belum_disemak"
  | "sah"
  | "tidak_lengkap"
  | "mencurigakan";

export type CadanganAi = "lulus" | "tolak" | "semak_semula";

export type JenisDokumen =
  | "mykad"
  | "slip_gaji"
  | "kad_oku"
  | "geran_tanah"
  | "gambar_rumah"
  | "laporan_tapak"
  | "pelan_perniagaan"
  | "lain_lain";

export interface User {
  id: string;
  namaPenuh: string;
  noKadPengenalan: string;
  peranan: Role;
  pbtId?: string | null;
  ngoId?: string | null;
  emel: string;
  noTelefon: string;
  statusAkaun: string;
  negeri: string;
  jawatan: string;
  pbt?: PbtProfile | null;
  ngo?: NgoProfile | null;
}

export interface PbtProfile {
  pbtId: string;
  namaPbt: string;
  kodPbt: string;
  negeri: string;
  daerah: string;
  kategoriPbt: string;
  statusAkaunPbt: string;
}

export interface NgoProfile {
  ngoId: string;
  namaNgo: string;
  noPendaftaranRos: string;
  noAkreditasiPekb: string;
  negeriOperasi: string;
  daerahOperasi: string;
  statusAkreditasi: string;
}

export interface Application {
  applicationId: string;
  noRujukan: string;
  trek: Trek;
  entitiPemohonJenis: EntitiPemohon;
  pbtId?: string | null;
  ngoId?: string | null;
  disediakanOlehPenggunaId: string;
  namaPenerima: string;
  noKpPenerima: string;
  alamatPenerima: string;
  negeriPenerima: string;
  daerahPenerima: string;
  telefonPenerima: string;
  pendapatanIsiRumah: number;
  bilanganTanggungan: number;
  statusOku: boolean;
  jenisOku: string;
  statusPemilikanRumah: string;
  jenisRumah: string;
  kategoriBantuan: KategoriBantuan;
  zonMukim: string;
  noRujukanPemeriksaan: string;
  nilaiAnggaranKerja: number;
  kawasanOperasi: string;
  cadanganPelanGuna: string;
  nilaiGeranDipohon: number;
  namaPerniagaan: string;
  jenisPerniagaan: string;
  skorKelayakanAi: number;
  statusPertindihanAi: StatusPertindihanAi;
  notaAi: string;
  cadanganAi: CadanganAi;
  sebabCadanganAi: string;
  statusPermohonan: StatusPermohonan;
  peringkatSemasa: string;
  notaPenilai: string;
  alasanPenolakan: string;
  tarikhPermohonan?: string | null;
  tarikhDiluluskan?: string | null;
  tarikhDicipta: string;
  tarikhDikemaskini: string;
  pbt?: PbtProfile | null;
  ngo?: NgoProfile | null;
  disediakanOleh?: User | null;
  documents?: Document[];
  auditLogs?: AuditLog[];
}

export interface Document {
  documentId: string;
  applicationId: string;
  jenisDokumen: JenisDokumen;
  namaFail: string;
  saizFail: number;
  jenisMime: string;
  statusPengesahanAi: StatusPengesahanAi;
  dataEkstrakAi: string;
  catatanAi: string;
  tarikhMuatNaik: string;
}

export interface AuditLog {
  logId: string;
  applicationId?: string | null;
  penggunaId: string;
  tindakan: string;
  perincian: string;
  capMasa: string;
  pengguna?: User | null;
}

export interface Notification {
  notifikasiId: string;
  penggunaId: string;
  applicationId?: string | null;
  tajuk: string;
  mesej: string;
  jenis: string;
  dibaca: boolean;
  tarikhDicipta: string;
}

export interface AiConfig {
  id: number;
  ambangSkorLulus: number;
  ambangSkorSemak: number;
  modelAi: string;
  enableAiScreening: boolean;
  enableAiDocVerify: boolean;
  enableAiChatbot: boolean;
  enableAiFraud: boolean;
}

// ============ AI Response types ============
export interface EligibilityResult {
  skor: number;
  cadangan: CadanganAi;
  justifikasi: string;
  kategoriAlternatif?: string[];
  faktor: { label: string; impact: string; weight: number }[];
}

export interface DocumentVerificationResult {
  status: StatusPengesahanAi;
  dataEkstrak: Record<string, string>;
  catatan: string;
  anomali: string[];
}

export interface DecisionSupportResult {
  ringkasan: string;
  cadangan: CadanganAi;
  sebab: string[];
  faktorRisiko: string[];
}

export interface DuplicateDetectionResult {
  adaPertindihan: boolean;
  tahapKeyakinan: number;
  padanan: { noRujukan: string; trek: Trek; persamaan: string }[];
}

// ============ Helper / display maps ============
export const ROLE_LABELS: Record<Role, string> = {
  pegawai_pbt: "Pegawai PBT",
  penilai_pbt: "Penilai PBT",
  wakil_ngo: "Wakil NGO",
  penilai_ngo: "Penilai NGO",
  pegawai_kpkt: "Pegawai KPKT Daerah/Negeri",
  pegawai_kpkt_pusat: "Pegawai KPKT Pusat",
  admin: "Pentadbir Sistem",
};

export const STATUS_LABELS: Record<StatusPermohonan, string> = {
  draf: "Draf",
  dihantar: "Dihantar",
  semakan_pbt_ngo: "Semakan PBT/NGO",
  semakan_daerah: "Semakan Daerah",
  semakan_negeri: "Semakan Negeri",
  diluluskan: "Diluluskan",
  ditolak: "Ditolak",
  dipulangkan: "Dipulangkan",
};

export const STATUS_COLORS: Record<StatusPermohonan, string> = {
  draf: "bg-muted text-muted-foreground",
  dihantar: "bg-blue-100 text-blue-700 border-blue-200",
  semakan_pbt_ngo: "bg-amber-100 text-amber-700 border-amber-200",
  semakan_daerah: "bg-orange-100 text-orange-700 border-orange-200",
  semakan_negeri: "bg-purple-100 text-purple-700 border-purple-200",
  diluluskan: "bg-emerald-100 text-emerald-700 border-emerald-200",
  ditolak: "bg-red-100 text-red-700 border-red-200",
  dipulangkan: "bg-pink-100 text-pink-700 border-pink-200",
};

export const KATEGORI_LABELS: Record<KategoriBantuan, string> = {
  baik_pulih_rumah: "Baik Pulih Rumah",
  rumah_mesra_rakyat: "Rumah Mesra Rakyat",
  geran_ekonomi: "Geran Ekonomi / Mikro-usahawan",
  bantuan_sara_hidup: "Bantuan Sara Hidup",
};

export const JENIS_DOK_LABELS: Record<string, string> = {
  mykad: "MyKad Penerima",
  slip_gaji: "Slip Gaji / Pendapatan",
  kad_oku: "Kad OKU",
  geran_tanah: "Geran Tanah",
  gambar_rumah: "Gambar Rumah",
  laporan_tapak: "Laporan Pemeriksaan Tapak",
  pelan_perniagaan: "Pelan Perniagaan",
  lain_lain: "Lain-lain",
};

export const PERTINDIHAN_LABELS: Record<StatusPertindihanAi, string> = {
  tiada_pertindihan: "Tiada Pertindihan",
  disyaki_pertindihan: "Disyaki Pertindihan",
  disahkan_pertindihan: "Disahkan Pertindihan",
};

export const PENGESAHAN_LABELS: Record<StatusPengesahanAi, string> = {
  belum_disemak: "Belum Disemak",
  sah: "Sah",
  tidak_lengkap: "Tidak Lengkap",
  mencurigakan: "Mencurigakan",
};

// Mask IC for display (data masking - PDPA compliance)
export function maskIC(ic: string): string {
  if (!ic || ic.length < 14) return ic;
  return `${ic.substring(0, 6)}-XX-XXXX`;
}

export function formatRM(amount: number): string {
  return new Intl.NumberFormat("ms-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date?: string | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(date));
}

export function formatDateTime(date?: string | null): string {
  if (!date) return "-";
  return new Intl.DateTimeFormat("ms-MY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}
