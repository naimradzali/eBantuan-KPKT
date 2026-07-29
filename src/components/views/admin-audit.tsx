"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ScrollText, Search, Download, ShieldAlert, Loader2, Lock, ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleBadge } from "@/components/shared/badges";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { formatDateTime, type Role } from "@/lib/types";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface AuditRow {
  logId: string;
  applicationId?: string | null;
  penggunaId: string;
  tindakan: string;
  perincian: string;
  capMasa: string;
  pengguna?: { id: string; namaPenuh: string; emel: string; peranan: string } | null;
  application?: { applicationId: string; noRujukan: string; trek: string } | null;
}

interface AuditResponse {
  data: AuditRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const TINDAKAN_OPTIONS = [
  { value: "hantar_permohonan", label: "Hantar Permohonan" },
  { value: "lulus", label: "Lulus" },
  { value: "tolak", label: "Tolak" },
  { value: "pulangkan", label: "Pulangkan" },
  { value: "log_masuk", label: "Log Masuk" },
  { value: "cipta_pengguna", label: "Cipta Pengguna" },
  { value: "cipta_draf", label: "Cipta Draf" },
  { value: "kemaskini", label: "Kemaskini" },
  { value: "kemaskini_status", label: "Kemaskini Status" },
  { value: "muat_naik_dokumen", label: "Muat Naik Dokumen" },
  { value: "naik_peringkat", label: "Naik Peringkat" },
];

const TINDAKAN_STYLE: Record<string, { label: string; cls: string }> = {
  lulus: { label: "Lulus", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  tolak: { label: "Tolak", cls: "bg-red-100 text-red-700 border-red-200" },
  pulangkan: { label: "Pulangkan", cls: "bg-amber-100 text-amber-700 border-amber-200" },
  hantar_permohonan: { label: "Hantar Permohonan", cls: "bg-sky-100 text-sky-700 border-sky-200" },
  naik_peringkat: { label: "Naik Peringkat", cls: "bg-sky-100 text-sky-700 border-sky-200" },
  cipta_draf: { label: "Cipta Draf", cls: "bg-sky-100 text-sky-700 border-sky-200" },
  log_masuk: { label: "Log Masuk", cls: "bg-muted text-muted-foreground" },
  cipta_pengguna: { label: "Cipta Pengguna", cls: "bg-purple-100 text-purple-700 border-purple-200" },
  kemaskini: { label: "Kemaskini", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  kemaskini_status: { label: "Kemaskini Status", cls: "bg-slate-100 text-slate-700 border-slate-200" },
  muat_naik_dokumen: { label: "Muat Naik Dokumen", cls: "bg-teal-100 text-teal-700 border-teal-200" },
};

export function AdminAuditView() {
  const setView = useAppStore((s) => s.setView);
  const setActiveApplication = useAppStore((s) => s.setActiveApplication);

  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const [searchPengguna, setSearchPengguna] = useState("");
  const [penggunaId, setPenggunaId] = useState("");
  const [searchApplication, setSearchApplication] = useState("");
  const [applicationId, setApplicationId] = useState("");
  const [tindakanFilter, setTindakanFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (penggunaId) params.set("penggunaId", penggunaId);
      if (applicationId) params.set("applicationId", applicationId);
      if (tindakanFilter) params.set("tindakan", tindakanFilter);
      if (startDate) params.set("startDate", new Date(startDate).toISOString());
      if (endDate) { const d = new Date(endDate); d.setHours(23, 59, 59, 999); params.set("endDate", d.toISOString()); }
      const res = await api.get<AuditResponse>(`/api/admin/audit-logs?${params.toString()}`);
      setRows(res.data || []);
      setTotal(res.total);
      setTotalPages(Math.max(1, res.totalPages));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuatkan log audit");
    } finally {
      setLoading(false);
    }
  }, [page, penggunaId, applicationId, tindakanFilter, startDate, endDate]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => { setPenggunaId(searchPengguna); setPage(1); }, 500);
    return () => clearTimeout(t);
  }, [searchPengguna]);
  useEffect(() => {
    const t = setTimeout(() => { setApplicationId(searchApplication); setPage(1); }, 500);
    return () => clearTimeout(t);
  }, [searchApplication]);

  const handleExport = () => {
    toast.success("Log dieksport", {
      description: `${total} rekod log audit telah dieksport ke CSV (demo).`,
    });
  };

  const openApplication = (appId: string, noRujukan: string) => {
    setActiveApplication(appId);
    setView("application-detail");
    toast.info(`Membuka permohonan ${noRujukan}`);
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gradient-primary flex items-center gap-2">
            <ScrollText className="w-7 h-7 text-primary" />
            Log Audit Sistem
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Jejak audit tidak boleh diubah (immutable) · {total} rekod · Halaman {page}/{totalPages}
          </p>
        </div>
        <Button onClick={handleExport} variant="outline" className="glass">
          <Download className="w-4 h-4 mr-2" /> Eksport
        </Button>
      </motion.div>

      {/* Immutability banner */}
      <Card className="glass-card border-amber-200/40 bg-amber-50/40 dark:bg-amber-950/10">
        <CardContent className="p-4 flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
            <Lock className="w-5 h-5 text-amber-700" />
          </div>
          <div>
            <p className="font-semibold text-amber-900 dark:text-amber-200">Log Audit Tidak Boleh Diubah (Immutable)</p>
            <p className="text-sm text-amber-800 dark:text-amber-300/80 mt-0.5">
              Setiap entri dalam log audit adalah rekod kekal yang tidak boleh diubah suai atau dipadam.
              Ini mematuhi keperluan auditabiliti PRD §9 dan §15.1 untuk ketelusan dan akauntabiliti penuh.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Filter bar */}
      <Card className="glass-card border-border/40">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            <div>
              <Label className="text-xs">Tarikh Mula</Label>
              <Input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} />
            </div>
            <div>
              <Label className="text-xs">Tarikh Akhir</Label>
              <Input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} />
            </div>
            <div>
              <Label className="text-xs">Tindakan</Label>
              <Select value={tindakanFilter} onValueChange={(v) => { setTindakanFilter(v === "all" ? "" : v); setPage(1); }}>
                <SelectTrigger><SelectValue placeholder="Semua Tindakan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Tindakan</SelectItem>
                  {TINDAKAN_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">ID Pengguna</Label>
              <Input value={searchPengguna} onChange={(e) => setSearchPengguna(e.target.value)} placeholder="Cari penggunaId..." />
            </div>
            <div>
              <Label className="text-xs">ID Permohonan</Label>
              <Input value={searchApplication} onChange={(e) => setSearchApplication(e.target.value)} placeholder="Cari applicationId..." />
            </div>
          </div>
          {(penggunaId || applicationId || tindakanFilter || startDate || endDate) && (
            <div className="mt-3 flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Penapis aktif:</span>
              {tindakanFilter && <Badge variant="secondary">{TINDAKAN_STYLE[tindakanFilter]?.label || tindakanFilter}</Badge>}
              {startDate && <Badge variant="secondary">Mula: {startDate}</Badge>}
              {endDate && <Badge variant="secondary">Akhir: {endDate}</Badge>}
              {penggunaId && <Badge variant="secondary">Pengguna: {penggunaId.slice(0, 8)}...</Badge>}
              {applicationId && <Badge variant="secondary">Permohonan: {applicationId.slice(0, 8)}...</Badge>}
              <Button variant="ghost" size="sm" onClick={() => {
                setPenggunaId(""); setSearchPengguna(""); setApplicationId(""); setSearchApplication("");
                setTindakanFilter(""); setStartDate(""); setEndDate(""); setPage(1);
              }}>Padam Penapis</Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="glass-card border-border/40">
        <CardContent className="p-0">
          {error ? (
            <div className="p-8 text-center">
              <ShieldAlert className="w-10 h-10 mx-auto text-destructive mb-2" />
              <p className="text-destructive font-medium">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={fetchLogs}>Cuba Semula</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 bg-muted/30 hover:bg-muted/30">
                    <TableHead className="min-w-[160px]">Cap Masa</TableHead>
                    <TableHead className="min-w-[180px]">Pengguna</TableHead>
                    <TableHead className="min-w-[160px]">Tindakan</TableHead>
                    <TableHead className="min-w-[280px]">Perincian</TableHead>
                    <TableHead className="min-w-[160px]">Rujukan Permohonan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                    ))
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        <ScrollText className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        Tiada log audit dijumpai
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((r) => {
                      const tStyle = TINDAKAN_STYLE[r.tindakan] || { label: r.tindakan, cls: "bg-muted text-muted-foreground" };
                      return (
                        <TableRow key={r.logId} className="border-border/40 hover:bg-muted/30 transition-colors">
                          <TableCell className="text-xs font-mono whitespace-nowrap">
                            {formatDateTime(r.capMasa)}
                          </TableCell>
                          <TableCell>
                            {r.pengguna ? (
                              <div>
                                <div className="font-medium text-sm">{r.pengguna.namaPenuh}</div>
                                <div className="mt-0.5"><RoleBadge role={r.pengguna.peranan as Role} /></div>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground font-mono">{r.penggunaId.slice(0, 12)}...</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={tStyle.cls}>{tStyle.label}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">{r.perincian || "-"}</TableCell>
                          <TableCell>
                            {r.application ? (
                              <button
                                onClick={() => openApplication(r.application!.applicationId, r.application!.noRujukan)}
                                className="inline-flex items-center gap-1 text-sm font-mono text-primary hover:underline"
                              >
                                {r.application.noRujukan}
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="text-xs text-muted-foreground">-</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {!loading && rows.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border/40">
              <p className="text-xs text-muted-foreground">
                Memaparkan {rows.length} daripada {total} rekod · Halaman {page} / {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1 || loading} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Sebelum
                </Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages || loading} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Seterus
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
