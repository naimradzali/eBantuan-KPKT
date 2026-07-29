"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FileText, Search, Filter, Eye, ChevronLeft, ChevronRight,
  FilePlus2, AlertCircle, Loader2, Inbox, ListChecks, Clock, CheckCircle2, XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import { useAppStore, useRoleAccess } from "@/lib/store";
import {
  type Application, type StatusPermohonan, type Trek,
  STATUS_LABELS, KATEGORI_LABELS, formatDate,
} from "@/lib/types";
import { StatusBadge, KategoriBadge, TrekBadge, SkorIndicator } from "@/components/shared/badges";
import { toast } from "sonner";

interface ListResponse {
  data: Application[];
  total: number;
  page: number;
  limit: number;
}

const PAGE_SIZE = 10;

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "all", label: "Semua Status" },
  { value: "draf", label: STATUS_LABELS.draf },
  { value: "dihantar", label: STATUS_LABELS.dihantar },
  { value: "semakan_pbt_ngo", label: STATUS_LABELS.semakan_pbt_ngo },
  { value: "semakan_daerah", label: STATUS_LABELS.semakan_daerah },
  { value: "semakan_negeri", label: STATUS_LABELS.semakan_negeri },
  { value: "diluluskan", label: STATUS_LABELS.diluluskan },
  { value: "ditolak", label: STATUS_LABELS.ditolak },
  { value: "dipulangkan", label: STATUS_LABELS.dipulangkan },
];

const KATEGORI_OPTIONS = [
  { value: "all", label: "Semua Kategori" },
  { value: "baik_pulih_rumah", label: KATEGORI_LABELS.baik_pulih_rumah },
  { value: "rumah_mesra_rakyat", label: KATEGORI_LABELS.rumah_mesra_rakyat },
  { value: "geran_ekonomi", label: KATEGORI_LABELS.geran_ekonomi },
  { value: "bantuan_sara_hidup", label: KATEGORI_LABELS.bantuan_sara_hidup },
];

// Show only relevant trek tabs based on role
function useTrekTabs(): { value: string; label: string }[] {
  const { isPBT, isNGO } = useRoleAccess();
  if (isPBT && !isNGO) {
    return [
      { value: "all", label: "Semua" },
      { value: "bantuan_perumahan", label: "Trek 1 · PBT" },
    ];
  }
  if (isNGO && !isPBT) {
    return [
      { value: "all", label: "Semua" },
      { value: "geran_pekb", label: "Trek 2 · NGO" },
    ];
  }
  return [
    { value: "all", label: "Semua" },
    { value: "bantuan_perumahan", label: "Trek 1 · PBT" },
    { value: "geran_pekb", label: "Trek 2 · NGO" },
  ];
}

export function ApplicationsListView() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const setActiveApplication = useAppStore((s) => s.setActiveApplication);
  const { canSubmit } = useRoleAccess();
  const trekTabs = useTrekTabs();

  const [trekFilter, setTrekFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [kategoriFilter, setKategoriFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState<{ total: number; pending: number; approved: number; rejected: number }>({
    total: 0, pending: 0, approved: 0, rejected: 0,
  });
  const [error, setError] = useState<string | null>(null);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchList = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_SIZE),
      });
      if (trekFilter !== "all") params.set("trek", trekFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      // userId auto-injected by apiFetch
      const res = await api.get<ListResponse>(`/api/applications?${params.toString()}`);
      setData(res.data || []);
      setTotal(res.total || 0);

      // Compute quick stats from a separate unfiltered call (status filter only)
      // For performance, just compute counts from current set + nearby pages
      // Simpler: fetch stats overview
      try {
        const statsRes = await api.get<{
          total: number;
          byStatus?: Record<string, number>;
        }>(`/api/applications/stats/overview`);
        const byStatus = statsRes.byStatus || {};
        setStats({
          total: statsRes.total || 0,
          pending: (byStatus.dihantar || 0) + (byStatus.semakan_pbt_ngo || 0) +
                   (byStatus.semakan_daerah || 0) + (byStatus.semakan_negeri || 0),
          approved: byStatus.diluluskan || 0,
          rejected: byStatus.ditolak || 0,
        });
      } catch {
        /* stats optional */
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Gagal memuatkan senarai permohonan.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [user, page, trekFilter, statusFilter, debouncedSearch]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Reset page when filters change
  useEffect(() => { setPage(1); }, [trekFilter, statusFilter, kategoriFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const filtered = useMemo(() => {
    if (kategoriFilter === "all") return data;
    return data.filter((a) => a.kategoriBantuan === kategoriFilter);
  }, [data, kategoriFilter]);

  function handleRowClick(app: Application) {
    setActiveApplication(app.applicationId);
    setView("application-detail");
  }

  function handleNew() {
    setView("new-application");
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gradient-primary">Senarai Permohonan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Urus dan jejak semua permohonan bantuan perumahan dan geran PEKB.
          </p>
        </div>
        {canSubmit && (
          <Button onClick={handleNew} className="gap-2 w-full sm:w-auto">
            <FilePlus2 className="w-4 h-4" />
            Permohonan Baharu
          </Button>
        )}
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Jumlah Permohonan"
          value={stats.total}
          icon={ListChecks}
          tone="primary"
          loading={loading}
        />
        <StatCard
          label="Dalam Semakan"
          value={stats.pending}
          icon={Clock}
          tone="amber"
          loading={loading}
        />
        <StatCard
          label="Diluluskan"
          value={stats.approved}
          icon={CheckCircle2}
          tone="emerald"
          loading={loading}
        />
        <StatCard
          label="Ditolak"
          value={stats.rejected}
          icon={XCircle}
          tone="red"
          loading={loading}
        />
      </div>

      {/* Trek filter tabs */}
      <Tabs value={trekFilter} onValueChange={setTrekFilter}>
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          {trekTabs.map((t) => (
            <TabsTrigger key={t.value} value={t.value}>{t.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Filter bar */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="search" className="text-xs text-muted-foreground flex items-center gap-1">
                <Search className="w-3 h-3" /> Cari No Rujukan / Nama Penerima
              </Label>
              <Input
                id="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Carian..."
                className="h-9"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Filter className="w-3 h-3" /> Status
              </Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                <Filter className="w-3 h-3" /> Kategori Bantuan
              </Label>
              <Select value={kategoriFilter} onValueChange={setKategoriFilter}>
                <SelectTrigger className="w-full h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KATEGORI_OPTIONS.map((k) => (
                    <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <AlertCircle className="w-10 h-10 text-destructive mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchList}>Cuba Semula</Button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center mb-4">
                <Inbox className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="font-medium text-foreground mb-1">Tiada permohonan dijumpai</p>
              <p className="text-sm text-muted-foreground">
                Cuba ubah penapis atau cipta permohonan baharu.
              </p>
              {canSubmit && (
                <Button onClick={handleNew} variant="outline" size="sm" className="mt-4 gap-2">
                  <FilePlus2 className="w-4 h-4" /> Cipta Permohonan
                </Button>
              )}
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40">
                    <TableHead className="pl-4">No Rujukan</TableHead>
                    <TableHead>Penerima</TableHead>
                    <TableHead className="hidden md:table-cell">Trek / Kategori</TableHead>
                    <TableHead className="text-center">Skor AI</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Tarikh</TableHead>
                    <TableHead className="text-right pr-4">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((app, idx) => (
                    <motion.tr
                      key={app.applicationId}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.2, delay: Math.min(idx * 0.02, 0.2) }}
                      className="border-border/40 hover:bg-accent/5 cursor-pointer group"
                      onClick={() => handleRowClick(app)}
                    >
                      <TableCell className="pl-4 font-mono text-xs font-semibold">
                        {app.noRujukan}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-sm">{app.namaPenerima}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {app.negeriPenerima || "-"}
                          {app.pbt ? ` · ${app.pbt.kodPbt}` : ""}
                          {app.ngo ? ` · ${app.ngo.noAkreditasiPekb}` : ""}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-col gap-1">
                          <TrekBadge trek={app.trek} />
                          <KategoriBadge kategori={app.kategoriBantuan} />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center">
                          <SkorIndicator skor={app.skorKelayakanAi || 0} size="sm" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={app.statusPermohonan} />
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                        {formatDate(app.tarikhPermohonan || app.tarikhDicipta)}
                      </TableCell>
                      <TableCell className="text-right pr-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-1 opacity-70 group-hover:opacity-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(app);
                          }}
                        >
                          <Eye className="w-4 h-4" /> Lihat
                        </Button>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border/40">
                <div className="text-xs text-muted-foreground">
                  Menunjukkan {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} dari {total} permohonan
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline" size="sm" disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="w-4 h-4" /> Sebelumnya
                  </Button>
                  <span className="text-xs text-muted-foreground px-2">
                    Halaman {page} / {totalPages}
                  </span>
                  <Button
                    variant="outline" size="sm" disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Seterusnya <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label, value, icon: Icon, tone, loading,
}: {
  label: string;
  value: number;
  icon: typeof FileText;
  tone: "primary" | "amber" | "emerald" | "red";
  loading?: boolean;
}) {
  const toneMap = {
    primary: "from-primary/10 to-primary/5 text-primary border-primary/20",
    amber: "from-amber-500/10 to-amber-500/5 text-amber-600 border-amber-500/20",
    emerald: "from-emerald-500/10 to-emerald-500/5 text-emerald-600 border-emerald-500/20",
    red: "from-red-500/10 to-red-500/5 text-red-600 border-red-500/20",
  };
  return (
    <Card className={`glass-card bg-gradient-to-br ${toneMap[tone]} border`}>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-white/60 dark:bg-white/10 backdrop-blur flex items-center justify-center flex-shrink-0">
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">
            {label}
          </div>
          {loading ? (
            <Skeleton className="h-6 w-12 mt-1" />
          ) : (
            <div className="text-2xl font-bold leading-tight">{value.toLocaleString("ms-MY")}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
