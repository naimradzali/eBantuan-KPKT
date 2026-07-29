"use client";

import { useEffect, useState, useCallback } from "react";
import {
  ArrowLeft, FileText, User, Home, Building2, FileCheck, ListChecks,
  Sparkles, RefreshCw, CheckCircle2, XCircle, Undo2, ArrowUpCircle,
  Clock, Loader2, AlertCircle, FileSearch, ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api-client";
import { useAppStore, useRoleAccess } from "@/lib/store";
import {
  type Application, type Document, type AuditLog, type EligibilityResult,
  type DecisionSupportResult,
  formatRM, formatDate, formatDateTime, maskIC,
  JENIS_DOK_LABELS, KATEGORI_LABELS,
} from "@/lib/types";
import {
  StatusBadge, KategoriBadge, TrekBadge, SkorIndicator, PertindihanBadge, PengesahanBadge,
} from "@/components/shared/badges";
import { toast } from "sonner";

export function ApplicationDetailView() {
  const activeApplicationId = useAppStore((s) => s.activeApplicationId);
  const setView = useAppStore((s) => s.setView);
  const user = useAppStore((s) => s.user);
  const { canReview } = useRoleAccess();

  const [app, setApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Review state
  const [notaPenilai, setNotaPenilai] = useState("");
  const [alasanPenolakan, setAlasanPenolakan] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);

  // AI analysis state
  const [aiLoading, setAiLoading] = useState(false);
  const [decision, setDecision] = useState<DecisionSupportResult | null>(null);
  const [decisionLoading, setDecisionLoading] = useState(false);
  const [verifyingDocId, setVerifyingDocId] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    if (!activeApplicationId) {
      setError("ID permohonan tidak dijumpai.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ application: Application }>(
        `/api/applications/${activeApplicationId}`
      );
      setApp(res.application);
      setNotaPenilai(res.application.notaPenilai || "");
      setAlasanPenolakan(res.application.alasanPenolakan || "");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memuatkan permohonan.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [activeApplicationId]);

  const fetchDecision = useCallback(async () => {
    if (!activeApplicationId) return;
    setDecisionLoading(true);
    try {
      const res = await api.post<DecisionSupportResult>(
        "/api/ai/decision-support", { applicationId: activeApplicationId }
      );
      setDecision(res);
    } catch {
      /* silent — decision is optional */
    } finally {
      setDecisionLoading(false);
    }
  }, [activeApplicationId]);

  useEffect(() => { fetchDetail(); }, [fetchDetail]);
  useEffect(() => { if (activeApplicationId && !decision) fetchDecision(); }, [activeApplicationId, decision, fetchDecision]);

  async function handleRegenerateAI() {
    if (!app) return;
    setAiLoading(true);
    try {
      // 1. Eligibility
      const elig = await api.post<EligibilityResult & { fallback?: boolean }>(
        "/api/ai/eligibility",
        {
          pendapatanIsiRumah: app.pendapatanIsiRumah,
          bilanganTanggungan: app.bilanganTanggungan,
          statusOku: app.statusOku,
          jenisOku: app.jenisOku,
          statusPemilikanRumah: app.statusPemilikanRumah,
          jenisRumah: app.jenisRumah,
          kategoriBantuan: app.kategoriBantuan,
          negeri: app.negeriPenerima,
          daerah: app.daerahPenerima,
        }
      );
      // Persist back to application
      await api.patch(`/api/applications/${app.applicationId}`, {
        skorKelayakanAi: elig.skor,
        cadanganAi: elig.cadangan,
        notaAi: elig.justifikasi,
        sebabCadanganAi: elig.justifikasi,
        userId: user?.id,
      });
      toast.success(`Analisis AI dijana. Skor: ${elig.skor}/100 (${elig.cadangan.toUpperCase()})`);

      // 2. Duplicate check (auto-persists statusPertindihanAi)
      try {
        await api.post("/api/ai/duplicate-check", { applicationId: app.applicationId });
      } catch { /* silent */ }

      // 3. Decision support
      await fetchDecision();

      // Refresh detail
      await fetchDetail();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menjana semula analisis AI.");
    } finally {
      setAiLoading(false);
    }
  }

  async function handleVerifyDocument(doc: Document) {
    setVerifyingDocId(doc.documentId);
    try {
      await api.post("/api/ai/document-verify", { documentId: doc.documentId });
      toast.success(`Pengesahan AI selesai untuk ${doc.namaFail}.`);
      await fetchDetail();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyemak dokumen.");
    } finally {
      setVerifyingDocId(null);
    }
  }

  async function handleAction(tindakan: "lulus" | "tolak" | "pulangkan" | "naik_peringkat") {
    if (!app || !user) return;
    setActionLoading(true);
    try {
      const body: Record<string, string> = {
        tindakan,
        penggunaId: user.id,
      };
      if (notaPenilai) body.nota = notaPenilai;
      if (tindakan === "tolak") body.alasan = alasanPenolakan || notaPenilai || "Tidak dinyatakan";

      await api.post(`/api/applications/${app.applicationId}/action`, body);
      const labels: Record<string, string> = {
        lulus: "Permohonan diluluskan",
        tolak: "Permohonan ditolak",
        pulangkan: "Permohonan dipulangkan",
        naik_peringkat: "Permohonan dinaikkan peringkat",
      };
      toast.success(labels[tindakan]);
      setShowRejectDialog(false);
      await fetchDetail();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Tindakan gagal diproses.");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <DetailSkeleton />;

  if (error || !app) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" onClick={() => setView("applications")} className="gap-1">
          <ArrowLeft className="w-4 h-4" /> Kembali
        </Button>
        <Card className="glass-card">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">{error || "Permohonan tidak dijumpai."}</p>
            <Button variant="outline" size="sm" onClick={() => setView("applications")} className="mt-4">
              Kembali ke Senarai
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isTrek1 = app.trek === "bantuan_perumahan";
  const isTrek2 = app.trek === "geran_pekb";

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => setView("applications")} className="gap-1 -ml-2">
          <ArrowLeft className="w-4 h-4" /> Kembali ke Senarai
        </Button>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold font-mono">{app.noRujukan}</h1>
              <TrekBadge trek={app.trek} />
              <StatusBadge status={app.statusPermohonan} />
              <PertindihanBadge status={app.statusPertindihanAi} />
            </div>
            <p className="text-sm text-muted-foreground">
              {app.namaPenerima} · {KATEGORI_LABELS[app.kategoriBantuan]}
              {app.pbt ? ` · ${app.pbt.namaPbt}` : ""}
              {app.ngo ? ` · ${app.ngo.namaNgo}` : ""}
            </p>
          </div>
          <div className="text-xs text-muted-foreground text-right">
            <div>Dicipta: {formatDateTime(app.tarikhDicipta)}</div>
            <div>Dikemaskini: {formatDateTime(app.tarikhDikemaskini)}</div>
            {app.tarikhDiluluskan && <div>Diluluskan: {formatDate(app.tarikhDiluluskan)}</div>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left column — 2/3 width on lg */}
        <div className="lg:col-span-2 space-y-5">
          {/* Penerima Info */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4 text-primary" /> Maklumat Penerima
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <InfoRow label="Nama Penerima" value={app.namaPenerima} />
              <InfoRow label="No. Kad Pengenalan" value={maskIC(app.noKpPenerima)} mono />
              <InfoRow label="Negeri" value={app.negeriPenerima} />
              <InfoRow label="Daerah" value={app.daerahPenerima} />
              <InfoRow label="Telefon" value={app.telefonPenerima || "-"} />
              <InfoRow label="Alamat" value={app.alamatPenerima || "-"} full />
            </CardContent>
          </Card>

          {/* Isi Rumah */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Home className="w-4 h-4 text-primary" /> Maklumat Isi Rumah
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <InfoRow label="Pendapatan Isi Rumah" value={formatRM(app.pendapatanIsiRumah)} />
              <InfoRow label="Bil. Tanggungan" value={`${app.bilanganTanggungan} orang`} />
              <InfoRow
                label="Status OKU"
                value={app.statusOku ? `Ya — ${app.jenisOku || "Tidak dinyatakan"}` : "Tidak"}
              />
              <InfoRow label="Pemilikan Rumah" value={app.statusPemilikanRumah} />
              <InfoRow label="Jenis Rumah" value={app.jenisRumah} />
            </CardContent>
          </Card>

          {/* Trek-specific card */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" />
                {isTrek1 ? "Butiran Trek 1 (PBT)" : "Butiran Trek 2 (NGO)"}
              </CardTitle>
              <CardDescription>
                <KategoriBadge kategori={app.kategoriBantuan} />
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {isTrek1 ? (
                <>
                  <InfoRow label="Zon / Mukim" value={app.zonMukim || "-"} />
                  <InfoRow label="No. Rujukan Pemeriksaan" value={app.noRujukanPemeriksaan || "-"} mono />
                  <InfoRow label="Nilai Anggaran Kerja" value={formatRM(app.nilaiAnggaranKerja)} full />
                </>
              ) : (
                <>
                  <InfoRow label="Kawasan Operasi" value={app.kawasanOperasi || "-"} />
                  <InfoRow label="Nilai Geran Dipohon" value={formatRM(app.nilaiGeranDipohon)} />
                  <InfoRow label="Nama Perniagaan" value={app.namaPerniagaan || "-"} />
                  <InfoRow label="Jenis Perniagaan" value={app.jenisPerniagaan || "-"} />
                  <InfoRow label="Cadangan Pelan Guna" value={app.cadanganPelanGuna || "-"} full />
                </>
              )}
            </CardContent>
          </Card>

          {/* Documents */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-primary" /> Dokumen Sokongan
                <Badge variant="secondary" className="ml-auto">{app.documents?.length || 0} fail</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(!app.documents || app.documents.length === 0) ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Tiada dokumen dimuat naik.
                </p>
              ) : (
                app.documents.map((doc) => (
                  <div
                    key={doc.documentId}
                    className="rounded-lg border border-border/40 p-3 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-accent/5 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium truncate">{doc.namaFail}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {JENIS_DOK_LABELS[doc.jenisDokumen] || doc.jenisDokumen}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <PengesahanBadge status={doc.statusPengesahanAi} />
                        <span className="text-[11px] text-muted-foreground">
                          {(doc.saizFail / 1024).toFixed(0)} KB · {formatDate(doc.tarikhMuatNaik)}
                        </span>
                      </div>
                      {doc.catatanAi && (
                        <p className="text-[11px] text-muted-foreground mt-1 italic line-clamp-2">
                          AI: {doc.catatanAi}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1 flex-shrink-0"
                      onClick={() => handleVerifyDocument(doc)}
                      disabled={verifyingDocId === doc.documentId}
                    >
                      {verifyingDocId === doc.documentId ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <FileSearch className="w-3.5 h-3.5" />
                      )}
                      Semak AI
                    </Button>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right column — 1/3 width on lg, sticky */}
        <div className="lg:col-span-1 space-y-5 lg:sticky lg:top-20 lg:self-start lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto scrollbar-thin lg:pr-1">
          {/* AI Analysis */}
          <Card className="glass-card">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-accent" /> Analisis AI
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 h-7"
                onClick={handleRegenerateAI}
                disabled={aiLoading}
              >
                {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                Jana Semula
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <SkorIndicator skor={app.skorKelayakanAi || 0} size="lg" />
                <div className="min-w-0">
                  <div className="text-xs text-muted-foreground">Skor Kelayakan AI</div>
                  <div className="text-sm font-semibold mt-0.5">
                    Cadangan: {app.cadanganAi?.toUpperCase() || "—"}
                  </div>
                  <PertindihanBadge status={app.statusPertindihanAi} />
                </div>
              </div>
              {app.notaAi && (
                <div className="rounded-lg bg-accent/5 border border-accent/20 p-3">
                  <div className="text-[11px] font-semibold text-accent-foreground mb-1">Justifikasi AI</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{app.notaAi}</p>
                </div>
              )}
              {decision && (
                <div className="rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <div className="text-[11px] font-semibold mb-1">Ringkasan Sokongan Keputusan</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{decision.ringkasan}</p>
                </div>
              )}
              {decisionLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3 h-3 animate-spin" /> Menjana sokongan keputusan...
                </div>
              )}
            </CardContent>
          </Card>

          {/* Decision Support detail */}
          {decision && (
            <Card className="glass-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <ListChecks className="w-4 h-4 text-primary" /> Sokongan Keputusan
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {decision.sebab?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-1.5">Sebab</div>
                    <ul className="space-y-1">
                      {decision.sebab.map((s, i) => (
                        <li key={i} className="text-xs flex gap-2">
                          <span className="text-emerald-500 flex-shrink-0">•</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {decision.faktorRisiko?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-amber-500" /> Faktor Risiko
                    </div>
                    <ul className="space-y-1">
                      {decision.faktorRisiko.map((r, i) => (
                        <li key={i} className="text-xs flex gap-2">
                          <span className="text-amber-500 flex-shrink-0">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card className="glass-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" /> Garis Masa
              </CardTitle>
            </CardHeader>
            <CardContent>
              {(!app.auditLogs || app.auditLogs.length === 0) ? (
                <p className="text-xs text-muted-foreground text-center py-4">Tiada log audit.</p>
              ) : (
                <div className="relative pl-5 space-y-3 before:content-[''] before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-px before:bg-border">
                  {app.auditLogs.slice(0, 12).map((log) => (
                    <TimelineItem key={log.logId} log={log} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Review actions */}
          {canReview && (
            <Card className="glass-card border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-primary" /> Tindakan Semakan
                </CardTitle>
                <CardDescription className="text-xs">
                  Peringkat semasa: <span className="font-semibold">{app.peringkatSemasa}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="nota" className="text-xs">Nota Penilai</Label>
                  <Textarea
                    id="nota"
                    value={notaPenilai}
                    onChange={(e) => setNotaPenilai(e.target.value)}
                    placeholder="Catatan semakan anda..."
                    rows={3}
                    className="text-sm"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    size="sm" className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                    disabled={actionLoading || app.statusPermohonan === "diluluskan"}
                    onClick={() => handleAction("lulus")}
                  >
                    <CheckCircle2 className="w-4 h-4" /> Lulus
                  </Button>
                  <Button
                    size="sm" variant="destructive" className="gap-1"
                    disabled={actionLoading || app.statusPermohonan === "ditolak"}
                    onClick={() => setShowRejectDialog(true)}
                  >
                    <XCircle className="w-4 h-4" /> Tolak
                  </Button>
                  <Button
                    size="sm" variant="outline" className="gap-1"
                    disabled={actionLoading}
                    onClick={() => handleAction("pulangkan")}
                  >
                    <Undo2 className="w-4 h-4" /> Pulangkan
                  </Button>
                  <Button
                    size="sm" variant="outline" className="gap-1"
                    disabled={actionLoading || app.peringkatSemasa === "selesai"}
                    onClick={() => handleAction("naik_peringkat")}
                  >
                    <ArrowUpCircle className="w-4 h-4" /> Naik Peringkat
                  </Button>
                </div>
                {app.alasanPenolakan && (
                  <div className="text-[11px] text-destructive bg-destructive/5 rounded-md p-2 border border-destructive/20">
                    Alasan penolakan sedia ada: {app.alasanPenolakan}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Reject confirmation dialog */}
      <AlertDialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sahkan Penolakan Permohonan</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menolak permohonan <span className="font-mono font-semibold">{app.noRujukan}</span>.
              Sila nyatakan alasan penolakan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="alasan" className="text-xs">Alasan Penolakan</Label>
            <Textarea
              id="alasan"
              value={alasanPenolakan}
              onChange={(e) => setAlasanPenolakan(e.target.value)}
              placeholder="Nyatakan alasan penolakan..."
              rows={3}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Batal</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionLoading || !alasanPenolakan.trim()}
              onClick={(e) => { e.preventDefault(); handleAction("tolak"); }}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Sahkan Tolak
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function InfoRow({
  label, value, mono, full,
}: { label: string; value: string; mono?: boolean; full?: boolean }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">
        {label}
      </div>
      <div className={`text-sm font-medium ${mono ? "font-mono" : ""}`}>{value || "-"}</div>
    </div>
  );
}

function TimelineItem({ log }: { log: AuditLog }) {
  return (
    <div className="relative">
      <div className="absolute -left-5 top-1 w-3 h-3 rounded-full bg-gradient-to-br from-primary to-accent border-2 border-background" />
      <div className="text-xs">
        <div className="font-semibold flex items-center gap-1.5 flex-wrap">
          <span className="capitalize">{log.tindakan.replace(/_/g, " ")}</span>
          {log.pengguna && (
            <span className="text-muted-foreground font-normal">· {log.pengguna.namaPenuh}</span>
          )}
        </div>
        <div className="text-muted-foreground mt-0.5">{log.perincian}</div>
        <div className="text-[10px] text-muted-foreground/70 mt-0.5">
          {formatDateTime(log.capMasa)}
        </div>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-9 w-32" />
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="glass-card">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-40" />
                <div className="grid grid-cols-2 gap-3">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <Skeleton key={j} className="h-12" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-5">
          {Array.from({ length: 2 }).map((_, i) => (
            <Card key={i} className="glass-card">
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
