"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Bell, BellOff, CheckCheck, Loader2, ShieldAlert, Inbox, ArrowRight,
  Mail, MessageSquare, Settings, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { formatDateTime, type Notification } from "@/lib/types";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface NotifResponse {
  data: Notification[];
  total: number;
  belumDibaca: number;
}

type FilterType = "all" | "unread" | "sistem" | "status" | "emel" | "sms";

const JENIS_BADGE: Record<string, { label: string; cls: string; icon: typeof Mail }> = {
  sistem: { label: "Sistem", cls: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300", icon: Settings },
  status: { label: "Status", cls: "bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300", icon: FileText },
  emel: { label: "Emel", cls: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300", icon: Mail },
  sms: { label: "SMS", cls: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300", icon: MessageSquare },
};

export function NotificationsView() {
  const user = useAppStore((s) => s.user);
  const setView = useAppStore((s) => s.setView);
  const setActiveApplication = useAppStore((s) => s.setActiveApplication);

  const [allNotifs, setAllNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [belumDibaca, setBelumDibaca] = useState(0);
  const [filter, setFilter] = useState<FilterType>("all");
  const [markingAll, setMarkingAll] = useState(false);
  const [markingId, setMarkingId] = useState<string | null>(null);

  const fetchNotifs = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<NotifResponse>(`/api/notifications?userId=${user.id}`);
      setAllNotifs(res.data || []);
      setBelumDibaca(res.belumDibaca || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuatkan notifikasi");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchNotifs(); }, [fetchNotifs]);

  const filtered = allNotifs.filter((n) => {
    if (filter === "all") return true;
    if (filter === "unread") return !n.dibaca;
    return n.jenis === filter;
  });

  const markAllRead = async () => {
    if (!user) return;
    setMarkingAll(true);
    try {
      await api.post(`/api/notifications/read-all?userId=${user.id}`);
      toast.success("Semua notifikasi ditandai dibaca");
      fetchNotifs();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menandai notifikasi");
    } finally {
      setMarkingAll(false);
    }
  };

  const handleClick = async (n: Notification) => {
    if (!n.dibaca) {
      setMarkingId(n.notifikasiId);
      try {
        await api.patch(`/api/notifications/${n.notifikasiId}/read`);
        setAllNotifs((prev) => prev.map((x) => x.notifikasiId === n.notifikasiId ? { ...x, dibaca: true } : x));
        setBelumDibaca((b) => Math.max(0, b - 1));
      } catch {
        /* ignore */
      } finally {
        setMarkingId(null);
      }
    }
    if (n.applicationId) {
      setActiveApplication(n.applicationId);
      setView("application-detail");
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gradient-primary flex items-center gap-2">
            <Bell className="w-7 h-7 text-primary" />
            Notifikasi
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {belumDibaca > 0 ? `${belumDibaca} notifikasi belum dibaca` : "Semua notifikasi telah dibaca"}
          </p>
        </div>
        <Button onClick={markAllRead} disabled={markingAll || belumDibaca === 0} className="bg-gradient-to-r from-primary to-accent text-white">
          {markingAll ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menandai...</> : <><CheckCheck className="w-4 h-4 mr-2" /> Tandai Semua Dibaca</>}
        </Button>
      </motion.div>

      {/* Filter */}
      <Card className="glass-card border-border/40">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground mr-1">Tapis:</span>
            {([
              { v: "all", l: "Semua" },
              { v: "unread", l: "Belum Dibaca" },
              { v: "sistem", l: "Sistem" },
              { v: "status", l: "Status" },
              { v: "emel", l: "Emel" },
              { v: "sms", l: "SMS" },
            ] as { v: FilterType; l: string }[]).map((f) => (
              <Button
                key={f.v}
                size="sm"
                variant={filter === f.v ? "default" : "outline"}
                className={filter === f.v ? "bg-gradient-to-r from-primary to-accent text-white" : "glass"}
                onClick={() => setFilter(f.v)}
              >
                {f.l}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* List */}
      {error ? (
        <Card className="glass-card border-border/40">
          <CardContent className="p-8 text-center">
            <ShieldAlert className="w-10 h-10 mx-auto text-destructive mb-2" />
            <p className="text-destructive font-medium">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchNotifs}>Cuba Semula</Button>
          </CardContent>
        </Card>
      ) : loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="glass-card border-border/40">
          <CardContent className="p-12 text-center">
            <BellOff className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="font-semibold text-lg">Tiada Notifikasi</p>
            <p className="text-sm text-muted-foreground mt-1">
              {filter === "all" ? "Anda tiada notifikasi pada masa ini." : `Tiada notifikasi untuk penapis "${filter}".`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((n, idx) => {
            const jenisCfg = JENIS_BADGE[n.jenis] || JENIS_BADGE.sistem;
            const JIcon = jenisCfg.icon;
            return (
              <motion.div
                key={n.notifikasiId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Card
                  className={`glass-card border-border/40 cursor-pointer transition-all hover:shadow-lg ${
                    !n.dibaca ? "ring-1 ring-primary/30 border-primary/30" : "opacity-90 hover:opacity-100"
                  }`}
                  onClick={() => handleClick(n)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-lg ${jenisCfg.cls} flex items-center justify-center flex-shrink-0`}>
                        {markingId === n.notifikasiId ? <Loader2 className="w-4 h-4 animate-spin" /> : <JIcon className="w-5 h-5" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {!n.dibaca && (
                            <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0" title="Belum dibaca" />
                          )}
                          <h3 className={`text-sm ${!n.dibaca ? "font-semibold" : "font-medium"}`}>{n.tajuk}</h3>
                          <Badge variant="outline" className={`text-[10px] ${jenisCfg.cls}`}>{jenisCfg.label}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{n.mesej}</p>
                        <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
                          <p className="text-xs text-muted-foreground">{formatDateTime(n.tarikhDicipta)}</p>
                          {n.applicationId && (
                            <span className="inline-flex items-center gap-1 text-xs text-primary font-medium">
                              Lihat Permohonan <ArrowRight className="w-3 h-3" />
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {allNotifs.length > 0 && (
        <div className="text-center text-xs text-muted-foreground flex items-center justify-center gap-1">
          <Inbox className="w-3 h-3" />
          {allNotifs.length} jumlah notifikasi
        </div>
      )}
    </div>
  );
}
