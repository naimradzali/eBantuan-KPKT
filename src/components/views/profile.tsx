"use client";

import { useCallback, useEffect, useState } from "react";
import {
  UserCircle, Pencil, KeyRound, Mail, Phone, IdCard, MapPin, Briefcase,
  Loader2, ShieldAlert, ShieldCheck, Clock, Building, Landmark, Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleBadge } from "@/components/shared/badges";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import {
  formatDateTime, formatDate, maskIC, type User, type AuditLog, type Role,
} from "@/lib/types";
import { toast } from "sonner";
import { motion } from "framer-motion";

interface MeResponse {
  user: User & {
    createdAt?: string;
    updatedAt?: string;
    pbt?: { pbtId: string; namaPbt: string; kodPbt: string; negeri: string; daerah: string; kategoriPbt: string; statusAkaunPbt: string } | null;
    ngo?: { ngoId: string; namaNgo: string; noPendaftaranRos: string; noAkreditasiPekb: string; negeriOperasi: string; daerahOperasi: string; statusAkreditasi: string } | null;
  };
}

interface AuditResponse {
  data: AuditLog[];
  total: number;
}

const TINDAKAN_STYLE: Record<string, string> = {
  lulus: "bg-emerald-100 text-emerald-700 border-emerald-200",
  tolak: "bg-red-100 text-red-700 border-red-200",
  pulangkan: "bg-amber-100 text-amber-700 border-amber-200",
  hantar_permohonan: "bg-sky-100 text-sky-700 border-sky-200",
  naik_peringkat: "bg-sky-100 text-sky-700 border-sky-200",
  log_masuk: "bg-muted text-muted-foreground",
  cipta_pengguna: "bg-purple-100 text-purple-700 border-purple-200",
  kemaskini: "bg-slate-100 text-slate-700 border-slate-200",
  kemaskini_status: "bg-slate-100 text-slate-700 border-slate-200",
  muat_naik_dokumen: "bg-teal-100 text-teal-700 border-teal-200",
};

export function ProfileView() {
  const user = useAppStore((s) => s.user);
  const setUser = useAppStore((s) => s.setUser);

  const [me, setMe] = useState<MeResponse["user"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ noTelefon: "", jawatan: "" });
  const [saving, setSaving] = useState(false);

  const [pwdOpen, setPwdOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ current: "", next: "", confirm: "" });
  const [pwdSaving, setPwdSaving] = useState(false);

  const fetchMe = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<MeResponse>(`/api/auth/me?userId=${user.id}`);
      setMe(res.user);
      setEditForm({ noTelefon: res.user.noTelefon || "", jawatan: res.user.jawatan || "" });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuatkan profil");
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchLogs = useCallback(async () => {
    if (!user) return;
    setLogsLoading(true);
    try {
      const res = await api.get<AuditResponse>(`/api/audit-logs?penggunaId=${user.id}&limit=5`);
      setRecentLogs(res.data || []);
    } catch {
      /* ignore */
    } finally {
      setLogsLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchMe(); fetchLogs(); }, [fetchMe, fetchLogs]);

  const saveProfile = async () => {
    if (!me) return;
    setSaving(true);
    try {
      const updated = await api.patch(`/api/admin/users/${me.id}`, {
        noTelefon: editForm.noTelefon,
        jawatan: editForm.jawatan,
        updatedBy: me.id,
      });
      const merged: User = { ...me, ...updated };
      setMe(merged);
      setUser(merged);
      toast.success("Profil dikemas kini");
      setEditOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan profil");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async () => {
    if (!pwdForm.next || pwdForm.next.length < 6) {
      toast.error("Kata laluan baharu mesti sekurang-kurangnya 6 aksara");
      return;
    }
    if (pwdForm.next !== pwdForm.confirm) {
      toast.error("Kata laluan baharu dan pengesahan tidak sepadan");
      return;
    }
    if (pwdForm.next === pwdForm.current) {
      toast.error("Kata laluan baharu tidak boleh sama dengan kata laluan semasa");
      return;
    }
    setPwdSaving(true);
    try {
      // Mock — use reset-password endpoint (sets to default), then we'd normally set new via a real endpoint.
      // For this PoC, we just toast success.
      await new Promise((r) => setTimeout(r, 800));
      toast.success("Kata laluan dikemaskini", {
        description: "Sila gunakan kata laluan baharu pada log masuk seterusnya.",
      });
      setPwdOpen(false);
      setPwdForm({ current: "", next: "", confirm: "" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menukar kata laluan");
    } finally {
      setPwdSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        <Skeleton className="h-9 w-48" />
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (error || !me) {
    return (
      <div className="p-8 text-center">
        <ShieldAlert className="w-10 h-10 mx-auto text-destructive mb-2" />
        <p className="text-destructive font-medium">{error || "Profil tidak tersedia"}</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={fetchMe}>Cuba Semula</Button>
      </div>
    );
  }

  const initials = me.namaPenuh?.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase() || "U";
  const isPbt = !!me.pbt;
  const isNgo = !!me.ngo;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gradient-primary flex items-center gap-2">
          <UserCircle className="w-7 h-7 text-primary" />
          Profil Pengguna
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Maklumat peribadi, gabungan organisasi & aktiviti terkini anda.
        </p>
      </motion.div>

      {/* Profile header card */}
      <Card className="glass-card border-border/40 overflow-hidden">
        <div className="h-20 bg-gradient-to-r from-primary via-primary/80 to-accent" />
        <CardContent className="p-6 -mt-12">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
              <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-2xl font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold">{me.namaPenuh}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <RoleBadge role={me.peranan as Role} />
                <Badge variant="outline" className={
                  me.statusAkaun === "aktif" ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                  : me.statusAkaun === "disekat" ? "bg-red-100 text-red-700 border-red-200"
                  : "bg-muted text-muted-foreground"
                }>
                  Akaun: {me.statusAkaun}
                </Badge>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="glass" onClick={() => setEditOpen(true)}>
                <Pencil className="w-4 h-4 mr-2" /> Kemaskini Profil
              </Button>
              <Button variant="outline" className="glass" onClick={() => setPwdOpen(true)}>
                <KeyRound className="w-4 h-4 mr-2" /> Tukar Kata Laluan
              </Button>
            </div>
          </div>

          <Separator className="my-5" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoItem icon={Mail} label="Emel" value={me.emel} />
            <InfoItem icon={Phone} label="No. Telefon" value={me.noTelefon || "-"} />
            <InfoItem icon={IdCard} label="No. Kad Pengenalan" value={maskIC(me.noKadPengenalan)} />
            <InfoItem icon={Briefcase} label="Jawatan" value={me.jawatan || "-"} />
            <InfoItem icon={MapPin} label="Negeri" value={me.negeri || "-"} />
            <InfoItem icon={Clock} label="Tarikh Dicipta" value={formatDate(me.createdAt || new Date().toISOString())} />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Affiliation card */}
        {isPbt && (
          <Card className="glass-card border-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Landmark className="w-5 h-5 text-primary" /> Gabungan PBT
              </CardTitle>
              <CardDescription>Pihak Berkuasa Tempatan yang anda wakili</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoItem icon={Building} label="Nama PBT" value={me.pbt!.namaPbt} />
              <InfoItem icon={IdCard} label="Kod PBT" value={me.pbt!.kodPbt} />
              <InfoItem icon={MapPin} label="Negeri" value={me.pbt!.negeri} />
              <InfoItem icon={MapPin} label="Daerah" value={me.pbt!.daerah} />
              <InfoItem icon={Building} label="Kategori" value={me.pbt!.kategoriPbt} />
              <InfoItem icon={ShieldCheck} label="Status PBT" value={me.pbt!.statusAkaunPbt} />
            </CardContent>
          </Card>
        )}
        {isNgo && (
          <Card className="glass-card border-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building className="w-5 h-5 text-primary" /> Gabungan NGO
              </CardTitle>
              <CardDescription>Pertubuhan Bukan Kerajaan yang anda wakili</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <InfoItem icon={Building} label="Nama NGO" value={me.ngo!.namaNgo} />
              <InfoItem icon={IdCard} label="No. Pendaftaran ROS" value={me.ngo!.noPendaftaranRos} />
              <InfoItem icon={ShieldCheck} label="No. Akreditasi PEKB" value={me.ngo!.noAkreditasiPekb} />
              <InfoItem icon={MapPin} label="Negeri Operasi" value={me.ngo!.negeriOperasi} />
              <InfoItem icon={MapPin} label="Daerah Operasi" value={me.ngo!.daerahOperasi} />
              <InfoItem icon={ShieldCheck} label="Status Akreditasi" value={me.ngo!.statusAkreditasi} />
            </CardContent>
          </Card>
        )}
        {!isPbt && !isNgo && (
          <Card className="glass-card border-border/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ShieldCheck className="w-5 h-5 text-primary" /> Akaun Sistem
              </CardTitle>
              <CardDescription>Pengguna pusat tanpa gabungan PBT/NGO</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Akaun anda adalah pengguna sistem KPKT tanpa gabungan dengan PBT atau NGO tertentu.
                Anda boleh mengakses semua modul mengikut peranan dan kebenaran yang diberikan.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Account status card */}
        <Card className="glass-card border-border/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="w-5 h-5 text-primary" /> Status Akaun
            </CardTitle>
            <CardDescription>Kesihatan akaun pengguna anda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between glass rounded-lg p-3 border border-border/40">
              <div>
                <p className="text-xs text-muted-foreground">Status Semasa</p>
                <Badge variant="outline" className={
                  me.statusAkaun === "aktif" ? "bg-emerald-100 text-emerald-700 border-emerald-200 mt-1"
                  : "bg-red-100 text-red-700 border-red-200 mt-1"
                }>
                  {me.statusAkaun === "aktif" ? "Aktif" : me.statusAkaun === "disekat" ? "Disekat" : "Tidak Aktif"}
                </Badge>
              </div>
              <ShieldCheck className={`w-8 h-8 ${me.statusAkaun === "aktif" ? "text-emerald-600" : "text-red-600"}`} />
            </div>
            <div className="flex items-center justify-between glass rounded-lg p-3 border border-border/40">
              <div>
                <p className="text-xs text-muted-foreground">Tarikh Dicipta</p>
                <p className="font-medium text-sm mt-1">{formatDate(me.createdAt || new Date().toISOString())}</p>
              </div>
              <Clock className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="flex items-center justify-between glass rounded-lg p-3 border border-border/40">
              <div>
                <p className="text-xs text-muted-foreground">Peranan</p>
                <p className="font-medium text-sm mt-1">{me.peranan}</p>
              </div>
              <UserCircle className="w-8 h-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent activity */}
      <Card className="glass-card border-border/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5 text-accent" /> Aktiviti Terkini
          </CardTitle>
          <CardDescription>5 log audit terkini anda</CardDescription>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : recentLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">Tiada aktiviti direkodkan.</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto scrollbar-thin pr-1">
              {recentLogs.map((log) => {
                const style = TINDAKAN_STYLE[log.tindakan] || "bg-muted text-muted-foreground";
                return (
                  <div key={log.logId} className="flex items-center gap-3 glass rounded-lg p-3 border border-border/40">
                    <Badge variant="outline" className={`text-[10px] ${style}`}>{log.tindakan}</Badge>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{log.perincian || "-"}</p>
                      <p className="text-xs text-muted-foreground">{formatDateTime(log.capMasa)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Profile Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" /> Kemaskini Profil
            </DialogTitle>
            <DialogDescription>
              Kemas kini maklumat peribadi anda. Nama, emel dan No. KP tidak boleh diubah suai — sila hubungi pentadbir sistem.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Nama Penuh</Label>
              <Input value={me.namaPenuh} disabled className="bg-muted/50" />
              <p className="text-[10px] text-muted-foreground mt-1">Dikunci — hubungi pentadbir untuk menukar nama</p>
            </div>
            <div>
              <Label>Emel</Label>
              <Input value={me.emel} disabled className="bg-muted/50" />
              <p className="text-[10px] text-muted-foreground mt-1">Dikunci — hubungi pentadbir untuk menukar emel</p>
            </div>
            <div>
              <Label htmlFor="noTelefon">No. Telefon</Label>
              <Input id="noTelefon" value={editForm.noTelefon} onChange={(e) => setEditForm({ ...editForm, noTelefon: e.target.value })} placeholder="012-3456789" />
            </div>
            <div>
              <Label htmlFor="jawatan">Jawatan</Label>
              <Input id="jawatan" value={editForm.jawatan} onChange={(e) => setEditForm({ ...editForm, jawatan: e.target.value })} placeholder="Cth: Pegawai Penyelia" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={saveProfile} disabled={saving} className="bg-gradient-to-r from-primary to-accent text-white">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Change Password Dialog */}
      <Dialog open={pwdOpen} onOpenChange={setPwdOpen}>
        <DialogContent className="glass-strong max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-primary" /> Tukar Kata Laluan
            </DialogTitle>
            <DialogDescription>
              Masukkan kata laluan semasa dan kata laluan baharu anda.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label htmlFor="pwdCurrent">Kata Laluan Semasa</Label>
              <Input id="pwdCurrent" type="password" value={pwdForm.current} onChange={(e) => setPwdForm({ ...pwdForm, current: e.target.value })} placeholder="••••••••" />
            </div>
            <div>
              <Label htmlFor="pwdNext">Kata Laluan Baharu</Label>
              <Input id="pwdNext" type="password" value={pwdForm.next} onChange={(e) => setPwdForm({ ...pwdForm, next: e.target.value })} placeholder="Minimum 6 aksara" />
            </div>
            <div>
              <Label htmlFor="pwdConfirm">Sahkan Kata Laluan Baharu</Label>
              <Input id="pwdConfirm" type="password" value={pwdForm.confirm} onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })} placeholder="••••••••" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPwdOpen(false)} disabled={pwdSaving}>Batal</Button>
            <Button onClick={changePassword} disabled={pwdSaving} className="bg-gradient-to-r from-primary to-accent text-white">
              {pwdSaving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menukar...</> : "Tukar Kata Laluan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: typeof Mail; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-sm truncate">{value}</p>
      </div>
    </div>
  );
}
