"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from "recharts";
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  MapPin,
  Building2,
  HandHeart,
  Download,
  FileText,
  FileSpreadsheet,
  CheckCircle2,
  XCircle,
  Clock,
  Wallet,
  Brain,
  AlertTriangle,
  Files,
  Layers,
  AlertCircle,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api-client";
import {
  formatRM,
  KATEGORI_LABELS,
  STATUS_LABELS,
  type KategoriBantuan,
  type StatusPermohonan,
} from "@/lib/types";
import { cn } from "@/lib/utils";

// ============================================================
// Types — match API response shapes
// ============================================================

interface OverviewResponse {
  totalApplications: number;
  totalApproved: number;
  totalRejected: number;
  totalPending: number;
  totalValueApproved: number;
  byTrek: Record<
    "bantuan_perumahan" | "geran_pekb",
    {
      total: number;
      approved: number;
      pending: number;
      rejected: number;
      valueApproved: number;
    }
  >;
  byStatus: Partial<Record<StatusPermohonan, number>>;
  byKategori: Partial<Record<KategoriBantuan, number>>;
  avgSkorAi: number;
  duplicateDetected: number;
}

interface TrekComparisonResponse {
  bantuan_perumahan: TrekSummary;
  geran_pekb: TrekSummary;
}

interface TrekSummary {
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  valueApproved: number;
  byNegeri: { negeri: string; total: number; approved: number; value: number }[];
}

interface TrendPoint {
  month: string;
  bantuan_perumahan: number;
  geran_pekb: number;
  approved: number;
}

interface HeatmapRow {
  negeri: string;
  total: number;
  approved: number;
  pending: number;
  valueApproved: number;
}

interface PbtPerfRow {
  pbtId: string;
  namaPbt: string;
  kodPbt: string;
  negeri: string;
  daerah: string;
  kategoriPbt: string;
  statusAkaunPbt: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  avgSkorAi: number;
  totalValueApproved: number;
}

interface NgoPerfRow {
  ngoId: string;
  namaNgo: string;
  noAkreditasiPekb: string;
  negeriOperasi: string;
  daerahOperasi: string;
  statusAkreditasi: string;
  total: number;
  approved: number;
  pending: number;
  rejected: number;
  avgSkorAi: number;
  totalValueApproved: number;
}

// ============================================================
// Chart palette — derived from CSS --chart-1..5
// ============================================================

const CHART = {
  navy: "#0f2747",
  teal: "#0d9488",
  green: "#16a34a",
  gold: "#d97706",
  coral: "#dc2626",
  purple: "#8b5cf6",
  pink: "#ec4899",
  slate: "#64748b",
  sky: "#0284c7",
};

const STATUS_COLOR: Record<StatusPermohonan, string> = {
  draf: CHART.slate,
  dihantar: CHART.sky,
  semakan_pbt_ngo: CHART.gold,
  semakan_daerah: "#ea580c",
  semakan_negeri: CHART.purple,
  diluluskan: CHART.green,
  ditolak: CHART.coral,
  dipulangkan: CHART.pink,
};

const KATEGORI_COLOR: Record<KategoriBantuan, string> = {
  baik_pulih_rumah: CHART.gold,
  rumah_mesra_rakyat: "#ea580c",
  geran_ekonomi: CHART.teal,
  bantuan_sara_hidup: CHART.sky,
};

// ============================================================
// Sub-components
// ============================================================

function ChartCard({
  title,
  description,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  icon: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "glass-card rounded-xl p-5 flex flex-col gap-4 h-full",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="rounded-lg bg-primary/10 p-2 shrink-0">
            <Icon className="size-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-foreground leading-tight">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {description}
              </p>
            )}
          </div>
        </div>
        {action}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  hint?: string;
  tone: "navy" | "teal" | "green" | "coral" | "gold" | "purple";
}) {
  const toneClass = {
    navy: "bg-primary/10 text-primary",
    teal: "bg-accent/15 text-accent-foreground",
    green: "bg-emerald-100 text-emerald-700",
    coral: "bg-red-100 text-red-700",
    gold: "bg-amber-100 text-amber-700",
    purple: "bg-purple-100 text-purple-700",
  }[tone];
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="glass-card rounded-xl p-4 flex items-start gap-3"
    >
      <div className={cn("rounded-lg p-2.5 shrink-0", toneClass)}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-2xl font-bold text-foreground leading-tight truncate">
          {value}
        </p>
        {hint && (
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {hint}
          </p>
        )}
      </div>
    </motion.div>
  );
}

function ChartSkeleton({ height = 260 }: { height?: number }) {
  return (
    <div className="space-y-3" style={{ height }}>
      <Skeleton className="h-full w-full" />
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-3 flex items-center gap-2 text-sm text-red-700">
      <AlertCircle className="size-4 shrink-0" />
      <span>{message}</span>
    </div>
  );
}

// Custom tooltip for recharts (BM labels)
function ChartTooltip({
  active,
  payload,
  label,
  formatter,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
  formatter?: (v: number) => string;
}) {
  if (!active || !payload || payload.length === 0) return null;
  return (
    <div className="rounded-lg border bg-background/95 backdrop-blur p-2.5 text-xs shadow-lg">
      {label && (
        <p className="font-semibold text-foreground mb-1">{label}</p>
      )}
      <div className="space-y-0.5">
        {payload.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              className="size-2.5 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-muted-foreground">{p.name}:</span>
            <span className="font-medium text-foreground">
              {formatter && typeof p.value === "number"
                ? formatter(p.value)
                : p.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Trek comparison donut card
// ============================================================

function TrekDonutCard({
  title,
  summary,
  color,
}: {
  title: string;
  summary: TrekSummary | undefined;
  color: string;
}) {
  if (!summary) return <ChartSkeleton />;

  const donutData = [
    { name: "Diluluskan", value: summary.approved, color: CHART.green },
    { name: "Menunggu", value: summary.pending, color: CHART.gold },
    { name: "Ditolak", value: summary.rejected, color: CHART.coral },
  ].filter((d) => d.value > 0);

  const approvalRate =
    summary.total > 0
      ? Math.round((summary.approved / summary.total) * 1000) / 10
      : 0;

  return (
    <div className="space-y-4">
      <div className="flex items-baseline justify-between">
        <h4 className="font-semibold text-foreground" style={{ color }}>
          {title}
        </h4>
        <span className="text-xs text-muted-foreground">
          Kadar lulus:{" "}
          <span className="font-semibold text-foreground">{approvalRate}%</span>
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex items-center justify-center">
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie
                data={donutData}
                dataKey="value"
                nameKey="name"
                innerRadius={42}
                outerRadius={68}
                paddingAngle={2}
                stroke="none"
              >
                {donutData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={<ChartTooltip />}
                wrapperStyle={{ outline: "none" }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-2 text-sm self-center">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: CHART.green }}
              />
              Diluluskan
            </span>
            <span className="font-semibold">{summary.approved}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: CHART.gold }}
              />
              Menunggu
            </span>
            <span className="font-semibold">{summary.pending}</span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground flex items-center gap-1.5">
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: CHART.coral }}
              />
              Ditolak
            </span>
            <span className="font-semibold">{summary.rejected}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 pt-2 border-t">
        <div>
          <p className="text-[11px] text-muted-foreground">Jumlah Permohonan</p>
          <p className="text-lg font-bold text-foreground">{summary.total}</p>
        </div>
        <div>
          <p className="text-[11px] text-muted-foreground">Nilai Diluluskan</p>
          <p className="text-lg font-bold text-foreground">
            {formatRM(summary.valueApproved)}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// State heatmap row intensity helper
// ============================================================

function intensityBg(ratio: number): string {
  // ratio 0..1 → teal opacity 0.05..0.6
  const clamped = Math.max(0, Math.min(1, ratio));
  const opacity = 0.08 + clamped * 0.52;
  return `rgba(13, 148, 136, ${opacity.toFixed(2)})`;
}

// ============================================================
// Main view
// ============================================================

export function AnalyticsView() {
  const [months, setMonths] = useState(6);

  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [trekComp, setTrekComp] = useState<TrekComparisonResponse | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapRow[]>([]);
  const [pbtPerf, setPbtPerf] = useState<PbtPerfRow[]>([]);
  const [ngoPerf, setNgoPerf] = useState<NgoPerfRow[]>([]);

  const [loadingOverview, setLoadingOverview] = useState(true);
  const [loadingTrek, setLoadingTrek] = useState(true);
  const [loadingTrend, setLoadingTrend] = useState(true);
  const [loadingHeat, setLoadingHeat] = useState(true);
  const [loadingPbt, setLoadingPbt] = useState(true);
  const [loadingNgo, setLoadingNgo] = useState(true);

  const [errorOverview, setErrorOverview] = useState<string | null>(null);
  const [errorTrek, setErrorTrek] = useState<string | null>(null);
  const [errorTrend, setErrorTrend] = useState<string | null>(null);
  const [errorHeat, setErrorHeat] = useState<string | null>(null);
  const [errorPbt, setErrorPbt] = useState<string | null>(null);
  const [errorNgo, setErrorNgo] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    setLoadingOverview(true);
    setErrorOverview(null);
    try {
      const d = await api.get<OverviewResponse>("/api/analytics/overview");
      setOverview(d);
    } catch (e) {
      setErrorOverview(e instanceof Error ? e.message : "Gagal.");
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  const fetchTrek = useCallback(async () => {
    setLoadingTrek(true);
    setErrorTrek(null);
    try {
      const d = await api.get<TrekComparisonResponse>("/api/analytics/trek-comparison");
      setTrekComp(d);
    } catch (e) {
      setErrorTrek(e instanceof Error ? e.message : "Gagal.");
    } finally {
      setLoadingTrek(false);
    }
  }, []);

  const fetchTrend = useCallback(async (m: number) => {
    setLoadingTrend(true);
    setErrorTrend(null);
    try {
      const d = await api.get<TrendPoint[]>(`/api/analytics/trend?months=${m}`);
      setTrend(d);
    } catch (e) {
      setErrorTrend(e instanceof Error ? e.message : "Gagal.");
    } finally {
      setLoadingTrend(false);
    }
  }, []);

  const fetchHeat = useCallback(async () => {
    setLoadingHeat(true);
    setErrorHeat(null);
    try {
      const d = await api.get<HeatmapRow[]>("/api/analytics/heatmap");
      setHeatmap(d);
    } catch (e) {
      setErrorHeat(e instanceof Error ? e.message : "Gagal.");
    } finally {
      setLoadingHeat(false);
    }
  }, []);

  const fetchPbt = useCallback(async () => {
    setLoadingPbt(true);
    setErrorPbt(null);
    try {
      const d = await api.get<PbtPerfRow[]>("/api/analytics/pbt-performance");
      setPbtPerf(d);
    } catch (e) {
      setErrorPbt(e instanceof Error ? e.message : "Gagal.");
    } finally {
      setLoadingPbt(false);
    }
  }, []);

  const fetchNgo = useCallback(async () => {
    setLoadingNgo(true);
    setErrorNgo(null);
    try {
      const d = await api.get<NgoPerfRow[]>("/api/analytics/ngo-performance");
      setNgoPerf(d);
    } catch (e) {
      setErrorNgo(e instanceof Error ? e.message : "Gagal.");
    } finally {
      setLoadingNgo(false);
    }
  }, []);

  const fetchAll = useCallback(() => {
    fetchOverview();
    fetchTrek();
    fetchTrend(months);
    fetchHeat();
    fetchPbt();
    fetchNgo();
  }, [fetchOverview, fetchTrek, fetchTrend, fetchHeat, fetchPbt, fetchNgo, months]);

  // Initial load
  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Refetch trend when months changes
  useEffect(() => {
    fetchTrend(months);
  }, [fetchTrend, months]);

  // Build chart datasets
  const statusChartData = useMemo(() => {
    if (!overview?.byStatus) return [];
    return (Object.entries(overview.byStatus) as [StatusPermohonan, number][])
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({
        name: STATUS_LABELS[k],
        value: v,
        color: STATUS_COLOR[k],
        key: k,
      }));
  }, [overview]);

  const kategoriChartData = useMemo(() => {
    if (!overview?.byKategori) return [];
    return (Object.entries(overview.byKategori) as [KategoriBantuan, number][])
      .filter(([, v]) => v > 0)
      .map(([k, v]) => ({
        name: KATEGORI_LABELS[k],
        value: v,
        color: KATEGORI_COLOR[k],
      }))
      .sort((a, b) => b.value - a.value);
  }, [overview]);

  const trendChartData = useMemo(() => {
    return trend.map((t) => ({
      ...t,
      // human-readable month label "Feb"
      label: formatMonthShort(t.month),
    }));
  }, [trend]);

  const maxHeatTotal = useMemo(
    () => heatmap.reduce((m, r) => Math.max(m, r.total), 0) || 1,
    [heatmap]
  );

  const topPbt = useMemo(() => pbtPerf.slice(0, 8), [pbtPerf]);
  const topNgo = useMemo(() => ngoPerf.slice(0, 8), [ngoPerf]);

  const handleExport = (kind: "pdf" | "excel") => {
    const label = kind === "pdf" ? "PDF" : "Excel";
    toast.info(`Laporan ${label} sedang dijana…`, {
      description:
        "Fail akan dimuat turun secara automatik apabila siap. (Demo — fungsi penjanaan fail akan disambung dalam fasa akan datang.)",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-primary/10 p-2">
            <BarChart3 className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Dashboard Analitik &amp; Laporan
            </h1>
            <p className="text-sm text-muted-foreground">
              Ringkasan prestasi sistem eBantuan-PEKB merangkumi kedua-dua trek
              bantuan.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select value={String(months)} onValueChange={(v) => setMonths(Number(v))}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 Bulan Terakhir</SelectItem>
              <SelectItem value="6">6 Bulan Terakhir</SelectItem>
              <SelectItem value="12">12 Bulan Terakhir</SelectItem>
              <SelectItem value="24">24 Bulan Terakhir</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("pdf")}
            className="gap-1.5"
          >
            <FileText className="size-4" />
            Eksport PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("excel")}
            className="gap-1.5"
          >
            <FileSpreadsheet className="size-4" />
            Eksport Excel
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAll}
            className="gap-1.5"
            title="Muat semula"
          >
            <RefreshCw className="size-4" />
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {loadingOverview ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="glass-card rounded-xl p-4">
              <Skeleton className="h-10 w-10 rounded-lg mb-2" />
              <Skeleton className="h-3 w-20 mb-1" />
              <Skeleton className="h-7 w-16" />
            </div>
          ))
        ) : errorOverview ? (
          <div className="col-span-full">
            <ErrorBanner message={errorOverview} />
          </div>
        ) : (
          overview && (
            <>
              <KpiCard
                icon={Files}
                label="Total Permohonan"
                value={overview.totalApplications}
                hint="Keseluruhan sistem"
                tone="navy"
              />
              <KpiCard
                icon={CheckCircle2}
                label="Diluluskan"
                value={overview.totalApproved}
                hint={`${pct(overview.totalApproved, overview.totalApplications)} kadar lulus`}
                tone="green"
              />
              <KpiCard
                icon={XCircle}
                label="Ditolak"
                value={overview.totalRejected}
                hint={`${pct(overview.totalRejected, overview.totalApplications)} kadar tolak`}
                tone="coral"
              />
              <KpiCard
                icon={Wallet}
                label="Jumlah Nilai Diluluskan"
                value={formatRM(overview.totalValueApproved)}
                hint="Nilai bantuan diluluskan"
                tone="teal"
              />
              <KpiCard
                icon={Brain}
                label="Purata Skor AI"
                value={(overview.avgSkorAi ?? 0).toFixed(1)}
                hint="Skor kelayakan purata"
                tone="gold"
              />
              <KpiCard
                icon={AlertTriangle}
                label="Kes Pertindihan"
                value={overview.duplicateDetected}
                hint="Disyaki & disahkan"
                tone="purple"
              />
            </>
          )
        )}
      </div>

      {/* Trek comparison + Status pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <ChartCard
          title="Perbandingan Trek 1 vs Trek 2"
          description="Agihan permohonan mengikut trek dan status kelulusan."
          icon={Layers}
          className="lg:col-span-2"
        >
          {loadingTrek ? (
            <ChartSkeleton height={260} />
          ) : errorTrek ? (
            <ErrorBanner message={errorTrek} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TrekDonutCard
                title="Trek 1 · PBT"
                summary={trekComp?.bantuan_perumahan}
                color={CHART.navy}
              />
              <TrekDonutCard
                title="Trek 2 · NGO"
                summary={trekComp?.geran_pekb}
                color={CHART.teal}
              />
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Agihan Status Permohonan"
          description="Peratusan permohonan mengikut status semasa."
          icon={PieIcon}
        >
          {loadingOverview ? (
            <ChartSkeleton height={260} />
          ) : statusChartData.length === 0 ? (
            <EmptyChart label="Tiada data status tersedia." />
          ) : (
            <div className="space-y-3">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={statusChartData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {statusChartData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={<ChartTooltip />}
                    wrapperStyle={{ outline: "none" }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center text-xs">
                {statusChartData.map((entry) => (
                  <span
                    key={entry.key}
                    className="inline-flex items-center gap-1.5"
                  >
                    <span
                      className="size-2.5 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    {entry.name} ({entry.value})
                  </span>
                ))}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Monthly trend */}
      <ChartCard
        title="Tren Permohonan Bulanan"
        description={`Jumlah permohonan baharu bagi ${months} bulan terakhir, mengikut trek.`}
        icon={TrendingUp}
      >
        {loadingTrend ? (
          <ChartSkeleton height={280} />
        ) : errorTrend ? (
          <ErrorBanner message={errorTrend} />
        ) : trendChartData.length === 0 ? (
          <EmptyChart label="Tiada data tren tersedia." />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart
              data={trendChartData}
              margin={{ top: 10, right: 12, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gradBp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART.navy} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={CHART.navy} stopOpacity={0.02} />
                </linearGradient>
                <linearGradient id="gradGp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={CHART.teal} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={CHART.teal} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(100,116,139,0.18)" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 12, fill: "currentColor" }}
                stroke="rgba(100,116,139,0.4)"
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: "currentColor" }}
                stroke="rgba(100,116,139,0.4)"
                tickLine={false}
                width={32}
              />
              <Tooltip
                content={<ChartTooltip />}
                wrapperStyle={{ outline: "none" }}
              />
              <Legend
                wrapperStyle={{ fontSize: 12 }}
                iconType="circle"
                iconSize={9}
              />
              <Area
                type="monotone"
                dataKey="bantuan_perumahan"
                name="Trek 1 · PBT"
                stroke={CHART.navy}
                strokeWidth={2}
                fill="url(#gradBp)"
              />
              <Area
                type="monotone"
                dataKey="geran_pekb"
                name="Trek 2 · NGO"
                stroke={CHART.teal}
                strokeWidth={2}
                fill="url(#gradGp)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Kategori distribution + Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Agihan Kategori Bantuan"
          description="Bilangan permohonan mengikut kategori bantuan."
          icon={BarChart3}
        >
          {loadingOverview ? (
            <ChartSkeleton height={280} />
          ) : kategoriChartData.length === 0 ? (
            <EmptyChart label="Tiada data kategori tersedia." />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={kategoriChartData}
                layout="vertical"
                margin={{ top: 6, right: 16, left: 8, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(100,116,139,0.18)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "currentColor" }}
                  stroke="rgba(100,116,139,0.4)"
                  tickLine={false}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "currentColor" }}
                  stroke="rgba(100,116,139,0.4)"
                  tickLine={false}
                  width={130}
                />
                <Tooltip
                  content={<ChartTooltip />}
                  wrapperStyle={{ outline: "none" }}
                />
                <Bar
                  dataKey="value"
                  name="Bilangan"
                  radius={[0, 6, 6, 0]}
                  barSize={22}
                >
                  {kategoriChartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title="Heatmap Negeri"
          description="Agihan permohonan & nilai diluluskan mengikut negeri."
          icon={MapPin}
        >
          {loadingHeat ? (
            <ChartSkeleton height={280} />
          ) : errorHeat ? (
            <ErrorBanner message={errorHeat} />
          ) : heatmap.length === 0 ? (
            <EmptyChart label="Tiada data negeri tersedia." />
          ) : (
            <div className="max-h-[280px] overflow-y-auto scrollbar-thin pr-1">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Negeri</TableHead>
                    <TableHead className="text-xs text-right">Jumlah</TableHead>
                    <TableHead className="text-xs text-right">Lulus</TableHead>
                    <TableHead className="text-xs text-right">Nilai</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {heatmap.map((row) => {
                    const ratio = row.total / maxHeatTotal;
                    return (
                      <TableRow key={row.negeri}>
                        <TableCell
                          className="text-xs font-medium"
                          style={{
                            backgroundColor: intensityBg(ratio),
                            borderLeft: `3px solid ${CHART.teal}`,
                          }}
                        >
                          {row.negeri}
                        </TableCell>
                        <TableCell className="text-xs text-right font-semibold">
                          {row.total}
                        </TableCell>
                        <TableCell className="text-xs text-right text-emerald-700">
                          {row.approved}
                        </TableCell>
                        <TableCell className="text-xs text-right">
                          {formatRM(row.valueApproved)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </ChartCard>
      </div>

      {/* Performance tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard
          title="Prestasi PBT"
          description="PBT teratas mengikut jumlah permohonan Trek 1."
          icon={Building2}
        >
          {loadingPbt ? (
            <ChartSkeleton height={300} />
          ) : errorPbt ? (
            <ErrorBanner message={errorPbt} />
          ) : topPbt.length === 0 ? (
            <EmptyChart label="Tiada data PBT tersedia." />
          ) : (
            <div className="max-h-[320px] overflow-y-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">PBT</TableHead>
                    <TableHead className="text-xs text-right">Jumlah</TableHead>
                    <TableHead className="text-xs text-right">Lulus</TableHead>
                    <TableHead className="text-xs text-right">Kadar</TableHead>
                    <TableHead className="text-xs text-right">Skor AI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topPbt.map((p) => (
                    <TableRow key={p.pbtId}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold">
                            {p.namaPbt}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {p.kodPbt} · {p.negeri}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-right font-semibold">
                        {p.total}
                      </TableCell>
                      <TableCell className="text-xs text-right text-emerald-700">
                        {p.approved}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-medium",
                            p.total > 0 && p.approved / p.total >= 0.5
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          )}
                        >
                          {pct(p.approved, p.total)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {p.avgSkorAi.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ChartCard>

        <ChartCard
          title="Prestasi NGO"
          description="NGO teratas mengikut jumlah permohonan Trek 2."
          icon={HandHeart}
        >
          {loadingNgo ? (
            <ChartSkeleton height={300} />
          ) : errorNgo ? (
            <ErrorBanner message={errorNgo} />
          ) : topNgo.length === 0 ? (
            <EmptyChart label="Tiada data NGO tersedia." />
          ) : (
            <div className="max-h-[320px] overflow-y-auto scrollbar-thin">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">NGO</TableHead>
                    <TableHead className="text-xs text-right">Jumlah</TableHead>
                    <TableHead className="text-xs text-right">Lulus</TableHead>
                    <TableHead className="text-xs text-right">Kadar</TableHead>
                    <TableHead className="text-xs text-right">Skor AI</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topNgo.map((p) => (
                    <TableRow key={p.ngoId}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold">
                            {p.namaNgo}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {p.noAkreditasiPekb} · {p.negeriOperasi}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-right font-semibold">
                        {p.total}
                      </TableCell>
                      <TableCell className="text-xs text-right text-emerald-700">
                        {p.approved}
                      </TableCell>
                      <TableCell className="text-xs text-right">
                        <Badge
                          variant="outline"
                          className={cn(
                            "font-medium",
                            p.total > 0 && p.approved / p.total >= 0.5
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          )}
                        >
                          {pct(p.approved, p.total)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono">
                        {p.avgSkorAi.toFixed(1)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

// ============================================================
// Small helpers
// ============================================================

function pct(part: number, total: number): string {
  if (!total) return "0";
  return ((part / total) * 100).toFixed(1);
}

function formatMonthShort(ym: string): string {
  // ym = "2026-02"
  const months = [
    "Jan", "Feb", "Mac", "Apr", "Mei", "Jun",
    "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis",
  ];
  const [y, m] = ym.split("-");
  const idx = Number(m) - 1;
  if (idx < 0 || idx > 11) return ym;
  return `${months[idx]} ${y?.slice(2) ?? ""}`;
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-full min-h-[200px] flex flex-col items-center justify-center text-center gap-2">
      <BarChart3 className="size-10 text-muted-foreground/50" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
