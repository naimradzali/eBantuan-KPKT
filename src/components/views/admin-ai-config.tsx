"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Cpu, Save, Loader2, ShieldCheck, Sparkles, FileCheck2, CopyCheck,
  MessageSquare, PlayCircle, Brain, AlertCircle, Settings2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import type { AiConfig } from "@/lib/types";

interface ModuleCard {
  key: "screening" | "docVerify" | "chatbot" | "fraud";
  icon: typeof Sparkles;
  title: string;
  description: string;
  enableField: keyof Pick<AiConfig, "enableAiScreening" | "enableAiDocVerify" | "enableAiChatbot" | "enableAiFraud">;
  color: string;
  iconBg: string;
}

const MODULES: ModuleCard[] = [
  {
    key: "screening",
    icon: Sparkles,
    title: "Penyaringan Kelayakan AI",
    description: "Skor automatik kelayakan pemohon berdasarkan kriteria B40 / Miskin Tegar / OKU / tanggungan. Skor digunakan oleh pegawai penilai sebagai panduan.",
    enableField: "enableAiScreening",
    color: "text-purple-700 dark:text-purple-300",
    iconBg: "bg-purple-100 dark:bg-purple-900/40",
  },
  {
    key: "docVerify",
    icon: FileCheck2,
    title: "Pengesahan Dokumen (VLM)",
    description: "Pengesahan dokumen sokongan menggunakan model penglihatan GLM-4.6v untuk mengesan MyKad, slip gaji, geran tanah dan dokumen lain secara automatik.",
    enableField: "enableAiDocVerify",
    color: "text-teal-700 dark:text-teal-300",
    iconBg: "bg-teal-100 dark:bg-teal-900/40",
  },
  {
    key: "fraud",
    icon: CopyCheck,
    title: "Pengesanan Pertindihan",
    description: "Mengesan permohonan pertindihan merentas Trek (PBT vs NGO) menggunakan padanan No. KP, alamat & nama. Menandakan status: tiada / disyaki / disahkan pertindihan.",
    enableField: "enableAiFraud",
    color: "text-rose-700 dark:text-rose-300",
    iconBg: "bg-rose-100 dark:bg-rose-900/40",
  },
  {
    key: "chatbot",
    icon: MessageSquare,
    title: "Chatbot PEKB Assistant",
    description: "Pembantu maya GLM-4.5 untuk membantu pengguna & pemohon memahami kriteria kelayakan, dokumen, status permohonan dan perbezaan Trek.",
    enableField: "enableAiChatbot",
    color: "text-sky-700 dark:text-sky-300",
    iconBg: "bg-sky-100 dark:bg-sky-900/40",
  },
];

export function AdminAiConfigView() {
  const [config, setConfig] = useState<AiConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [ambangLulus, setAmbangLulus] = useState(70);
  const [ambangSemak, setAmbangSemak] = useState(50);
  const [enableScreening, setEnableScreening] = useState(true);
  const [enableDocVerify, setEnableDocVerify] = useState(true);
  const [enableChatbot, setEnableChatbot] = useState(true);
  const [enableFraud, setEnableFraud] = useState(true);

  const fetchConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cfg = await api.get<AiConfig>("/api/ai/config");
      setConfig(cfg);
      setAmbangLulus(cfg.ambangSkorLulus);
      setAmbangSemak(cfg.ambangSkorSemak);
      setEnableScreening(cfg.enableAiScreening);
      setEnableDocVerify(cfg.enableAiDocVerify);
      setEnableChatbot(cfg.enableAiChatbot);
      setEnableFraud(cfg.enableAiFraud);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuatkan konfigurasi AI");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const save = async () => {
    if (ambangLulus < 0 || ambangLulus > 100 || ambangSemak < 0 || ambangSemak > 100) {
      toast.error("Ambang skor mesti antara 0 dan 100");
      return;
    }
    if (ambangSemak >= ambangLulus) {
      toast.error("Ambang Semak mesti lebih rendah daripada Ambang Lulus");
      return;
    }
    setSaving(true);
    try {
      const updated = await api.patch<AiConfig>("/api/ai/config", {
        ambangSkorLulus: ambangLulus,
        ambangSkorSemak: ambangSemak,
        enableAiScreening: enableScreening,
        enableAiDocVerify: enableDocVerify,
        enableAiChatbot: enableChatbot,
        enableAiFraud: enableFraud,
      });
      setConfig(updated);
      toast.success("Konfigurasi AI disimpan", {
        description: `Ambang Lulus: ${updated.ambangSkorLulus} · Ambang Semak: ${updated.ambangSkorSemak}`,
      });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan konfigurasi");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (error || !config) {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-10 h-10 mx-auto text-destructive mb-2" />
        <p className="text-destructive font-medium">{error || "Konfigurasi tidak tersedia"}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={fetchConfig}>Cuba Semula</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gradient-primary flex items-center gap-2">
          <Cpu className="w-7 h-7 text-primary" />
          Konfigurasi Modul AI
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Urus ambang skor dan aktifkan / nyahaktifkan modul AI sistem eBantuan-PEKB (PRD §12.2).
        </p>
      </motion.div>

      {/* Current config card */}
      <Card className="glass-card border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Settings2 className="w-5 h-5 text-primary" />
            Konfigurasi Semasa
          </CardTitle>
          <CardDescription>
            Model AI: <Badge variant="outline" className="font-mono ml-1">{config.modelAi}</Badge>
            <span className="ml-2 text-xs">Dikemaskini: {new Date().toLocaleDateString("ms-MY")}</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <ConfigTile label="Ambang Lulus" value={`${config.ambangSkorLulus}`} suffix="skor" tone="emerald" />
            <ConfigTile label="Ambang Semak" value={`${config.ambangSkorSemak}`} suffix="skor" tone="amber" />
            <ConfigTile label="Screening" value={config.enableAiScreening ? "AKTIF" : "MATI"} tone={config.enableAiScreening ? "emerald" : "muted"} />
            <ConfigTile label="Doc Verify" value={config.enableAiDocVerify ? "AKTIF" : "MATI"} tone={config.enableAiDocVerify ? "emerald" : "muted"} />
            <ConfigTile label="Chatbot" value={config.enableAiChatbot ? "AKTIF" : "MATI"} tone={config.enableAiChatbot ? "emerald" : "muted"} />
            <ConfigTile label="Fraud Detect" value={config.enableAiFraud ? "AKTIF" : "MATI"} tone={config.enableAiFraud ? "emerald" : "muted"} />
          </div>
        </CardContent>
      </Card>

      {/* Editable form */}
      <Card className="glass-card border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="w-5 h-5 text-primary" />
            Ambang Skor & Penyahaktifan Modul
          </CardTitle>
          <CardDescription>
            Tetapkan ambang skor cadangan AI dan aktifkan / nyahaktifkan modul mengikut keperluan operasi.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="glass rounded-lg p-4 border border-border/40">
              <Label htmlFor="ambangLulus" className="text-sm font-medium">Ambang Skor Lulus</Label>
              <p className="text-xs text-muted-foreground mb-2">Skor ≥ nilai ini akan dapat cadangan <span className="text-emerald-700 font-medium">LULUS</span></p>
              <div className="relative">
                <Input
                  id="ambangLulus"
                  type="number"
                  min={0}
                  max={100}
                  value={ambangLulus}
                  onChange={(e) => setAmbangLulus(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  className="pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">/ 100</span>
              </div>
            </div>
            <div className="glass rounded-lg p-4 border border-border/40">
              <Label htmlFor="ambangSemak" className="text-sm font-medium">Ambang Skor Semak Semula</Label>
              <p className="text-xs text-muted-foreground mb-2">Skor ≥ nilai ini (tetapi &lt; ambang lulus) akan dapat cadangan <span className="text-amber-700 font-medium">SEMAK SEMULA</span></p>
              <div className="relative">
                <Input
                  id="ambangSemak"
                  type="number"
                  min={0}
                  max={100}
                  value={ambangSemak}
                  onChange={(e) => setAmbangSemak(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  className="pr-10"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">/ 100</span>
              </div>
            </div>
          </div>

          {/* Live preview of score ranges */}
          <div className="glass rounded-lg p-3 border border-border/40">
            <p className="text-xs font-semibold text-muted-foreground mb-2">Pratampak Julat Skor:</p>
            <div className="flex h-8 rounded overflow-hidden text-xs font-medium">
              <div className="bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-200 flex items-center justify-center flex-1 border-r border-border/40">
                0 – {ambangSemak - 1} · TOLAK
              </div>
              <div className="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-200 flex items-center justify-center flex-1 border-r border-border/40">
                {ambangSemak} – {ambangLulus - 1} · SEMAK
              </div>
              <div className="bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200 flex items-center justify-center flex-1">
                {ambangLulus} – 100 · LULUS
              </div>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <ToggleRow
              label="AI Screening (Penyaringan Kelayakan)"
              description="Skor automatik kelayakan pemohon"
              checked={enableScreening}
              onCheck={setEnableScreening}
            />
            <ToggleRow
              label="AI Doc Verify (VLM)"
              description="Pengesahan dokumen sokongan"
              checked={enableDocVerify}
              onCheck={setEnableDocVerify}
            />
            <ToggleRow
              label="AI Chatbot (PEKB Assistant)"
              description="Chatbot GLM-4.5 untuk pengguna"
              checked={enableChatbot}
              onCheck={setEnableChatbot}
            />
            <ToggleRow
              label="AI Fraud Detection"
              description="Pengesanan pertindihan permohonan"
              checked={enableFraud}
              onCheck={setEnableFraud}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={fetchConfig} disabled={saving}>Batal</Button>
            <Button onClick={save} disabled={saving} className="bg-gradient-to-r from-primary to-accent text-white">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : <><Save className="w-4 h-4 mr-2" /> Simpan Konfigurasi</>}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* AI module cards */}
      <div>
        <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-accent" /> Modul AI
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {MODULES.map((m, idx) => {
            const Icon = m.icon;
            const enabled = m.enableField === "enableAiScreening" ? enableScreening
              : m.enableField === "enableAiDocVerify" ? enableDocVerify
              : m.enableField === "enableAiChatbot" ? enableChatbot
              : enableFraud;
            return (
              <motion.div
                key={m.key}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="glass-card border-border/40 h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg ${m.iconBg} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${m.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold text-sm">{m.title}</h3>
                          <Badge variant="outline" className={enabled ? "bg-emerald-100 text-emerald-700 border-emerald-200" : "bg-muted text-muted-foreground"}>
                            {enabled ? "AKTIF" : "MATI"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{m.description}</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-3"
                          onClick={() => toast.info(`Menguji modul ${m.title}...`, { description: "Ujian dijalankan menggunakan konfigurasi semasa." })}
                        >
                          <PlayCircle className="w-3.5 h-3.5 mr-1.5" /> Uji Modul
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Governance notice */}
      <Card className="glass-card border-primary/30 bg-primary/5">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <ShieldCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold flex items-center gap-2">
                Tadbir Urus AI — Human-in-the-Loop
                <Badge variant="outline" className="text-[10px]">PRD §7.6</Badge>
              </h3>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                Cadangan AI (skor kelayakan, pengesahan dokumen, pengesanan pertindihan) adalah <strong>panduan sahaja</strong> dan
                tidak menggantikan keputusan pegawai penilai. Setiap keputusan akhir kelulusan / penolakan / pemulangan
                memerlukan semakan dan pengesahan oleh pegawai KPKT yang bertanggungjawab. AI digunakan untuk mempercepat
                penyaringan, bukan membuat keputusan akhir.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline" className="text-[10px] bg-background">PDPA 2010</Badge>
                <Badge variant="outline" className="text-[10px] bg-background">Mampu Audit</Badge>
                <Badge variant="outline" className="text-[10px] bg-background">Tidak Berat Sebelah</Badge>
                <Badge variant="outline" className="text-[10px] bg-background">Boleh Diterangkan</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ConfigTile({ label, value, suffix, tone }: { label: string; value: string; suffix?: string; tone: "emerald" | "amber" | "muted" }) {
  const toneCls = tone === "emerald" ? "text-emerald-700 dark:text-emerald-300"
    : tone === "amber" ? "text-amber-700 dark:text-amber-300"
    : "text-muted-foreground";
  return (
    <div className="glass rounded-lg p-3 border border-border/40 text-center">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold ${toneCls} mt-1`}>{value}</div>
      {suffix && <div className="text-[10px] text-muted-foreground">{suffix}</div>}
    </div>
  );
}

function ToggleRow({ label, description, checked, onCheck }: {
  label: string;
  description: string;
  checked: boolean;
  onCheck: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between glass rounded-lg p-3 border border-border/40">
      <div className="pr-3">
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheck} />
    </div>
  );
}
