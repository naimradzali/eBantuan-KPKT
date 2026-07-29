"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";
import {
  FileText, Building2, HeartHandshake, CheckCircle2, XCircle,
  Banknote, Activity, Bell, ClipboardCheck, ChevronRight, TrendingUp,
  ArrowUpRight, ShieldAlert, Gauge,
} from "lucide-react";

import { api } from "@/lib/api-client";
import { useAppStore, useRoleAccess } from "@/lib/store";
import {
  formatRM, formatDate, formatDateTime, maskIC,
  type Application, type Notification, type AuditLog,
  type Role, ROLE_LABELS,
} from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  StatusBadge, SkorIndicator, TrekBadge, RoleBadge,
} from "@/components/shared/badges";

// ============ Response shapes ============
interface OverviewResponse {
  totalApplications: number;
  totalApproved: number;
  totalRejected: number;
  totalPending: number;
  totalValueApproved: number;
  byTrek: {
    bantuan_perumahan: TrekStat;
    geran_pekb: TrekStat;
  };
  byStatus: Record<string, number>;
  byKategori: Record<string, number>;
  byNegeri: { negeri: string; count: number; approved: number; value: number }[];
  avgSkorAi: number;
  duplicateDetected: number;
}
interface TrekStat { total: number; approved: number; pending: number; rejected: number; valueApproved: number; }
interface TrekComparisonResponse {
  bantuan_perumahan: TrekStat & { byNegeri: { negeri: string; total: number; approved: number; value: number }[] };
  geran_pekb: TrekStat & { byNegeri: { negeri: string; total: number; approved: number; value: number }[] };
}
interface TrendPoint { month: string; bantuan_perumahan: number; geran_pekb: number; approved: number; }
interface ApplicationsResponse { data: Application[]; total: number; page: number; limit: number; }
interface AuditLogsResponse { data: AuditLog[]; total: number; page: number; limit: number; }
interface NotificationsResponse { data: Notification[]; total: number; belumDibaca: number; }

const HIGH_VALUE_THRESHOLD = 50000;

export function KpktDashboardView() {
  const user = useAppStore((s) => s.user);
  const role = user?.peranan as Role | undefined;
  const setView = useAppStore((s) => s.setView);
  const setActiveApplication = useAppStore((s) => s.setActiveApplication);
  const { isPusat } = useRoleAccess();

  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [comparison, setComparison] = useState<TrekComparisonResponse | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [pending, setPending] = useState<Application[]>([]);
  const [highValue, setHighValue] = useState<Application[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        // Status to fetch depends on peringkat — Daerah uses semakan_daerah, Negeri/Pusat uses semakan_negeri.
        const pendingStatus = isPusat ? "semakan_negeri" : "semakan_daerah";
        const [ov, cmp, tr, pen, hv, lg, no] = await Promise.all([
          api.get<OverviewResponse>(`/api/analytics/overview`),
          api.get<TrekComparisonResponse>(`/api/analytics/trek-comparison`),
          api.get<TrendPoint[]>(`/api/analytics/trend?months=6`),
          api.get<ApplicationsResponse>(`/api/applications?status=${pendingStatus}&limit=10`),
          // High-value pending: broader set across multiple review stages
          api.get<ApplicationsResponse>(`/api/applications?status=semakan_negeri&limit=50`),
          api.get<AuditLogsResponse>(`/api/audit-logs?limit=5`),
          api.get<NotificationsResponse>(`/api/notifications`),
        ]);
        if (!active) return;
        setOverview(ov);
        setComparison(cmp);
        setTrend(tr ?? []);
        setPending(pen.data ?? []);
        setHighValue((hv.data ?? []).filter((a) => appValue(a) >= HIGH_VALUE_THRESHOLD).slice(0, 5));
        setLogs(lg.data ?? []);
        setNotifications(no.data ?? []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Ralat tidak diketahui";
        toast.error("Gagal memuatkan papan pemuka KPKT", { description: msg });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user, isPusat]);

  const handleOpenApplication = (id: string) => {
    setActiveApplication(id);
    setView("application-detail");
  };

  const handleOpenReview = (id: string) => {
    setActiveApplication(id);
    setView("review-queue");
  };

  const chartData = useMemo(() => trend.map((t) => ({
    month: formatMonthShort(t.month),
    "Trek 1 · PBT": t.bantuan_perumahan,
    "Trek 2 · NGO": t.geran_pekb,
  })), [trend]);

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <motion.section
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="glass-card rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div className="space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">
            Papan Pemuka KPKT · {isPusat ? "Peringkat Pusat" : "Daerah / Negeri"}
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gradient-primary">
            Selamat datang, {user?.namaPenuh?.split(" ")[0] || "Pegawai"}
          </h1>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {role && <RoleBadge role={role} />}
            <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">
              <ShieldAlert className="w-3 h-3 mr-1" />
              {ROLE_LABELS[role ?? "pegawai_kpkt"]}
            </Badge>
            {overview && overview.duplicateDetected > 0 && (
              <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200">
                {overview.duplicateDetected} pertindihan dikesan
              </Badge>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setView("review-queue")} className="gap-2">
            <ClipboardCheck className="w-4 h-4" />
            Baris Semakan
          </Button>
          <Button variant="outline" onClick={() => setView("analytics")} className="gap-2">
            <TrendingUp className="w-4 h-4" />
            Analitik Penuh
          </Button>
        </div>
      </motion.section>

      {/* Overview stat cards */}
      <section className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
        <StatCard icon={FileText} label="Total Permohonan" value={overview?.totalApplications ?? 0} color="primary" loading={loading} trend="Kedua-dua trek" />
        <StatCard icon={Building2} label="Trek 1 · PBT" value={overview?.byTrek?.bantuan_perumahan.total ?? 0} color="navy" loading={loading} trend={`${overview?.byTrek?.bantuan_perumahan.approved ?? 0} diluluskan`} />
        <StatCard icon={HeartHandshake} label="Trek 2 · NGO" value={overview?.byTrek?.geran_pekb.total ?? 0} color="teal" loading={loading} trend={`${overview?.byTrek?.geran_pekb.approved ?? 0} diluluskan`} />
        <StatCard icon={CheckCircle2} label="Diluluskan" value={overview?.totalApproved ?? 0} color="emerald" loading={loading} trend={`${overview?.totalPending ?? 0} dalam proses`} />
        <StatCard icon={XCircle} label="Ditolak" value={overview?.totalRejected ?? 0} color="rose" loading={loading} trend="Kemas kini terkini" />
        <StatCard icon={Banknote} label="Nilai Diluluskan" value={formatRM(overview?.totalValueApproved ?? 0)} color="amber" loading={loading} trend={`Skor AI avg: ${overview?.avgSkorAi?.toFixed(1) ?? "-"}`} />
      </section>

      {/* Trek comparison */}
      <Card className="glass-card rounded-2xl border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-accent" />
            Perbandingan Trek 1 vs Trek 2
          </CardTitle>
          <CardDescription className="text-xs">
            Perbandingan jumlah, kelulusan, dan nilai diluluskan antara dua trek bantuan.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <>
              <Skeleton className="h-40 w-full rounded-xl" />
              <Skeleton className="h-40 w-full rounded-xl" />
            </>
          ) : comparison ? (
            <>
              <TrekComparisonCard trek="bantuan_perumahan" data={comparison.bantuan_perumahan} />
              <TrekComparisonCard trek="geran_pekb" data={comparison.geran_pekb} />
            </>
          ) : null}
        </CardContent>
      </Card>

      {/* Trend chart */}
      <Card className="glass-card rounded-2xl border-border/40">
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="w-4 h-4 text-primary" />
              Tren Bulanan (6 bulan terakhir)
            </CardTitle>
            <CardDescription className="text-xs">Bilangan permohonan baharu mengikut trek.</CardDescription>
          </div>
          <Button size="sm" variant="ghost" onClick={() => setView("analytics")} className="gap-1 text-xs">
            Analitik penuh <ChevronRight className="w-3 h-3" />
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full rounded-xl" />
          ) : chartData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-12">Tiada data tren buat sementara.</p>
          ) : (
            <div className="w-full h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" vertical={false} />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "rgba(255,255,255,0.95)",
                      border: "1px solid rgba(148,163,184,0.2)",
                      borderRadius: 12,
                      fontSize: 12,
                      backdropFilter: "blur(8px)",
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="Trek 1 · PBT" fill="oklch(0.32 0.08 250)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Trek 2 · NGO" fill="oklch(0.7 0.11 195)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending review + side column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="glass-card lg:col-span-2 rounded-2xl border-border/40">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-amber-500" />
                Baris Semakan
              </CardTitle>
              <CardDescription className="text-xs">
                Permohonan menunggu semakan di peringkat {isPusat ? "Pusat / Negeri" : "Daerah"}.
              </CardDescription>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setView("review-queue")} className="gap-1 text-xs">
              Semua <ChevronRight className="w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : pending.length === 0 ? (
              <div className="text-center py-8">
                <ClipboardCheck className="w-8 h-8 mx-auto text-muted-foreground/40" />
                <p className="text-sm font-medium mt-2">Baris semakan kosong</p>
                <p className="text-xs text-muted-foreground">Tiada permohonan menunggu semakan di peringkat anda.</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No Rujukan</TableHead>
                      <TableHead>Trek</TableHead>
                      <TableHead>Penerima</TableHead>
                      <TableHead>Skor</TableHead>
                      <TableHead className="text-right">Tindakan</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pending.map((app) => (
                      <TableRow key={app.applicationId}>
                        <TableCell className="font-mono text-xs font-medium">{app.noRujukan}</TableCell>
                        <TableCell><TrekBadge trek={app.trek} /></TableCell>
                        <TableCell className="max-w-[180px]">
                          <div className="truncate">{app.namaPenerima}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">{maskIC(app.noKpPenerima)}</div>
                        </TableCell>
                        <TableCell><SkorIndicator skor={app.skorKelayakanAi} size="sm" /></TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => handleOpenReview(app.applicationId)} className="gap-1">
                            Semak <ArrowUpRight className="w-3 h-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Side column */}
        <div className="space-y-4">
          {/* High-value pending (Pusat only) */}
          {isPusat && (
            <Card className="glass-card rounded-2xl border-border/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Banknote className="w-4 h-4 text-amber-500" />
                  Kelulusan Nilai Tinggi
                </CardTitle>
                <CardDescription className="text-xs">
                  Permohonan ≥ {formatRM(HIGH_VALUE_THRESHOLD)} menunggu kelulusan pusat.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : highValue.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-4">Tiada permohonan nilai tinggi.</p>
                ) : (
                  highValue.map((a) => (
                    <button
                      key={a.applicationId}
                      onClick={() => handleOpenApplication(a.applicationId)}
                      className="w-full text-left rounded-lg border border-border/40 bg-background/40 p-3 hover:bg-muted/40 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-medium truncate">{a.noRujukan}</span>
                        <span className="text-xs font-bold text-amber-700">{formatRM(appValue(a))}</span>
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{a.namaPenerima}</div>
                    </button>
                  ))
                )}
              </CardContent>
            </Card>
          )}

          {/* Recent activity */}
          <Card className="glass-card rounded-2xl border-border/40">
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-4 h-4 text-primary" />
                Aktiviti Terkini
              </CardTitle>
              <Button size="sm" variant="ghost" onClick={() => setView("admin-audit")} className="gap-1 text-xs">
                Log <ChevronRight className="w-3 h-3" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              ) : logs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">Tiada aktiviti terkini.</p>
              ) : (
                logs.map((log) => (
                  <div key={log.logId} className="flex items-start gap-2.5">
                    <div className="mt-0.5 w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-tight">
                        <span className="font-mono">{log.tindakan}</span>
                        {log.pengguna?.namaPenuh && (
                          <span className="text-muted-foreground"> · {log.pengguna.namaPenuh}</span>
                        )}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{log.perincian}</p>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">{formatDateTime(log.capMasa)}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Notifications */}
          <NotificationsPreview notifications={notifications} loading={loading} onSeeAll={() => setView("notifications")} />
        </div>
      </div>
    </div>
  );
}

// ============ Stat card ============
interface StatCardProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  trend?: string;
  color: "primary" | "amber" | "emerald" | "rose" | "teal" | "navy";
  loading?: boolean;
}
const COLOR_MAP: Record<StatCardProps["color"], string> = {
  primary: "bg-primary/10 text-primary border-primary/20",
  navy: "bg-primary/10 text-primary border-primary/20",
  amber: "bg-amber-100 text-amber-700 border-amber-200",
  emerald: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rose: "bg-rose-100 text-rose-700 border-rose-200",
  teal: "bg-accent/10 text-accent-foreground border-accent/30",
};
function StatCard({ icon: Icon, label, value, trend, color, loading }: StatCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className="glass-card rounded-2xl p-4 border-border/40 relative overflow-hidden"
    >
      <div className={`rounded-xl border p-2.5 inline-flex ${COLOR_MAP[color]}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="mt-3">
        {loading ? (
          <Skeleton className="h-7 w-16 mb-2" />
        ) : (
          <div className="text-2xl font-bold tracking-tight tabular-nums leading-tight">{value}</div>
        )}
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        {trend && !loading && (
          <div className="text-[10px] text-muted-foreground/80 mt-1.5 flex items-center gap-1">
            <Activity className="w-3 h-3" />
            {trend}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============ Trek comparison card ============
function TrekComparisonCard({ trek, data }: { trek: "bantuan_perumahan" | "geran_pekb"; data: TrekStat }) {
  return (
    <div className="rounded-xl border border-border/40 bg-background/40 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <TrekBadge trek={trek} />
        <span className="text-2xl font-bold tabular-nums">{data.total}</span>
      </div>
      <Separator />
      <div className="grid grid-cols-2 gap-y-2 gap-x-3 text-xs">
        <ComparisonRow label="Diluluskan" value={data.approved} color="text-emerald-600" />
        <ComparisonRow label="Dalam Proses" value={data.pending} color="text-amber-600" />
        <ComparisonRow label="Ditolak" value={data.rejected} color="text-rose-600" />
        <ComparisonRow label="Kadar Lulus" value={`${data.total ? Math.round((data.approved / data.total) * 100) : 0}%`} color="text-primary" />
      </div>
      <Separator />
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Nilai Diluluskan</span>
        <span className="font-bold text-primary">{formatRM(data.valueApproved)}</span>
      </div>
    </div>
  );
}
function ComparisonRow({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-bold ${color}`}>{value}</span>
    </div>
  );
}

// ============ Notifications preview ============
function NotificationsPreview({ notifications, loading, onSeeAll }: {
  notifications: Notification[];
  loading: boolean;
  onSeeAll: () => void;
}) {
  return (
    <Card className="glass-card rounded-2xl border-border/40">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2 text-base">
          <Bell className="w-4 h-4 text-amber-500" />
          Notifikasi
        </CardTitle>
        <Button size="sm" variant="ghost" onClick={onSeeAll} className="gap-1 text-xs">
          Semua <ChevronRight className="w-3 h-3" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : notifications.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Tiada notifikasi baru.</p>
        ) : (
          notifications.slice(0, 3).map((n) => (
            <div key={n.notifikasiId} className="rounded-lg border border-border/40 bg-background/50 p-3 hover:bg-muted/40 transition-colors">
              <div className="flex items-start gap-2">
                {!n.dibaca && <span className="mt-1 w-2 h-2 rounded-full bg-accent flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold leading-tight truncate">{n.tajuk}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.mesej}</p>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">{formatDate(n.tarikhDicipta)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

// ============ Helpers ============
function appValue(a: Application): number {
  return (a.nilaiAnggaranKerja ?? 0) + (a.nilaiGeranDipohon ?? 0);
}

function formatMonthShort(month: string): string {
  // month = "2026-02"
  if (!month || month.length < 7) return month;
  const [y, m] = month.split("-");
  const months = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogo", "Sep", "Okt", "Nov", "Dis"];
  const idx = parseInt(m, 10) - 1;
  if (idx < 0 || idx > 11) return month;
  return `${months[idx]} ${y.slice(2)}`;
}
