"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  FileText, Clock, CheckCircle2, XCircle, Plus, ListFilter,
  Building2, MapPin, Layers, Activity, Bell, Hammer, Home,
  ChevronRight, Inbox,
} from "lucide-react";

import { api } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import {
  formatRM, formatDate, type Application, type Notification,
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
  StatusBadge, KategoriBadge, SkorIndicator,
} from "@/components/shared/badges";

interface StatsResponse {
  total: number;
  byStatus: Record<string, number>;
  byTrek: Record<string, number>;
  byKategori: Record<string, number>;
  totalNilaiDiluluskan: number;
  jumlahDiluluskan: number;
  nilaiTrek1Diluluskan: number;
  nilaiTrek2Diluluskan: number;
  bilTrek1Diluluskan: number;
  bilTrek2Diluluskan: number;
  role: string;
}

interface ApplicationsResponse {
  data: Application[];
  total: number;
  page: number;
  limit: number;
}

interface NotificationsResponse {
  data: Notification[];
  total: number;
  belumDibaca: number;
}

const PENDING_STATUSES = ["dihantar", "semakan_pbt_ngo", "semakan_daerah", "semakan_negeri"];

export function PbtDashboardView() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const setActiveApplication = useAppStore((s) => s.setActiveApplication);

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [recent, setRecent] = useState<Application[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [s, apps, notifs] = await Promise.all([
          api.get<StatsResponse>(`/api/applications/stats/overview?role=pegawai_pbt`),
          api.get<ApplicationsResponse>(`/api/applications?limit=5`),
          api.get<NotificationsResponse>(`/api/notifications`),
        ]);
        if (!active) return;
        setStats(s);
        setRecent(apps.data ?? []);
        setNotifications(notifs.data ?? []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Ralat tidak diketahui";
        toast.error("Gagal memuatkan papan pemuka", { description: msg });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user]);

  const pbt = user?.pbt;
  const pendingCount = stats
    ? PENDING_STATUSES.reduce((acc, s) => acc + (stats.byStatus[s] || 0), 0)
    : 0;

  const handleOpenApplication = (id: string) => {
    setActiveApplication(id);
    setView("application-detail");
  };

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
          <p className="text-xs text-muted-foreground font-medium">Papan Pemuka PBT · Trek 1 Bantuan Perumahan</p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gradient-primary">
            Selamat datang, {user?.namaPenuh?.split(" ")[0] || "Pegawai"}
          </h1>
          {pbt && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">
                <Building2 className="w-3 h-3 mr-1" />
                {pbt.namaPbt}
              </Badge>
              <Badge variant="secondary" className="font-mono">{pbt.kodPbt}</Badge>
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setView("new-application")} className="gap-2">
            <Plus className="w-4 h-4" />
            Permohonan Baharu
          </Button>
          <Button variant="outline" onClick={() => setView("applications")} className="gap-2">
            <ListFilter className="w-4 h-4" />
            Lihat Senarai
          </Button>
        </div>
      </motion.section>

      {/* Stat cards */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          icon={FileText}
          label="Total Permohonan"
          value={stats?.total ?? 0}
          color="primary"
          loading={loading}
          trend={`${formatRM(stats?.totalNilaiDiluluskan ?? 0)} diluluskan`}
        />
        <StatCard
          icon={Clock}
          label="Sedang Diproses"
          value={pendingCount}
          color="amber"
          loading={loading}
          trend={`${stats?.byStatus?.semakan_pbt_ngo ?? 0} semakan PBT`}
        />
        <StatCard
          icon={CheckCircle2}
          label="Diluluskan"
          value={stats?.jumlahDiluluskan ?? 0}
          color="emerald"
          loading={loading}
          trend={`${stats?.bilTrek1Diluluskan ?? 0} Trek 1`}
        />
        <StatCard
          icon={XCircle}
          label="Ditolak"
          value={stats?.byStatus?.ditolak ?? 0}
          color="rose"
          loading={loading}
          trend="Kemas kini terkini"
        />
      </section>

      {/* Recent applications + side column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Recent applications table */}
        <Card className="glass-card lg:col-span-2 rounded-2xl border-border/40">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Inbox className="w-4 h-4 text-accent" />
                Permohonan Terkini
              </CardTitle>
              <CardDescription className="text-xs">5 permohonan paling baharu</CardDescription>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setView("applications")} className="gap-1 text-accent-foreground">
              Lihat semua <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="Tiada permohonan lagi"
                hint="Cipta permohonan baharu untuk mula."
                action={
                  <Button size="sm" onClick={() => setView("new-application")} className="gap-2 mt-3">
                    <Plus className="w-4 h-4" /> Permohonan Baharu
                  </Button>
                }
              />
            ) : (
              <div className="overflow-x-auto -mx-2">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>No Rujukan</TableHead>
                      <TableHead>Penerima</TableHead>
                      <TableHead className="hidden md:table-cell">Kategori</TableHead>
                      <TableHead>Skor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Tarikh</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recent.map((app) => (
                      <TableRow
                        key={app.applicationId}
                        onClick={() => handleOpenApplication(app.applicationId)}
                        className="cursor-pointer"
                      >
                        <TableCell className="font-mono text-xs font-medium">{app.noRujukan}</TableCell>
                        <TableCell className="max-w-[160px] truncate">{app.namaPenerima}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <KategoriBadge kategori={app.kategoriBantuan} />
                        </TableCell>
                        <TableCell>
                          <SkorIndicator skor={app.skorKelayakanAi} size="sm" />
                        </TableCell>
                        <TableCell><StatusBadge status={app.statusPermohonan} /></TableCell>
                        <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
                          {formatDate(app.tarikhDicipta)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Side column: PBT profile + notifications */}
        <div className="space-y-4">
          <Card className="glass-card rounded-2xl border-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="w-4 h-4 text-primary" />
                Profil PBT
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              ) : pbt ? (
                <>
                  <ProfileRow icon={Building2} label="Nama PBT" value={pbt.namaPbt} />
                  <ProfileRow icon={Layers} label="Kod PBT" value={pbt.kodPbt} mono />
                  <ProfileRow icon={MapPin} label="Negeri" value={pbt.negeri} />
                  <ProfileRow icon={MapPin} label="Daerah" value={pbt.daerah} />
                  <ProfileRow icon={Layers} label="Kategori" value={prettyLabel(pbt.kategoriPbt)} />
                  <Separator />
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status Akaun</span>
                    <Badge variant="outline" className="capitalize bg-emerald-50 text-emerald-700 border-emerald-200">
                      {prettyLabel(pbt.statusAkaunPbt)}
                    </Badge>
                  </div>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Profil PBT tidak tersedia.</p>
              )}
            </CardContent>
          </Card>

          <NotificationsPreview notifications={notifications} loading={loading} onSeeAll={() => setView("notifications")} />
        </div>
      </div>

      {/* Trek info section */}
      <TrekInfoSection />
    </div>
  );
}

// ---------------- Stat card ----------------
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
      className="glass-card rounded-2xl p-4 sm:p-5 border-border/40 relative overflow-hidden"
    >
      <div className="flex items-start justify-between">
        <div className={`rounded-xl border p-2.5 ${COLOR_MAP[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="mt-3">
        {loading ? (
          <Skeleton className="h-8 w-16 mb-2" />
        ) : (
          <div className="text-3xl font-bold tracking-tight tabular-nums">{value}</div>
        )}
        <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
        {trend && !loading && (
          <div className="text-[10px] text-muted-foreground/80 mt-2 flex items-center gap-1">
            <Activity className="w-3 h-3" />
            {trend}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ---------------- Profile row ----------------
function ProfileRow({ icon: Icon, label, value, mono }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </span>
      <span className={`text-xs font-medium text-right ${mono ? "font-mono" : ""}`}>{value || "-"}</span>
    </div>
  );
}

// ---------------- Notifications preview ----------------
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

// ---------------- Trek info ----------------
function TrekInfoSection() {
  const items = [
    {
      icon: Hammer,
      title: "Baik Pulih Rumah",
      desc: "Bantuan kerja baik pulih rumah kediaman yang rosak / usang untuk golongan B40 dan Miskin Tegar.",
      accent: "bg-amber-100 text-amber-700 border-amber-200",
    },
    {
      icon: Home,
      title: "Rumah Mesra Rakyat",
      desc: "Binaan baharu rumah mampu milik kos rendah untuk keluarga tidak memiliki rumah.",
      accent: "bg-orange-100 text-orange-700 border-orange-200",
    },
  ];
  return (
    <Card className="glass-card rounded-2xl border-border/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Layers className="w-4 h-4 text-primary" />
          Trek 1 · Bantuan Perumahan
        </CardTitle>
        <CardDescription className="text-xs">
          Dua kategori bantuan di bawah Trek 1 yang ditadbir oleh Pihak Berkuasa Tempatan (PBT).
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <div key={it.title} className="rounded-xl border border-border/40 bg-background/40 p-4 hover:shadow-sm transition-shadow">
              <div className={`inline-flex p-2.5 rounded-lg border ${it.accent}`}>
                <Icon className="w-5 h-5" />
              </div>
              <h4 className="font-semibold mt-3">{it.title}</h4>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{it.desc}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// ---------------- Helpers ----------------
function EmptyState({ icon: Icon, title, hint, action }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="rounded-full bg-muted/60 p-3 mb-3">
        <Icon className="w-6 h-6 text-muted-foreground" />
      </div>
      <p className="text-sm font-medium">{title}</p>
      {hint && <p className="text-xs text-muted-foreground mt-1">{hint}</p>}
      {action}
    </div>
  );
}

function prettyLabel(v: string): string {
  if (!v) return "-";
  return v
    .split(/[_\s]+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
