"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Users, UserPlus, Search, Pencil, KeyRound, Ban, CheckCircle2, Loader2,
  ShieldAlert, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { RoleBadge } from "@/components/shared/badges";
import { api } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import {
  ROLE_LABELS, maskIC, formatDate, type Role, type User,
} from "@/lib/types";
import { toast } from "sonner";
import { motion } from "framer-motion";

// ============ Roles (excluding admin from creation list — admin handles it) ============
const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "pegawai_pbt", label: "Pegawai PBT" },
  { value: "penilai_pbt", label: "Penilai PBT" },
  { value: "wakil_ngo", label: "Wakil NGO" },
  { value: "penilai_ngo", label: "Penilai NGO" },
  { value: "pegawai_kpkt", label: "Pegawai KPKT Daerah/Negeri" },
  { value: "pegawai_kpkt_pusat", label: "Pegawai KPKT Pusat" },
  { value: "admin", label: "Pentadbir Sistem" },
];

const STATUS_OPTIONS = [
  { value: "aktif", label: "Aktif" },
  { value: "disekat", label: "Disekat" },
  { value: "tidak_aktif", label: "Tidak Aktif" },
];

const NEGERI_LIST = [
  "Wilayah Persekutuan Kuala Lumpur",
  "Wilayah Persekutuan Putrajaya",
  "Wilayah Persekutuan Labuan",
  "Selangor", "Pulau Pinang", "Johor", "Kedah", "Kelantan",
  "Melaka", "Negeri Sembilan", "Pahang", "Perak", "Perlis",
  "Sabah", "Sarawak", "Terengganu",
];

interface UserRow extends User {
  pbt?: { pbtId: string; namaPbt: string; kodPbt: string; negeri: string } | null;
  ngo?: { ngoId: string; namaNgo: string; noAkreditasiPekb: string; negeriOperasi: string } | null;
}

interface ListResponse {
  data: UserRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PbtOption { pbtId: string; namaPbt: string; kodPbt: string; }
interface NgoOption { ngoId: string; namaNgo: string; noAkreditasiPekb: string; }

const EMPTY_FORM: UserFormState = {
  namaPenuh: "", noKadPengenalan: "", emel: "", noTelefon: "",
  peranan: "pegawai_pbt" as Role, kataLaluan: "",
  pbtId: "", ngoId: "", negeri: NEGERI_LIST[0], jawatan: "",
};

interface UserFormState {
  namaPenuh: string;
  noKadPengenalan: string;
  emel: string;
  noTelefon: string;
  peranan: Role;
  kataLaluan: string;
  pbtId: string;
  ngoId: string;
  negeri: string;
  jawatan: string;
}

export function AdminUsersView() {
  const currentUser = useAppStore((s) => s.user);

  const [rows, setRows] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [pbtOptions, setPbtOptions] = useState<PbtOption[]>([]);
  const [ngoOptions, setNgoOptions] = useState<NgoOption[]>([]);
  const [pbtFilter, setPbtFilter] = useState<string>("");
  const [ngoFilter, setNgoFilter] = useState<string>("");

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserFormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  // Reset password
  const [resetTarget, setResetTarget] = useState<UserRow | null>(null);
  const [resetting, setResetting] = useState(false);

  // Block/unblock confirm
  const [blockTarget, setBlockTarget] = useState<UserRow | null>(null);
  const [toggling, setToggling] = useState(false);

  // Load PBT/NGO options once
  useEffect(() => {
    (async () => {
      try {
        const [pbtRes, ngoRes] = await Promise.all([
          api.get<{ data: PbtOption[] }>("/api/admin/pbt?limit=100"),
          api.get<{ data: NgoOption[] }>("/api/admin/ngo?limit=100"),
        ]);
        setPbtOptions(pbtRes.data || []);
        setNgoOptions(ngoRes.data || []);
      } catch { /* ignore */ }
    })();
  }, []);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page), limit: String(limit),
      });
      if (search) params.set("search", search);
      if (roleFilter) params.set("role", roleFilter);
      if (statusFilter) params.set("statusAkaun", statusFilter);
      const res = await api.get<ListResponse>(`/api/admin/users?${params.toString()}`);
      let data = res.data || [];
      // Client-side PBT/NGO affiliation filter (server doesn't expose)
      if (pbtFilter) data = data.filter((u) => u.pbtId === pbtFilter);
      if (ngoFilter) data = data.filter((u) => u.ngoId === ngoFilter);
      setRows(data);
      setTotal(res.total);
      setTotalPages(Math.max(1, res.totalPages));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuatkan pengguna");
    } finally {
      setLoading(false);
    }
  }, [page, search, roleFilter, statusFilter, pbtFilter, ngoFilter]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Debounced search trigger (reset to page 1)
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const openAdd = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (u: UserRow) => {
    setEditingId(u.id);
    setForm({
      namaPenuh: u.namaPenuh,
      noKadPengenalan: u.noKadPengenalan,
      emel: u.emel,
      noTelefon: u.noTelefon || "",
      peranan: u.peranan,
      kataLaluan: "",
      pbtId: u.pbtId || "",
      ngoId: u.ngoId || "",
      negeri: u.negeri || NEGERI_LIST[0],
      jawatan: u.jawatan || "",
    });
    setDialogOpen(true);
  };

  const isPbtRole = (r: Role) => r === "pegawai_pbt" || r === "penilai_pbt";
  const isNgoRole = (r: Role) => r === "wakil_ngo" || r === "penilai_ngo";

  const submitForm = async () => {
    if (!form.namaPenuh || !form.noKadPengenalan || !form.emel) {
      toast.error("Sila isi nama penuh, No. KP dan emel");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        const payload: Record<string, unknown> = {
          namaPenuh: form.namaPenuh,
          noTelefon: form.noTelefon,
          peranan: form.peranan,
          negeri: form.negeri,
          jawatan: form.jawatan,
          updatedBy: currentUser?.id,
        };
        if (form.emel) payload.emel = form.emel;
        if (isPbtRole(form.peranan)) payload.pbtId = form.pbtId || null;
        if (isNgoRole(form.peranan)) payload.ngoId = form.ngoId || null;
        await api.patch(`/api/admin/users/${editingId}`, payload);
        toast.success("Pengguna dikemas kini");
      } else {
        const payload: Record<string, unknown> = {
          namaPenuh: form.namaPenuh,
          noKadPengenalan: form.noKadPengenalan,
          emel: form.emel,
          noTelefon: form.noTelefon,
          peranan: form.peranan,
          kataLaluanHash: form.kataLaluan || "password123",
          negeri: form.negeri,
          jawatan: form.jawatan,
          createdBy: currentUser?.id,
        };
        if (isPbtRole(form.peranan)) payload.pbtId = form.pbtId || null;
        if (isNgoRole(form.peranan)) payload.ngoId = form.ngoId || null;
        await api.post("/api/admin/users", payload);
        toast.success("Pengguna baharu dicipta");
      }
      setDialogOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan pengguna");
    } finally {
      setSaving(false);
    }
  };

  const confirmReset = async () => {
    if (!resetTarget) return;
    setResetting(true);
    try {
      await api.post(`/api/admin/users/${resetTarget.id}/reset-password`);
      toast.success(`Kata laluan ${resetTarget.namaPenuh} telah direset kepada "password123"`);
      setResetTarget(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal reset kata laluan");
    } finally {
      setResetting(false);
    }
  };

  const confirmToggleStatus = async () => {
    if (!blockTarget) return;
    setToggling(true);
    try {
      const next = blockTarget.statusAkaun === "aktif" ? "disekat" : "aktif";
      await api.patch(`/api/admin/users/${blockTarget.id}`, {
        statusAkaun: next,
        updatedBy: currentUser?.id,
      });
      toast.success(next === "disekat" ? "Akaun telah disekat" : "Akaun telah diaktifkan semula");
      setBlockTarget(null);
      fetchUsers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengemaskini status akaun");
    } finally {
      setToggling(false);
    }
  };

  const affiliationLabel = (u: UserRow) => {
    if (u.pbt) return `${u.pbt.namaPbt} (${u.pbt.kodPbt})`;
    if (u.ngo) return `${u.ngo.namaNgo}`;
    return "-";
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gradient-primary flex items-center gap-2">
            <Users className="w-7 h-7 text-primary" />
            Pengurusan Pengguna
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Urus akaun pengguna sistem eBantuan-PEKB · Jumlah: {total} pengguna
          </p>
        </div>
        <Button onClick={openAdd} className="bg-gradient-to-r from-primary to-accent text-white shadow-md">
          <UserPlus className="w-4 h-4 mr-2" />
          Tambah Pengguna
        </Button>
      </motion.div>

      {/* Filter bar */}
      <Card className="glass-card border-border/40">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <div className="md:col-span-2 lg:col-span-3 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari nama / emel / No. KP / telefon"
                className="pl-9"
              />
            </div>
            <Select value={roleFilter || "all"} onValueChange={(v) => { setRoleFilter(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger><Filter className="w-3.5 h-3.5 mr-2" /><SelectValue placeholder="Peranan" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Peranan</SelectItem>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter || "all"} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Status Akaun" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={pbtFilter || "all"} onValueChange={(v) => { setPbtFilter(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Tapis PBT" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua PBT</SelectItem>
                {pbtOptions.map((p) => (
                  <SelectItem key={p.pbtId} value={p.pbtId}>{p.namaPbt}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={ngoFilter || "all"} onValueChange={(v) => { setNgoFilter(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger><SelectValue placeholder="Tapis NGO" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua NGO</SelectItem>
                {ngoOptions.map((n) => (
                  <SelectItem key={n.ngoId} value={n.ngoId}>{n.namaNgo}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="glass-card border-border/40">
        <CardContent className="p-0">
          {error ? (
            <div className="p-8 text-center">
              <ShieldAlert className="w-10 h-10 mx-auto text-destructive mb-2" />
              <p className="text-destructive font-medium">{error}</p>
              <Button variant="outline" size="sm" className="mt-3" onClick={fetchUsers}>Cuba Semula</Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/40 bg-muted/30 hover:bg-muted/30">
                    <TableHead className="min-w-[180px]">Nama</TableHead>
                    <TableHead className="min-w-[200px]">Emel</TableHead>
                    <TableHead>Peranan</TableHead>
                    <TableHead className="min-w-[160px]">PBT / NGO</TableHead>
                    <TableHead>Negeri</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Tindakan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={7}><Skeleton className="h-8 w-full" /></TableCell>
                      </TableRow>
                    ))
                  ) : rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <Users className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        Tiada pengguna dijumpai
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((u) => (
                      <TableRow key={u.id} className="border-border/40 hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <div className="font-medium">{u.namaPenuh}</div>
                          <div className="text-xs text-muted-foreground">{maskIC(u.noKadPengenalan)}</div>
                        </TableCell>
                        <TableCell className="text-sm">{u.emel}</TableCell>
                        <TableCell><RoleBadge role={u.peranan as Role} /></TableCell>
                        <TableCell className="text-sm">{affiliationLabel(u)}</TableCell>
                        <TableCell className="text-sm">{u.negeri}</TableCell>
                        <TableCell>
                          <StatusPill status={u.statusAkaun} />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => openEdit(u)} title="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setResetTarget(u)} title="Reset Kata Laluan">
                              <KeyRound className="w-3.5 h-3.5" />
                            </Button>
                            {u.statusAkaun === "aktif" ? (
                              <Button size="sm" variant="ghost" onClick={() => setBlockTarget(u)} title="Sekat Akaun" className="text-destructive hover:text-destructive">
                                <Ban className="w-3.5 h-3.5" />
                              </Button>
                            ) : (
                              <Button size="sm" variant="ghost" onClick={() => setBlockTarget(u)} title="Aktifkan" className="text-emerald-600 hover:text-emerald-700">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {!loading && rows.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 border-t border-border/40">
              <p className="text-xs text-muted-foreground">
                Halaman {page} daripada {totalPages} · {total} rekod
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Sebelum
                </Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Seterus
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-thin">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              {editingId ? "Edit Pengguna" : "Tambah Pengguna Baharu"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Kemaskini maklumat pengguna. Kosongkan kata laluan jika tidak diubah."
                : "Isi maklumat pengguna baharu. Kata laluan lalai ialah password123 jika dibiarkan kosong."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2">
              <Label htmlFor="namaPenuh">Nama Penuh *</Label>
              <Input id="namaPenuh" value={form.namaPenuh} onChange={(e) => setForm({ ...form, namaPenuh: e.target.value })} placeholder="Cth: Ahmad bin Ali" />
            </div>
            <div>
              <Label htmlFor="noKp">No. Kad Pengenalan *</Label>
              <Input id="noKp" value={form.noKadPengenalan} onChange={(e) => setForm({ ...form, noKadPengenalan: e.target.value })} placeholder="XXXXXX-XX-XXXX" disabled={!!editingId} />
            </div>
            <div>
              <Label htmlFor="emel">Emel *</Label>
              <Input id="emel" type="email" value={form.emel} onChange={(e) => setForm({ ...form, emel: e.target.value })} placeholder="nama@kpkt.gov.my" />
            </div>
            <div>
              <Label htmlFor="noTelefon">No. Telefon</Label>
              <Input id="noTelefon" value={form.noTelefon} onChange={(e) => setForm({ ...form, noTelefon: e.target.value })} placeholder="012-3456789" />
            </div>
            <div>
              <Label htmlFor="jawatan">Jawatan</Label>
              <Input id="jawatan" value={form.jawatan} onChange={(e) => setForm({ ...form, jawatan: e.target.value })} placeholder="Cth: Pegawai Penyelia" />
            </div>
            <div>
              <Label htmlFor="peranan">Peranan *</Label>
              <Select value={form.peranan} onValueChange={(v) => setForm({ ...form, peranan: v as Role })}>
                <SelectTrigger id="peranan"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="negeri">Negeri</Label>
              <Select value={form.negeri} onValueChange={(v) => setForm({ ...form, negeri: v })}>
                <SelectTrigger id="negeri"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NEGERI_LIST.map((n) => (
                    <SelectItem key={n} value={n}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isPbtRole(form.peranan) && (
              <div className="sm:col-span-2">
                <Label htmlFor="pbt">PBT *</Label>
                <Select value={form.pbtId} onValueChange={(v) => setForm({ ...form, pbtId: v })}>
                  <SelectTrigger id="pbt"><SelectValue placeholder="Pilih PBT" /></SelectTrigger>
                  <SelectContent>
                    {pbtOptions.map((p) => (
                      <SelectItem key={p.pbtId} value={p.pbtId}>{p.namaPbt} ({p.kodPbt})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {isNgoRole(form.peranan) && (
              <div className="sm:col-span-2">
                <Label htmlFor="ngo">NGO (No. Akreditasi PEKB) *</Label>
                <Select value={form.ngoId} onValueChange={(v) => setForm({ ...form, ngoId: v })}>
                  <SelectTrigger id="ngo"><SelectValue placeholder="Pilih NGO" /></SelectTrigger>
                  <SelectContent>
                    {ngoOptions.map((n) => (
                      <SelectItem key={n.ngoId} value={n.ngoId}>{n.namaNgo} — {n.noAkreditasiPekb}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {!editingId && (
              <div className="sm:col-span-2">
                <Label htmlFor="kataLaluan">Kata Laluan Sementara</Label>
                <Input id="kataLaluan" type="password" value={form.kataLaluan} onChange={(e) => setForm({ ...form, kataLaluan: e.target.value })} placeholder="password123 (lalai)" />
                <p className="text-xs text-muted-foreground mt-1">Pengguna akan diminta menukar kata laluan selepas log masuk pertama.</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={submitForm} disabled={saving} className="bg-gradient-to-r from-primary to-accent text-white">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : editingId ? "Simpan Perubahan" : "Cipta Pengguna"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset password confirm */}
      <AlertDialog open={!!resetTarget} onOpenChange={(o) => !o && setResetTarget(null)}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-600" />
              Reset Kata Laluan
            </AlertDialogTitle>
            <AlertDialogDescription>
              Adakah anda pasti ingin reset kata laluan untuk <strong>{resetTarget?.namaPenuh}</strong> ({resetTarget?.emel})?
              Kata laluan akan ditetapkan kepada <code className="px-1 py-0.5 bg-muted rounded">password123</code>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={resetting}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmReset(); }}
              disabled={resetting}
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              {resetting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Mereset...</> : "Ya, Reset"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block / Activate confirm */}
      <AlertDialog open={!!blockTarget} onOpenChange={(o) => !o && setBlockTarget(null)}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {blockTarget?.statusAkaun === "aktif" ? (
                <><Ban className="w-5 h-5 text-destructive" /> Sekat Akaun</>
              ) : (
                <><CheckCircle2 className="w-5 h-5 text-emerald-600" /> Aktifkan Akaun</>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {blockTarget?.statusAkaun === "aktif" ? (
                <>Akaun <strong>{blockTarget?.namaPenuh}</strong> akan disekat. Pengguna tidak boleh log masuk sehingga diaktifkan semula.</>
              ) : (
                <>Akaun <strong>{blockTarget?.namaPenuh}</strong> akan diaktifkan semula. Pengguna boleh log masuk seperti biasa.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={toggling}>Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); confirmToggleStatus(); }}
              disabled={toggling}
              className={blockTarget?.statusAkaun === "aktif" ? "bg-destructive hover:bg-destructive/90 text-white" : "bg-emerald-600 hover:bg-emerald-700 text-white"}
            >
              {toggling ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...</> : blockTarget?.statusAkaun === "aktif" ? "Ya, Sekat" : "Ya, Aktifkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    aktif: { label: "Aktif", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    disekat: { label: "Disekat", cls: "bg-red-100 text-red-700 border-red-200" },
    tidak_aktif: { label: "Tidak Aktif", cls: "bg-muted text-muted-foreground" },
  };
  const s = map[status] || { label: status, cls: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={s.cls}>{s.label}</Badge>;
}
