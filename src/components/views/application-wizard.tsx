"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, Check, User, Home, FileText, Upload, FileCheck,
  Save, Send, Loader2, X, FilePlus2, AlertCircle, CheckCircle2, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  RadioGroup, RadioGroupItem,
} from "@/components/ui/radio-group";
import { api } from "@/lib/api-client";
import { useAppStore, useRoleAccess } from "@/lib/store";
import {
  type Trek, type KategoriBantuan, type JenisDokumen,
  KATEGORI_LABELS, JENIS_DOK_LABELS, formatRM,
} from "@/lib/types";
import { TrekBadge } from "@/components/shared/badges";
import { toast } from "sonner";

const NEGERI_LIST = [
  "Johor","Kedah","Kelantan","Melaka","Negeri Sembilan","Pahang","Pulau Pinang",
  "Perak","Perlis","Sabah","Sarawak","Selangor","Terengganu","Wilayah Persekutuan Kuala Lumpur",
  "Wilayah Persekutuan Putrajaya","Wilayah Persekutuan Labuan",
];

const JENIS_RUMAH_OPTS = ["papan", "kayu", "batu", "zon_z", "lain_lain"];
const PEMILIKAN_OPTS = ["milik_sendiri", "sewa", "persatuan", "kerajaan"];

const STEPS = [
  { id: 1, label: "Penerima", icon: User },
  { id: 2, label: "Isi Rumah", icon: Home },
  { id: 3, label: "Kategori", icon: FileText },
  { id: 4, label: "Dokumen", icon: Upload },
  { id: 5, label: "Semakan", icon: FileCheck },
];

interface FormState {
  // Step 1 — Penerima
  namaPenerima: string;
  noKpPenerima: string;
  alamatPenerima: string;
  negeriPenerima: string;
  daerahPenerima: string;
  telefonPenerima: string;
  // Step 2 — Isi Rumah
  pendapatanIsiRumah: string;
  bilanganTanggungan: string;
  statusOku: boolean;
  jenisOku: string;
  statusPemilikanRumah: string;
  jenisRumah: string;
  // Step 3 — Kategori
  kategoriBantuan: KategoriBantuan | "";
  // Trek 1 specific
  zonMukim: string;
  noRujukanPemeriksaan: string;
  nilaiAnggaranKerja: string;
  // Trek 2 specific
  kawasanOperasi: string;
  cadanganPelanGuna: string;
  nilaiGeranDipohon: string;
  namaPerniagaan: string;
  jenisPerniagaan: string;
}

interface PendingDoc {
  jenisDokumen: JenisDokumen;
  namaFail: string;
  saizFail: number;
  jenisMime: string;
}

const INITIAL_FORM: FormState = {
  namaPenerima: "",
  noKpPenerima: "",
  alamatPenerima: "",
  negeriPenerima: "",
  daerahPenerima: "",
  telefonPenerima: "",
  pendapatanIsiRumah: "",
  bilanganTanggungan: "",
  statusOku: false,
  jenisOku: "",
  statusPemilikanRumah: "milik_sendiri",
  jenisRumah: "batu",
  kategoriBantuan: "",
  zonMukim: "",
  noRujukanPemeriksaan: "",
  nilaiAnggaranKerja: "",
  kawasanOperasi: "",
  cadanganPelanGuna: "",
  nilaiGeranDipohon: "",
  namaPerniagaan: "",
  jenisPerniagaan: "",
};

function requiredDocsForTrek(trek: Trek, kategori: KategoriBantuan | "", isOku: boolean): { jenis: JenisDokumen; required: boolean }[] {
  const docs: { jenis: JenisDokumen; required: boolean }[] = [];
  docs.push({ jenis: "mykad", required: true });
  docs.push({ jenis: "slip_gaji", required: true });
  if (isOku) docs.push({ jenis: "kad_oku", required: true });
  if (trek === "bantuan_perumahan") {
    docs.push({ jenis: "gambar_rumah", required: true });
    if (kategori === "baik_pulih_rumah") {
      docs.push({ jenis: "geran_tanah", required: false });
      docs.push({ jenis: "laporan_tapak", required: false });
    }
  } else {
    if (kategori === "geran_ekonomi") docs.push({ jenis: "pelan_perniagaan", required: true });
  }
  return docs;
}

export function ApplicationWizardView() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const setActiveApplication = useAppStore((s) => s.setActiveApplication);
  const { isPBT, isNGO } = useRoleAccess();

  // Auto-detect trek from role
  const trek: Trek = useMemo(() => {
    if (isNGO && !isPBT) return "geran_pekb";
    return "bantuan_perumahan"; // default / PBT
  }, [isNGO, isPBT]);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pendingDocs, setPendingDocs] = useState<PendingDoc[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitMode, setSubmitMode] = useState<"draft" | "submit" | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => { const n = { ...e }; delete n[key as string]; return n; });
  }

  // Default kategori based on trek
  function ensureKategori(): KategoriBantuan {
    if (form.kategoriBantuan) return form.kategoriBantuan as KategoriBantuan;
    return trek === "bantuan_perumahan" ? "baik_pulih_rumah" : "geran_ekonomi";
  }

  function validateStep(s: number): boolean {
    const errs: Record<string, string> = {};
    if (s === 1) {
      if (!form.namaPenerima.trim()) errs.namaPenerima = "Nama diperlukan";
      if (!form.noKpPenerima.trim()) errs.noKpPenerima = "No. KP diperlukan";
      else if (!/^\d{6}-?\d{2}-?\d{4}$/.test(form.noKpPenerima.replace(/\s/g, "")))
        errs.noKpPenerima = "Format tidak sah (cth: 900101-14-5678)";
      if (!form.alamatPenerima.trim()) errs.alamatPenerima = "Alamat diperlukan";
      if (!form.negeriPenerima) errs.negeriPenerima = "Negeri diperlukan";
      if (!form.daerahPenerima.trim()) errs.daerahPenerima = "Daerah diperlukan";
      if (!form.telefonPenerima.trim()) errs.telefonPenerima = "Telefon diperlukan";
    } else if (s === 2) {
      const p = Number(form.pendapatanIsiRumah);
      if (!form.pendapatanIsiRumah || isNaN(p) || p < 0)
        errs.pendapatanIsiRumah = "Pendapatan mesti nombor positif";
      const t = Number(form.bilanganTanggungan);
      if (form.bilanganTanggungan === "" || isNaN(t) || t < 0)
        errs.bilanganTanggungan = "Tanggungan mesti nombor positif";
      if (form.statusOku && !form.jenisOku.trim())
        errs.jenisOku = "Jenis OKU diperlukan";
    } else if (s === 3) {
      if (trek === "bantuan_perumahan") {
        if (!form.zonMukim.trim()) errs.zonMukim = "Zon/Mukim diperlukan";
        const v = Number(form.nilaiAnggaranKerja);
        if (!form.nilaiAnggaranKerja || isNaN(v) || v <= 0)
          errs.nilaiAnggaranKerja = "Nilai mesti positif";
      } else {
        if (!form.kawasanOperasi.trim()) errs.kawasanOperasi = "Kawasan operasi diperlukan";
        if (!form.cadanganPelanGuna.trim()) errs.cadanganPelanGuna = "Cadangan pelan diperlukan";
        const v = Number(form.nilaiGeranDipohon);
        if (!form.nilaiGeranDipohon || isNaN(v) || v <= 0)
          errs.nilaiGeranDipohon = "Nilai mesti positif";
        if (form.kategoriBantuan === "geran_ekonomi" && !form.namaPerniagaan.trim())
          errs.namaPerniagaan = "Nama perniagaan diperlukan untuk geran ekonomi";
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function next() {
    if (validateStep(step)) setStep((s) => Math.min(5, s + 1));
  }
  function prev() {
    setStep((s) => Math.max(1, s - 1));
  }

  function handleFileSelect(jenis: JenisDokumen, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingDocs((arr) => [
      ...arr.filter((d) => d.jenisDokumen !== jenis),
      {
        jenisDokumen: jenis,
        namaFail: file.name,
        saizFail: file.size,
        jenisMime: file.type || "application/octet-stream",
      },
    ]);
    toast.success(`Fail '${file.name}' dipilih untuk ${JENIS_DOK_LABELS[jenis]}`);
  }

  function removeDoc(jenis: JenisDokumen) {
    setPendingDocs((arr) => arr.filter((d) => d.jenisDokumen !== jenis));
  }

  async function handleSubmit(mode: "draft" | "submit") {
    if (!user) {
      toast.error("Pengguna tidak log masuk.");
      return;
    }
    setSubmitting(true);
    setSubmitMode(mode);
    try {
      const kategori = ensureKategori();
      const body = {
        trek,
        entitiPemohonJenis: trek === "geran_pekb" ? "ngo" : "pbt",
        disediakanOlehPenggunaId: user.id,
        namaPenerima: form.namaPenerima.trim(),
        noKpPenerima: form.noKpPenerima.trim(),
        alamatPenerima: form.alamatPenerima.trim(),
        negeriPenerima: form.negeriPenerima,
        daerahPenerima: form.daerahPenerima.trim(),
        telefonPenerima: form.telefonPenerima.trim(),
        pendapatanIsiRumah: Number(form.pendapatanIsiRumah) || 0,
        bilanganTanggungan: Number(form.bilanganTanggungan) || 0,
        statusOku: form.statusOku,
        jenisOku: form.jenisOku.trim(),
        statusPemilikanRumah: form.statusPemilikanRumah,
        jenisRumah: form.jenisRumah,
        kategoriBantuan: kategori,
        zonMukim: form.zonMukim.trim(),
        noRujukanPemeriksaan: form.noRujukanPemeriksaan.trim(),
        nilaiAnggaranKerja: Number(form.nilaiAnggaranKerja) || 0,
        kawasanOperasi: form.kawasanOperasi.trim(),
        cadanganPelanGuna: form.cadanganPelanGuna.trim(),
        nilaiGeranDipohon: Number(form.nilaiGeranDipohon) || 0,
        namaPerniagaan: form.namaPerniagaan.trim(),
        jenisPerniagaan: form.jenisPerniagaan.trim(),
        submit: mode === "submit",
      };
      const res = await api.post<{ application: { applicationId: string; noRujukan: string }; message: string }>(
        "/api/applications", body
      );
      const newId = res.application.applicationId;

      // Upload pending docs (if any)
      if (pendingDocs.length > 0) {
        await Promise.all(
          pendingDocs.map((d) =>
            api.post("/api/documents", {
              applicationId: newId,
              jenisDokumen: d.jenisDokumen,
              namaFail: d.namaFail,
              saizFail: d.saizFail,
              jenisMime: d.jenisMime,
            }).catch(() => { /* tolerate */ })
          )
        );
      }

      toast.success(
        mode === "submit"
          ? `Permohonan ${res.application.noRujukan} berjaya dihantar.`
          : `Draf ${res.application.noRujukan} disimpan.`
      );
      setActiveApplication(newId);
      setView("application-detail");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan permohonan.");
    } finally {
      setSubmitting(false);
      setSubmitMode(null);
    }
  }

  const kategori = ensureKategori();
  const docRequirements = requiredDocsForTrek(trek, form.kategoriBantuan, form.statusOku);
  const allRequiredDocsUploaded = docRequirements
    .filter((d) => d.required)
    .every((d) => pendingDocs.some((pd) => pd.jenisDokumen === d.jenis));
  const progress = (step / 5) * 100;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gradient-primary">Permohonan Baharu</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Lengkapkan maklumat permohonan bantuan PEKB mengikut trek.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TrekBadge trek={trek} />
          <Button variant="ghost" size="sm" onClick={() => setView("applications")} className="gap-1">
            <X className="w-4 h-4" /> Batal
          </Button>
        </div>
      </div>

      {/* Stepper */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-2 overflow-x-auto scrollbar-thin">
            {STEPS.map((s, idx) => {
              const Icon = s.icon;
              const isActive = s.id === step;
              const isDone = s.id < step;
              return (
                <div key={s.id} className="flex items-center gap-2 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => s.id < step && setStep(s.id)}
                    disabled={s.id > step}
                    className={`flex items-center gap-2 transition-all ${
                      isActive ? "opacity-100" : isDone ? "opacity-90 hover:opacity-100 cursor-pointer" : "opacity-50"
                    }`}
                  >
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all ${
                        isActive
                          ? "bg-primary text-primary-foreground border-primary shadow-md"
                          : isDone
                          ? "bg-emerald-500 text-white border-emerald-500"
                          : "bg-background text-muted-foreground border-border"
                      }`}
                    >
                      {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                    </div>
                    <div className="hidden sm:block text-left">
                      <div className="text-[10px] text-muted-foreground leading-none">Langkah {s.id}</div>
                      <div className={`text-xs font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                        {s.label}
                      </div>
                    </div>
                  </button>
                  {idx < STEPS.length - 1 && (
                    <div className={`w-6 sm:w-10 h-px ${s.id < step ? "bg-emerald-500" : "bg-border"}`} />
                  )}
                </div>
              );
            })}
          </div>
          <Progress value={progress} className="mt-3 h-1" />
        </CardContent>
      </Card>

      {/* Step content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -10 }}
          transition={{ duration: 0.2 }}
        >
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                {STEPS[step - 1].icon && (() => {
                  const Icon = STEPS[step - 1].icon;
                  return <Icon className="w-5 h-5 text-primary" />;
                })()}
                {step === 1 && "Maklumat Penerima"}
                {step === 2 && "Maklumat Isi Rumah"}
                {step === 3 && "Kategori Bantuan"}
                {step === 4 && "Muat Naik Dokumen"}
                {step === 5 && "Semakan & Penghantaran"}
              </CardTitle>
              <CardDescription>
                {step === 1 && "Maklumat asas penerima bantuan."}
                {step === 2 && "Maklumat kelayakan isi rumah."}
                {step === 3 && `Pilih kategori bantuan untuk ${trek === "bantuan_perumahan" ? "Trek 1 (PBT)" : "Trek 2 (NGO)"}.`}
                {step === 4 && "Muat naik dokumen sokongan yang diperlukan."}
                {step === 5 && "Semak maklumat sebelum dihantar."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {step === 1 && <Step1 form={form} errors={errors} set={set} />}
              {step === 2 && <Step2 form={form} errors={errors} set={set} />}
              {step === 3 && (
                <Step3
                  trek={trek}
                  form={form}
                  errors={errors}
                  set={set}
                />
              )}
              {step === 4 && (
                <Step4
                  docRequirements={docRequirements}
                  pendingDocs={pendingDocs}
                  onSelect={handleFileSelect}
                  onRemove={removeDoc}
                />
              )}
              {step === 5 && (
                <Step5
                  trek={trek}
                  form={form}
                  kategori={kategori}
                  pendingDocs={pendingDocs}
                />
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation buttons */}
      <div className="flex flex-col sm:flex-row gap-2 sm:justify-between">
        <Button
          variant="outline"
          onClick={prev}
          disabled={step === 1 || submitting}
          className="gap-1"
        >
          <ChevronLeft className="w-4 h-4" /> Sebelumnya
        </Button>

        <div className="flex flex-col sm:flex-row gap-2">
          {step < 4 ? (
            <Button onClick={next} className="gap-1">
              Seterusnya <ChevronRight className="w-4 h-4" />
            </Button>
          ) : step === 4 ? (
            <>
              <Button variant="outline" onClick={() => setStep(5)} className="gap-1">
                Langkau <ChevronRight className="w-4 h-4" />
              </Button>
              <Button onClick={next} className="gap-1">
                Seterusnya <ChevronRight className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={submitting || (submitMode !== null)}
                onClick={() => handleSubmit("draft")}
                className="gap-1"
              >
                {submitMode === "draft" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Simpan Draf
              </Button>
              <Button
                onClick={() => handleSubmit("submit")}
                disabled={submitting || (submitMode !== null)}
                className="gap-1"
              >
                {submitMode === "submit" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Hantar Permohonan
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Doc warning on step 5 */}
      {step === 5 && !allRequiredDocsUploaded && (
        <Card className="glass-card border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20">
          <CardContent className="p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Sesetengah dokumen wajib belum dimuat naik. Anda masih boleh menghantar, tetapi
              pemprosesan mungkin tergendala.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============ Step Components ============

function Step1({
  form, errors, set,
}: {
  form: FormState;
  errors: Record<string, string>;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Nama Penerima" required error={errors.namaPenerima}>
        <Input value={form.namaPenerima} onChange={(e) => set("namaPenerima", e.target.value)} placeholder="Nama penuh" />
      </Field>
      <Field label="No. Kad Pengenalan" required error={errors.noKpPenerima}>
        <Input value={form.noKpPenerima} onChange={(e) => set("noKpPenerima", e.target.value)} placeholder="900101-14-5678" className="font-mono" />
      </Field>
      <Field label="Alamat" required error={errors.alamatPenerima} full>
        <Textarea value={form.alamatPenerima} onChange={(e) => set("alamatPenerima", e.target.value)} placeholder="Alamat penuh penerima" rows={2} />
      </Field>
      <Field label="Negeri" required error={errors.negeriPenerima}>
        <Select value={form.negeriPenerima} onValueChange={(v) => set("negeriPenerima", v)}>
          <SelectTrigger className="w-full"><SelectValue placeholder="Pilih negeri" /></SelectTrigger>
          <SelectContent>
            {NEGERI_LIST.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
          </SelectContent>
        </Select>
      </Field>
      <Field label="Daerah" required error={errors.daerahPenerima}>
        <Input value={form.daerahPenerima} onChange={(e) => set("daerahPenerima", e.target.value)} placeholder="Daerah" />
      </Field>
      <Field label="No. Telefon" required error={errors.telefonPenerima}>
        <Input value={form.telefonPenerima} onChange={(e) => set("telefonPenerima", e.target.value)} placeholder="012-3456789" className="font-mono" />
      </Field>
    </div>
  );
}

function Step2({
  form, errors, set,
}: {
  form: FormState;
  errors: Record<string, string>;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Pendapatan Isi Rumah Sebulan (RM)" required error={errors.pendapatanIsiRumah}>
          <Input
            type="number" min="0" step="50"
            value={form.pendapatanIsiRumah}
            onChange={(e) => set("pendapatanIsiRumah", e.target.value)}
            placeholder="0"
          />
          <p className="text-[10px] text-muted-foreground mt-1">
            B40: ≤ RM4,850 · Miskin Tegar: ≤ RM1,169
          </p>
        </Field>
        <Field label="Bilangan Tanggungan" required error={errors.bilanganTanggungan}>
          <Input
            type="number" min="0" step="1"
            value={form.bilanganTanggungan}
            onChange={(e) => set("bilanganTanggungan", e.target.value)}
            placeholder="0"
          />
        </Field>
      </div>

      <div className="rounded-lg border border-border/40 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-sm font-medium">Status OKU</Label>
            <p className="text-[11px] text-muted-foreground">Tandakan jika penerima berstatus OKU</p>
          </div>
          <Switch checked={form.statusOku} onCheckedChange={(v) => set("statusOku", v)} />
        </div>
        {form.statusOku && (
          <Field label="Jenis OKU" required error={errors.jenisOku}>
            <Select value={form.jenisOku} onValueChange={(v) => set("jenisOku", v)}>
              <SelectTrigger className="w-full"><SelectValue placeholder="Pilih jenis OKU" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="penglihatan">Penglihatan</SelectItem>
                <SelectItem value="pendengaran">Pendengaran</SelectItem>
                <SelectItem value="fizikal">Fizikal</SelectItem>
                <SelectItem value="mental">Mental</SelectItem>
                <SelectItem value="pembelajaran">Pembelajaran</SelectItem>
                <SelectItem value="pelbagai">Pelbagai Kecacatan</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Status Pemilikan Rumah">
          <Select value={form.statusPemilikanRumah} onValueChange={(v) => set("statusPemilikanRumah", v)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {PEMILIKAN_OPTS.map((p) => <SelectItem key={p} value={p}>{p.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Jenis Rumah">
          <Select value={form.jenisRumah} onValueChange={(v) => set("jenisRumah", v)}>
            <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              {JENIS_RUMAH_OPTS.map((p) => <SelectItem key={p} value={p}>{p.replace(/_/g, " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
      </div>
    </div>
  );
}

function Step3({
  trek, form, errors, set,
}: {
  trek: Trek;
  form: FormState;
  errors: Record<string, string>;
  set: <K extends keyof FormState>(k: K, v: FormState[K]) => void;
}) {
  const kategoriOpts: KategoriBantuan[] = trek === "bantuan_perumahan"
    ? ["baik_pulih_rumah", "rumah_mesra_rakyat"]
    : ["geran_ekonomi", "bantuan_sara_hidup"];

  return (
    <div className="space-y-4">
      <Field label="Kategori Bantuan" required>
        <RadioGroup
          value={form.kategoriBantuan || kategoriOpts[0]}
          onValueChange={(v) => set("kategoriBantuan", v as KategoriBantuan)}
          className="grid grid-cols-1 sm:grid-cols-2 gap-2"
        >
          {kategoriOpts.map((k) => (
            <label
              key={k}
              htmlFor={`kat-${k}`}
              className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                (form.kategoriBantuan || kategoriOpts[0]) === k
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <RadioGroupItem value={k} id={`kat-${k}`} className="mt-0.5" />
              <div>
                <div className="text-sm font-medium">{KATEGORI_LABELS[k]}</div>
                <div className="text-[11px] text-muted-foreground">
                  {k === "baik_pulih_rumah" && "Baik pulih rumah kediaman sedia ada."}
                  {k === "rumah_mesra_rakyat" && "Pembinaan rumah baharu untuk penyewa."}
                  {k === "geran_ekonomi" && "Geran mikro-usahawan B40."}
                  {k === "bantuan_sara_hidup" && "Bantuan sara hidup kecemasan."}
                </div>
              </div>
            </label>
          ))}
        </RadioGroup>
      </Field>

      {trek === "bantuan_perumahan" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Zon / Mukim" required error={errors.zonMukim}>
            <Input value={form.zonMukim} onChange={(e) => set("zonMukim", e.target.value)} placeholder="Cth: Mukim Petaling" />
          </Field>
          <Field label="No. Rujukan Pemeriksaan Tapak">
            <Input value={form.noRujukanPemeriksaan} onChange={(e) => set("noRujukanPemeriksaan", e.target.value)} placeholder="Cth: PBT/SM/2026/001" className="font-mono" />
          </Field>
          <Field label="Nilai Anggaran Kerja (RM)" required error={errors.nilaiAnggaranKerja} full>
            <Input
              type="number" min="1" step="100"
              value={form.nilaiAnggaranKerja}
              onChange={(e) => set("nilaiAnggaranKerja", e.target.value)}
              placeholder="0"
            />
          </Field>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Kawasan Operasi" required error={errors.kawasanOperasi}>
            <Input value={form.kawasanOperasi} onChange={(e) => set("kawasanOperasi", e.target.value)} placeholder="Cth: Bandar Baru Bangi" />
          </Field>
          <Field label="Nilai Geran Dipohon (RM)" required error={errors.nilaiGeranDipohon}>
            <Input
              type="number" min="1" step="100"
              value={form.nilaiGeranDipohon}
              onChange={(e) => set("nilaiGeranDipohon", e.target.value)}
              placeholder="0"
            />
          </Field>
          {(form.kategoriBantuan === "geran_ekonomi" || (!form.kategoriBantuan && trek === "geran_pekb")) && (
            <>
              <Field label="Nama Perniagaan" required={form.kategoriBantuan === "geran_ekonomi"} error={errors.namaPerniagaan}>
                <Input value={form.namaPerniagaan} onChange={(e) => set("namaPerniagaan", e.target.value)} placeholder="Cth: Kedai Runcit Mak Limah" />
              </Field>
              <Field label="Jenis Perniagaan">
                <Input value={form.jenisPerniagaan} onChange={(e) => set("jenisPerniagaan", e.target.value)} placeholder="Cth: Peruncitan" />
              </Field>
            </>
          )}
          <Field label="Cadangan Penggunaan Geran" required error={errors.cadanganPelanGuna} full>
            <Textarea value={form.cadanganPelanGuna} onChange={(e) => set("cadanganPelanGuna", e.target.value)} placeholder="Huraikan bagaimana geran akan digunakan..." rows={3} />
          </Field>
        </div>
      )}
    </div>
  );
}

function Step4({
  docRequirements, pendingDocs, onSelect, onRemove,
}: {
  docRequirements: { jenis: JenisDokumen; required: boolean }[];
  pendingDocs: PendingDoc[];
  onSelect: (jenis: JenisDokumen, e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: (jenis: JenisDokumen) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-start gap-2">
        <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
        <p className="text-xs text-muted-foreground">
          Muat naik dokumen sokongan yang diperlukan. Fail yang dimuat naik akan direkodkan
          dan disahkan oleh AI selepas permohonan dihantar.
        </p>
      </div>
      <div className="space-y-2">
        {docRequirements.map((req) => {
          const doc = pendingDocs.find((d) => d.jenisDokumen === req.jenis);
          const isUploaded = Boolean(doc);
          return (
            <div
              key={req.jenis}
              className={`rounded-lg border p-3 flex flex-col sm:flex-row sm:items-center gap-3 transition-all ${
                isUploaded ? "border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/10" : "border-border/40"
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isUploaded ? "bg-emerald-500/15" : "bg-muted"
              }`}>
                {isUploaded ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium">{JENIS_DOK_LABELS[req.jenis]}</span>
                  {req.required ? (
                    <Badge variant="outline" className="text-[10px] bg-red-50 text-red-700 border-red-200">Wajib</Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px]">Pilihan</Badge>
                  )}
                </div>
                {doc ? (
                  <div className="text-[11px] text-muted-foreground mt-0.5">
                    {doc.namaFail} · {(doc.saizFail / 1024).toFixed(0)} KB
                  </div>
                ) : (
                  <div className="text-[11px] text-muted-foreground mt-0.5">Belum dimuat naik</div>
                )}
              </div>
              <div className="flex gap-1.5">
                {doc ? (
                  <Button variant="ghost" size="sm" className="gap-1 text-destructive" onClick={() => onRemove(req.jenis)}>
                    <X className="w-3.5 h-3.5" /> Buang
                  </Button>
                ) : null}
                <Button
                  variant={isUploaded ? "outline" : "default"}
                  size="sm"
                  className="gap-1"
                  asChild
                >
                  <label className="cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    {isUploaded ? "Tukar" : "Pilih Fail"}
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => onSelect(req.jenis, e)}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                  </label>
                </Button>
              </div>
            </div>
          );
        })}
        <label
          htmlFor="upload-lain"
          className="block mt-2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
        >
          + Tambah dokumen lain-lain
          <input
            id="upload-lain"
            type="file"
            className="hidden"
            onChange={(e) => onSelect("lain_lain", e)}
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          />
        </label>
      </div>
    </div>
  );
}

function Step5({
  trek, form, kategori, pendingDocs,
}: {
  trek: Trek;
  form: FormState;
  kategori: KategoriBantuan;
  pendingDocs: PendingDoc[];
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg bg-accent/5 border border-accent/20 p-3 flex items-start gap-2">
        <FileCheck className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
        <p className="text-xs">
          Sila semak maklumat di bawah. Tekan <strong>Simpan Draf</strong> untuk simpan sementara,
          atau <strong>Hantar Permohonan</strong> untuk hantar serta-mula.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <ReviewCard title="Penerima" icon={User}>
          <ReviewItem label="Nama" value={form.namaPenerima} />
          <ReviewItem label="No. KP" value={form.noKpPenerima} mono />
          <ReviewItem label="Negeri" value={form.negeriPenerima} />
          <ReviewItem label="Daerah" value={form.daerahPenerima} />
          <ReviewItem label="Telefon" value={form.telefonPenerima} mono />
          <ReviewItem label="Alamat" value={form.alamatPenerima} full />
        </ReviewCard>

        <ReviewCard title="Isi Rumah" icon={Home}>
          <ReviewItem label="Pendapatan" value={formatRM(Number(form.pendapatanIsiRumah) || 0)} />
          <ReviewItem label="Tanggungan" value={`${form.bilanganTanggungan} orang`} />
          <ReviewItem label="OKU" value={form.statusOku ? `Ya — ${form.jenisOku || "-"}` : "Tidak"} />
          <ReviewItem label="Pemilikan" value={form.statusPemilikanRumah.replace(/_/g, " ")} />
          <ReviewItem label="Jenis Rumah" value={form.jenisRumah.replace(/_/g, " ")} />
        </ReviewCard>

        <ReviewCard title={`Kategori Bantuan (${trek === "bantuan_perumahan" ? "Trek 1 · PBT" : "Trek 2 · NGO"})`} icon={FileText}>
          <ReviewItem label="Kategori" value={KATEGORI_LABELS[kategori]} />
          {trek === "bantuan_perumahan" ? (
            <>
              <ReviewItem label="Zon / Mukim" value={form.zonMukim} />
              <ReviewItem label="No. Rujukan Pemeriksaan" value={form.noRujukanPemeriksaan || "-"} mono />
              <ReviewItem label="Anggaran Kerja" value={formatRM(Number(form.nilaiAnggaranKerja) || 0)} />
            </>
          ) : (
            <>
              <ReviewItem label="Kawasan Operasi" value={form.kawasanOperasi} />
              <ReviewItem label="Nilai Geran" value={formatRM(Number(form.nilaiGeranDipohon) || 0)} />
              <ReviewItem label="Nama Perniagaan" value={form.namaPerniagaan || "-"} />
              <ReviewItem label="Jenis Perniagaan" value={form.jenisPerniagaan || "-"} />
              <ReviewItem label="Cadangan Guna" value={form.cadanganPelanGuna} full />
            </>
          )}
        </ReviewCard>

        <ReviewCard title="Dokumen" icon={Upload}>
          {pendingDocs.length === 0 ? (
            <p className="text-xs text-muted-foreground">Tiada dokumen dipilih.</p>
          ) : (
            <ul className="space-y-1.5">
              {pendingDocs.map((d) => (
                <li key={d.jenisDokumen} className="text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
                  <span className="font-medium">{JENIS_DOK_LABELS[d.jenisDokumen]}</span>
                  <span className="text-muted-foreground truncate">· {d.namaFail}</span>
                </li>
              ))}
            </ul>
          )}
        </ReviewCard>
      </div>
    </div>
  );
}

// ============ Helper Components ============

function Field({
  label, children, required, error, full,
}: {
  label: string;
  children: React.ReactNode;
  required?: boolean;
  error?: string;
  full?: boolean;
}) {
  return (
    <div className={`space-y-1.5 ${full ? "sm:col-span-2" : ""}`}>
      <Label className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {error && (
        <p className="text-[11px] text-destructive flex items-center gap-1">
          <AlertCircle className="w-3 h-3" /> {error}
        </p>
      )}
    </div>
  );
}

function ReviewCard({
  title, icon: Icon, children,
}: {
  title: string;
  icon: typeof User;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/40 p-3 space-y-2 bg-card/50">
      <div className="flex items-center gap-2 pb-1 border-b border-border/40">
        <Icon className="w-4 h-4 text-primary" />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function ReviewItem({
  label, value, mono, full,
}: { label: string; value: string; mono?: boolean; full?: boolean }) {
  return (
    <div className={`grid grid-cols-3 gap-2 text-xs ${full ? "col-span-full" : ""}`}>
      <div className="text-muted-foreground">{label}</div>
      <div className={`col-span-2 font-medium ${mono ? "font-mono" : ""}`}>{value || "-"}</div>
    </div>
  );
}
