"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  Users, Building2, HeartHandshake, FileText, Banknote,
  Cpu, ScrollText, Sparkles, ShieldCheck, Activity, ChevronRight,
  Hash, Crown, Server, ToggleRight, ToggleLeft, Gauge, UserCircle,
} from "lucide-react";

import { api } from "@/lib/api-client";
import { useAppStore, type AppView } from "@/lib/store";
import {
  formatRM, formatDateTime, maskIC,
  type AiConfig, type AuditLog, type User,
  ROLE_LABELS,
} from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { RoleBadge } from "@/components/shared/badges";

// ============ Response shapes ============
interface OverviewResponse {
  totalApplications: number;
  totalApproved: number;
  totalValueApproved: number;
}
interface UsersResponse { data: User[]; total: number; page: number; limit: number; totalPages: number; }
interface PbtResponse { data: unknown[]; total: number; page: number; limit: number; }
interface NgoResponse { data: unknown[]; total: number; page: number; limit: number; }
interface AuditLogsResponse { data: AuditLog[]; total: number; page: number; limit: number; }

export function AdminDashboardView() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);

  const [overview, setOverview] = useState<OverviewResponse | null>(null);
  const [usersTotal, setUsersTotal] = useState(0);
  const [pbtTotal, setPbtTotal] = useState(0);
  const [ngoTotal, setNgoTotal] = useState(0);
  const [aiConfig, setAiConfig] = useState<AiConfig | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const [ov, us, pbt, ngo, cfg, lg, usRecent] = await Promise.all([
          api.get<OverviewResponse>(`/api/analytics/overview`),
          api.get<UsersResponse>(`/api/admin/users?limit=1`),
          api.get<PbtResponse>(`/api/admin/pbt?limit=1`),
          api.get<NgoResponse>(`/api/admin/ngo?limit=1`),
          api.get<AiConfig>(`/api/ai/config`),
          api.get<AuditLogsResponse>(`/api/admin/audit-logs?limit=8`),
          api.get<UsersResponse>(`/api/admin/users?limit=5`),
        ]);
        if (!active) return;
        setOverview(ov);
        setUsersTotal(us.total ?? 0);
        setPbtTotal(pbt.total ?? 0);
        setNgoTotal(ngo.total ?? 0);
        setAiConfig(cfg);
        setLogs(lg.data ?? []);
        setRecentUsers(usRecent.data ?? []);
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Ralat tidak diketahui";
        toast.error("Gagal memuatkan papan pemuka pentadbir", { description: msg });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [user]);

  const totalValueApproved = overview?.totalValueApproved ?? 0;

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
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <Crown className="w-3 h-3" />
            Pentadbiran Sistem · KPKT Malaysia
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gradient-primary">
            Pusat Pentadbiran Sistem
          </h1>
          <p className="text-xs text-muted-foreground">
            Urus pengguna, profil PBT/NGO, log audit, dan konfigurasi AI sistem eBantuan-PEKB.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-primary/5 border-primary/20 text-primary">
            <ShieldCheck className="w-3 h-3 mr-1" />
            Pentadbir
          </Badge>
          {user && <RoleBadge role={user.peranan} />}
        </div>
      </motion.section>

      {/* System overview cards */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard icon={Users} label="Total Pengguna" value={usersTotal} color="primary" loading={loading} trend="Semua peranan" />
        <StatCard icon={Building2} label="Total PBT" value={pbtTotal} color="navy" loading={loading} trend="Profil PBT" />
        <StatCard icon={HeartHandshake} label="Total NGO" value={ngoTotal} color="teal" loading={loading} trend="Profil NGO" />
        <StatCard icon={FileText} label="Total Permohonan" value={overview?.totalApplications ?? 0} color="amber" loading={loading} trend={`${overview?.totalApproved ?? 0} diluluskan`} />
        <StatCard icon={Banknote} label="Nilai Diluluskan" value={formatRM(totalValueApproved)} color="emerald" loading={loading} trend="Jumlah nilai diluluskan" />
      </section>

      {/* Quick admin links + System health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Quick admin links */}
        <Card className="glass-card lg:col-span-2 rounded-2xl border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="w-4 h-4 text-accent" />
              Pintasan Pentadbiran
            </CardTitle>
            <CardDescription className="text-xs">Akses pantar ke modul pentadbiran utama.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AdminLinkCard
              icon={Users}
              title="Pengurusan Pengguna"
              desc="Cipta, edit, dan urus akaun semua peranan pengguna."
              view="admin-users"
              accent="bg-primary/10 text-primary border-primary/20"
              setView={setView}
            />
            <AdminLinkCard
              icon={Building2}
              title="Profil PBT & NGO"
              desc="Urus profil PBT dan NGO berakreditasi PEKB."
              view="admin-pbt-ngo"
              accent="bg-accent/10 text-accent-foreground border-accent/30"
              setView={setView}
            />
            <AdminLinkCard
              icon={ScrollText}
              title="Log Audit"
              desc="Jejak semua tindakan pengguna dan perubahan sistem."
              view="admin-audit"
              accent="bg-amber-100 text-amber-700 border-amber-200"
              setView={setView}
            />
            <AdminLinkCard
              icon={Cpu}
              title="Konfigurasi AI"
              desc="Tetapkan ambang skor, model AI, dan modul aktif."
              view="admin-ai-config"
              accent="bg-emerald-100 text-emerald-700 border-emerald-200"
              setView={setView}
            />
          </CardContent>
        </Card>

        {/* System health */}
        <Card className="glass-card rounded-2xl border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Server className="w-4 h-4 text-emerald-500" />
              Kesihatan Sistem
            </CardTitle>
            <CardDescription className="text-xs">Status modul AI dan konfigurasi semasa.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : aiConfig ? (
              <>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5" /> Model AI
                  </span>
                  <Badge variant="secondary" className="font-mono">{aiConfig.modelAi}</Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5" /> Ambang Lulus
                  </span>
                  <span className="font-bold text-emerald-600">{aiConfig.ambangSkorLulus}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Gauge className="w-3.5 h-3.5" /> Ambang Semak
                  </span>
                  <span className="font-bold text-amber-600">{aiConfig.ambangSkorSemak}</span>
                </div>
                <Separator />
                <div className="space-y-1.5">
                  <AiToggle label="Saringan Kelayakan AI" enabled={aiConfig.enableAiScreening} />
                  <AiToggle label="Pengesahan Dokumen AI" enabled={aiConfig.enableAiDocVerify} />
                  <AiToggle label="Chatbot PEKB" enabled={aiConfig.enableAiChatbot} />
                  <AiToggle label="Pengesanan Penipuan" enabled={aiConfig.enableAiFraud} />
                </div>
                <Button size="sm" variant="outline" className="w-full mt-2 gap-1" onClick={() => setView("admin-ai-config")}>
                  <Cpu className="w-3.5 h-3.5" />
                  Konfigurasi AI
                </Button>
              </>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-4">Konfigurasi AI tidak tersedia.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent audit logs + recent user registrations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Audit logs */}
        <Card className="glass-card lg:col-span-2 rounded-2xl border-border/40">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <ScrollText className="w-4 h-4 text-primary" />
                Log Audit Terkini
              </CardTitle>
              <CardDescription className="text-xs">8 tindakan terbaharu dalam sistem.</CardDescription>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setView("admin-audit")} className="gap-1 text-xs">
              Semua <ChevronRight className="w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : logs.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Tiada log audit.</p>
            ) : (
              <div className="overflow-x-auto -mx-2 max-h-96 scrollbar-thin">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tindakan</TableHead>
                      <TableHead className="hidden sm:table-cell">Pengguna</TableHead>
                      <TableHead>Perincian</TableHead>
                      <TableHead className="hidden md:table-cell">Cap Masa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.logId}>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-[10px] bg-primary/5 border-primary/20 text-primary">
                            {log.tindakan}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          {log.pengguna ? (
                            <div className="text-xs">
                              <div className="font-medium truncate max-w-[140px]">{log.pengguna.namaPenuh}</div>
                              <div className="text-[10px] text-muted-foreground">{ROLE_LABELS[log.pengguna.peranan] ?? log.pengguna.peranan}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[280px] truncate">{log.perincian}</TableCell>
                        <TableCell className="hidden md:table-cell text-xs text-muted-foreground whitespace-nowrap">{formatDateTime(log.capMasa)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent user registrations */}
        <Card className="glass-card rounded-2xl border-border/40">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCircle className="w-4 h-4 text-accent" />
              Pendaftaran Baharu
            </CardTitle>
            <Button size="sm" variant="ghost" onClick={() => setView("admin-users")} className="gap-1 text-xs">
              Semua <ChevronRight className="w-3 h-3" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {loading ? (
              <div className="space-y-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : recentUsers.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">Tiada pendaftaran terbaharu.</p>
            ) : (
              recentUsers.map((u) => (
                <div key={u.id} className="rounded-lg border border-border/40 bg-background/40 p-3 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold truncate">{u.namaPenuh}</div>
                      <div className="text-[10px] text-muted-foreground font-mono truncate">{maskIC(u.noKadPengenalan)}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px] flex-shrink-0">
                      {ROLE_LABELS[u.peranan] ?? u.peranan}
                    </Badge>
                  </div>
                  {u.emel && (
                    <div className="text-[10px] text-muted-foreground/80 truncate mt-1 flex items-center gap-1">
                      <Hash className="w-2.5 h-2.5" />
                      {u.emel}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>
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

// ============ Admin link card ============
function AdminLinkCard({ icon: Icon, title, desc, view, accent, setView }: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  view: AppView;
  accent: string;
  setView: (v: AppView) => void;
}) {
  return (
    <button
      onClick={() => setView(view)}
      className="group text-left rounded-xl border border-border/40 bg-background/40 p-4 hover:shadow-md hover:border-accent/30 transition-all"
    >
      <div className="flex items-start justify-between">
        <div className={`inline-flex p-2.5 rounded-lg border ${accent}`}>
          <Icon className="w-5 h-5" />
        </div>
        <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-accent group-hover:translate-x-0.5 transition-all" />
      </div>
      <h4 className="font-semibold mt-3 text-sm">{title}</h4>
      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{desc}</p>
    </button>
  );
}

// ============ AI toggle indicator ============
function AiToggle({ label, enabled }: { label: string; enabled: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground flex items-center gap-1.5">
        {enabled ? (
          <ToggleRight className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <ToggleLeft className="w-3.5 h-3.5 text-muted-foreground/50" />
        )}
        {label}
      </span>
      <Badge
        variant="outline"
        className={
          enabled
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]"
            : "bg-muted text-muted-foreground text-[10px]"
        }
      >
        {enabled ? "Aktif" : "Tidak Aktif"}
      </Badge>
    </div>
  );
}
