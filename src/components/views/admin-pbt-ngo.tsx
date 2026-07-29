"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Building2, Search, Plus, Pencil, Trash2, Loader2, ShieldAlert,
  CheckCircle2, PauseCircle, Building, Landmark,
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
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
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
import { api } from "@/lib/api-client";
import { useAppStore } from "@/lib/store";
import { toast } from "sonner";
import { motion } from "framer-motion";

const NEGERI_LIST = [
  "Wilayah Persekutuan Kuala Lumpur",
  "Wilayah Persekutuan Putrajaya",
  "Wilayah Persekutuan Labuan",
  "Selangor", "Pulau Pinang", "Johor", "Kedah", "Kelantan",
  "Melaka", "Negeri Sembilan", "Pahang", "Perak", "Perlis",
  "Sabah", "Sarawak", "Terengganu",
];

const KATEGORI_PBT = [
  { value: "dewan_bandaraya", label: "Dewan Bandaraya" },
  { value: "majlis_perbandaran", label: "Majlis Perbandaran" },
  { value: "majlis_daerah", label: "Majlis Daerah" },
];

const KATEGORI_PBT_LABEL: Record<string, string> = {
  dewan_bandaraya: "Dewan Bandaraya",
  majlis_perbandaran: "Majlis Perbandaran",
  majlis_daerah: "Majlis Daerah",
};

// ============ PBT ============
interface PbtRow {
  pbtId: string;
  namaPbt: string;
  kodPbt: string;
  negeri: string;
  daerah: string;
  kategoriPbt: string;
  statusAkaunPbt: string;
  _count?: { users: number; applications: number };
}

interface PbtForm {
  namaPbt: string;
  kodPbt: string;
  negeri: string;
  daerah: string;
  kategoriPbt: string;
  statusAkaunPbt: string;
}

const EMPTY_PBT: PbtForm = {
  namaPbt: "", kodPbt: "", negeri: NEGERI_LIST[0], daerah: "",
  kategoriPbt: "majlis_perbandaran", statusAkaunPbt: "aktif",
};

// ============ NGO ============
interface NgoRow {
  ngoId: string;
  namaNgo: string;
  noPendaftaranRos: string;
  noAkreditasiPekb: string;
  negeriOperasi: string;
  daerahOperasi: string;
  statusAkreditasi: string;
  _count?: { users: number; applications: number };
}

interface NgoForm {
  namaNgo: string;
  noPendaftaranRos: string;
  noAkreditasiPekb: string;
  negeriOperasi: string;
  daerahOperasi: string;
  statusAkreditasi: string;
}

const EMPTY_NGO: NgoForm = {
  namaNgo: "", noPendaftaranRos: "", noAkreditasiPekb: "",
  negeriOperasi: NEGERI_LIST[0], daerahOperasi: "", statusAkreditasi: "aktif",
};

export function AdminPbtNgoView() {
  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gradient-primary flex items-center gap-2">
          <Building2 className="w-7 h-7 text-primary" />
          Profil PBT & NGO
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Urus profil Pihak Berkuasa Tempatan dan Pertubuhan Bukan Kerajaan berakreditasi PEKB.
        </p>
      </motion.div>

      <Tabs defaultValue="pbt" className="w-full">
        <TabsList className="glass grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="pbt" className="gap-2">
            <Landmark className="w-4 h-4" /> Profil PBT
          </TabsTrigger>
          <TabsTrigger value="ngo" className="gap-2">
            <Building className="w-4 h-4" /> Profil NGO
          </TabsTrigger>
        </TabsList>
        <TabsContent value="pbt"><PbtTab /></TabsContent>
        <TabsContent value="ngo"><NgoTab /></TabsContent>
      </Tabs>
    </div>
  );
}

// ============ PBT Tab ============
function PbtTab() {
  const currentUser = useAppStore((s) => s.user);
  const [rows, setRows] = useState<PbtRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PbtForm>(EMPTY_PBT);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PbtRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchPbt = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      if (statusFilter) params.set("statusAkaunPbt", statusFilter);
      const res = await api.get<{ data: PbtRow[]; total: number; totalPages: number }>(`/api/admin/pbt?${params.toString()}`);
      setRows(res.data || []);
      setTotal(res.total);
      setTotalPages(Math.max(1, res.totalPages));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuatkan PBT");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchPbt(); }, [fetchPbt]);
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const openAdd = () => { setEditingId(null); setForm(EMPTY_PBT); setDialogOpen(true); };
  const openEdit = (r: PbtRow) => {
    setEditingId(r.pbtId);
    setForm({
      namaPbt: r.namaPbt, kodPbt: r.kodPbt, negeri: r.negeri, daerah: r.daerah,
      kategoriPbt: r.kategoriPbt, statusAkaunPbt: r.statusAkaunPbt,
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!form.namaPbt || !form.kodPbt) {
      toast.error("Nama PBT dan Kod PBT diperlukan");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/api/admin/pbt/${editingId}`, { ...form, updatedBy: currentUser?.id });
        toast.success("Profil PBT dikemas kini");
      } else {
        await api.post("/api/admin/pbt", { ...form, createdBy: currentUser?.id });
        toast.success("Profil PBT baharu dicipta");
      }
      setDialogOpen(false);
      fetchPbt();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan PBT");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      // Soft delete via status toggle
      await api.patch(`/api/admin/pbt/${deleteTarget.pbtId}/status`, {
        statusAkaunPbt: "tidak_aktif",
        updatedBy: currentUser?.id,
      });
      toast.success(`${deleteTarget.namaPbt} telah dinyahaktifkan`);
      setDeleteTarget(null);
      fetchPbt();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyahaktifkan PBT");
    } finally {
      setDeleting(false);
    }
  };

  const toggleStatus = async (r: PbtRow) => {
    const next = r.statusAkaunPbt === "aktif" ? "tidak_aktif" : "aktif";
    try {
      await api.patch(`/api/admin/pbt/${r.pbtId}/status`, { statusAkaunPbt: next, updatedBy: currentUser?.id });
      toast.success(`Status PBT: ${next === "aktif" ? "Aktif" : "Tidak Aktif"}`);
      fetchPbt();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengemaskini status");
    }
  };

  return (
    <Card className="glass-card border-border/40 mt-4">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-1 gap-2 flex-col sm:flex-row">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Cari nama / kod / daerah PBT" className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="aktif">Aktif</SelectItem>
                <SelectItem value="dalam_semakan">Dalam Semakan</SelectItem>
                <SelectItem value="tidak_aktif">Tidak Aktif</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={openAdd} className="bg-gradient-to-r from-primary to-accent text-white">
            <Plus className="w-4 h-4 mr-2" /> Tambah PBT
          </Button>
        </div>

        {error ? (
          <div className="p-8 text-center">
            <ShieldAlert className="w-10 h-10 mx-auto text-destructive mb-2" />
            <p className="text-destructive font-medium">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchPbt}>Cuba Semula</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 bg-muted/30 hover:bg-muted/30">
                  <TableHead className="min-w-[200px]">Nama PBT</TableHead>
                  <TableHead>Kod</TableHead>
                  <TableHead>Negeri</TableHead>
                  <TableHead>Daerah</TableHead>
                  <TableHead>Kategori</TableHead>
                  <TableHead>Pengguna</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <Building2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      Tiada profil PBT dijumpai
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.pbtId} className="border-border/40 hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{r.namaPbt}</TableCell>
                      <TableCell><Badge variant="outline" className="font-mono">{r.kodPbt}</Badge></TableCell>
                      <TableCell className="text-sm">{r.negeri}</TableCell>
                      <TableCell className="text-sm">{r.daerah}</TableCell>
                      <TableCell className="text-sm">{KATEGORI_PBT_LABEL[r.kategoriPbt] || r.kategoriPbt}</TableCell>
                      <TableCell className="text-sm">{r._count?.users ?? 0}</TableCell>
                      <TableCell><PbtStatusPill status={r.statusAkaunPbt} /></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(r)} title="Edit"><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => toggleStatus(r)} title={r.statusAkaunPbt === "aktif" ? "Nyahaktif" : "Aktif"} className={r.statusAkaunPbt === "aktif" ? "text-amber-600" : "text-emerald-600"}>
                            {r.statusAkaunPbt === "aktif" ? <PauseCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(r)} title="Padam" className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <p className="text-xs text-muted-foreground">Halaman {page} daripada {totalPages} · {total} rekod</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Sebelum</Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Seterus</Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* PBT Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="w-5 h-5 text-primary" />
              {editingId ? "Edit Profil PBT" : "Tambah PBT Baharu"}
            </DialogTitle>
            <DialogDescription>
              {editingId ? "Kemaskini maklumat profil PBT." : "Daftarkan profil Pihak Berkuasa Tempatan baharu."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2">
              <Label>Nama PBT *</Label>
              <Input value={form.namaPbt} onChange={(e) => setForm({ ...form, namaPbt: e.target.value })} placeholder="Cth: Majlis Bandaraya Kuala Lumpur" />
            </div>
            <div>
              <Label>Kod PBT *</Label>
              <Input value={form.kodPbt} onChange={(e) => setForm({ ...form, kodPbt: e.target.value.toUpperCase() })} placeholder="Cth: DBKL" disabled={!!editingId} />
            </div>
            <div>
              <Label>Kategori</Label>
              <Select value={form.kategoriPbt} onValueChange={(v) => setForm({ ...form, kategoriPbt: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {KATEGORI_PBT.map((k) => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Negeri</Label>
              <Select value={form.negeri} onValueChange={(v) => setForm({ ...form, negeri: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NEGERI_LIST.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Daerah</Label>
              <Input value={form.daerah} onChange={(e) => setForm({ ...form, daerah: e.target.value })} placeholder="Cth: Wilayah Persekutuan" />
            </div>
            <div className="sm:col-span-2">
              <Label>Status Akaun</Label>
              <Select value={form.statusAkaunPbt} onValueChange={(v) => setForm({ ...form, statusAkaunPbt: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="dalam_semakan">Dalam Semakan</SelectItem>
                  <SelectItem value="tidak_aktif">Tidak Aktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={submit} disabled={saving} className="bg-gradient-to-r from-primary to-accent text-white">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : editingId ? "Simpan" : "Cipta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* PBT Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" /> Nyahaktifkan PBT
            </AlertDialogTitle>
            <AlertDialogDescription>
              PBT <strong>{deleteTarget?.namaPbt}</strong> akan ditandai sebagai Tidak Aktif. Pengguna di bawah PBT ini masih wujud tetapi tidak boleh mencipta permohonan baharu sehingga PBT diaktifkan semula.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete(); }} disabled={deleting} className="bg-destructive hover:bg-destructive/90 text-white">
              {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...</> : "Ya, Nyahaktifkan"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

// ============ NGO Tab ============
function NgoTab() {
  const currentUser = useAppStore((s) => s.user);
  const [rows, setRows] = useState<NgoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 10;

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NgoForm>(EMPTY_NGO);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<NgoRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchNgo = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (search) params.set("search", search);
      if (statusFilter) params.set("statusAkreditasi", statusFilter);
      const res = await api.get<{ data: NgoRow[]; total: number; totalPages: number }>(`/api/admin/ngo?${params.toString()}`);
      setRows(res.data || []);
      setTotal(res.total);
      setTotalPages(Math.max(1, res.totalPages));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuatkan NGO");
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchNgo(); }, [fetchNgo]);
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const openAdd = () => { setEditingId(null); setForm(EMPTY_NGO); setDialogOpen(true); };
  const openEdit = (r: NgoRow) => {
    setEditingId(r.ngoId);
    setForm({
      namaNgo: r.namaNgo, noPendaftaranRos: r.noPendaftaranRos,
      noAkreditasiPekb: r.noAkreditasiPekb, negeriOperasi: r.negeriOperasi,
      daerahOperasi: r.daerahOperasi, statusAkreditasi: r.statusAkreditasi,
    });
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!form.namaNgo || !form.noPendaftaranRos || !form.noAkreditasiPekb) {
      toast.error("Nama NGO, No. ROS dan No. Akreditasi PEKB diperlukan");
      return;
    }
    setSaving(true);
    try {
      if (editingId) {
        await api.patch(`/api/admin/ngo/${editingId}`, { ...form, updatedBy: currentUser?.id });
        toast.success("Profil NGO dikemas kini");
      } else {
        await api.post("/api/admin/ngo", { ...form, createdBy: currentUser?.id });
        toast.success("Profil NGO baharu dicipta");
      }
      setDialogOpen(false);
      fetchNgo();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal menyimpan NGO");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.patch(`/api/admin/ngo/${deleteTarget.ngoId}/status`, {
        statusAkreditasi: "tamat_tempoh",
        updatedBy: currentUser?.id,
      });
      toast.success(`${deleteTarget.namaNgo} telah ditanda Tamat Tempoh`);
      setDeleteTarget(null);
      fetchNgo();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengemaskini status NGO");
    } finally {
      setDeleting(false);
    }
  };

  const toggleStatus = async (r: NgoRow) => {
    const next = r.statusAkreditasi === "aktif" ? "tamat_tempoh" : "aktif";
    try {
      await api.patch(`/api/admin/ngo/${r.ngoId}/status`, { statusAkreditasi: next, updatedBy: currentUser?.id });
      toast.success(`Status NGO: ${next === "aktif" ? "Aktif" : "Tamat Tempoh"}`);
      fetchNgo();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gagal mengemaskini status");
    }
  };

  return (
    <Card className="glass-card border-border/40 mt-4">
      <CardContent className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex flex-1 gap-2 flex-col sm:flex-row">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Cari nama / ROS / akreditasi NGO" className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v === "all" ? "" : v); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua Status</SelectItem>
                <SelectItem value="aktif">Aktif</SelectItem>
                <SelectItem value="dalam_semakan">Dalam Semakan</SelectItem>
                <SelectItem value="tamat_tempoh">Tamat Tempoh</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={openAdd} className="bg-gradient-to-r from-primary to-accent text-white">
            <Plus className="w-4 h-4 mr-2" /> Tambah NGO
          </Button>
        </div>

        {error ? (
          <div className="p-8 text-center">
            <ShieldAlert className="w-10 h-10 mx-auto text-destructive mb-2" />
            <p className="text-destructive font-medium">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={fetchNgo}>Cuba Semula</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/40 bg-muted/30 hover:bg-muted/30">
                  <TableHead className="min-w-[200px]">Nama NGO</TableHead>
                  <TableHead>No. ROS</TableHead>
                  <TableHead>No. Akreditasi PEKB</TableHead>
                  <TableHead>Negeri</TableHead>
                  <TableHead>Daerah</TableHead>
                  <TableHead>Pengguna</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Tindakan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={8}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  ))
                ) : rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <Building className="w-10 h-10 mx-auto mb-2 opacity-40" />
                      Tiada profil NGO dijumpai
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((r) => (
                    <TableRow key={r.ngoId} className="border-border/40 hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{r.namaNgo}</TableCell>
                      <TableCell className="text-sm font-mono">{r.noPendaftaranRos}</TableCell>
                      <TableCell><Badge variant="outline" className="font-mono">{r.noAkreditasiPekb}</Badge></TableCell>
                      <TableCell className="text-sm">{r.negeriOperasi}</TableCell>
                      <TableCell className="text-sm">{r.daerahOperasi}</TableCell>
                      <TableCell className="text-sm">{r._count?.users ?? 0}</TableCell>
                      <TableCell><NgoStatusPill status={r.statusAkreditasi} /></TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEdit(r)} title="Edit"><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => toggleStatus(r)} title={r.statusAkreditasi === "aktif" ? "Tamat Tempoh" : "Aktif"} className={r.statusAkreditasi === "aktif" ? "text-amber-600" : "text-emerald-600"}>
                            {r.statusAkreditasi === "aktif" ? <PauseCircle className="w-3.5 h-3.5" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteTarget(r)} title="Padam" className="text-destructive"><Trash2 className="w-3.5 h-3.5" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {!loading && rows.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <p className="text-xs text-muted-foreground">Halaman {page} daripada {totalPages} · {total} rekod</p>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Sebelum</Button>
              <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Seterus</Button>
            </div>
          </div>
        )}
      </CardContent>

      {/* NGO Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="glass-strong max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building className="w-5 h-5 text-primary" />
              {editingId ? "Edit Profil NGO" : "Tambah NGO Baharu"}
            </DialogTitle>
            <DialogDescription>
              {editingId ? "Kemaskini maklumat profil NGO." : "Daftarkan profil Pertubuhan Bukan Kerajaan berakreditasi PEKB."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
            <div className="sm:col-span-2">
              <Label>Nama NGO *</Label>
              <Input value={form.namaNgo} onChange={(e) => setForm({ ...form, namaNgo: e.target.value })} placeholder="Cth: Yayasan Bakti Negeri" />
            </div>
            <div>
              <Label>No. Pendaftaran ROS *</Label>
              <Input value={form.noPendaftaranRos} onChange={(e) => setForm({ ...form, noPendaftaranRos: e.target.value })} placeholder="PPM-001-XX-XXXX" disabled={!!editingId} />
            </div>
            <div>
              <Label>No. Akreditasi PEKB *</Label>
              <Input value={form.noAkreditasiPekb} onChange={(e) => setForm({ ...form, noAkreditasiPekb: e.target.value })} placeholder="PEKB-NGO-2024-XXX" disabled={!!editingId} />
            </div>
            <div>
              <Label>Negeri Operasi</Label>
              <Select value={form.negeriOperasi} onValueChange={(v) => setForm({ ...form, negeriOperasi: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {NEGERI_LIST.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Daerah Operasi</Label>
              <Input value={form.daerahOperasi} onChange={(e) => setForm({ ...form, daerahOperasi: e.target.value })} placeholder="Cth: Gombak" />
            </div>
            <div className="sm:col-span-2">
              <Label>Status Akreditasi</Label>
              <Select value={form.statusAkreditasi} onValueChange={(v) => setForm({ ...form, statusAkreditasi: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktif">Aktif</SelectItem>
                  <SelectItem value="dalam_semakan">Dalam Semakan</SelectItem>
                  <SelectItem value="tamat_tempoh">Tamat Tempoh</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Batal</Button>
            <Button onClick={submit} disabled={saving} className="bg-gradient-to-r from-primary to-accent text-white">
              {saving ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyimpan...</> : editingId ? "Simpan" : "Cipta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* NGO Delete confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="glass-strong">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Trash2 className="w-5 h-5 text-destructive" /> Tarik Akreditasi NGO
            </AlertDialogTitle>
            <AlertDialogDescription>
              NGO <strong>{deleteTarget?.namaNgo}</strong> akan ditandai sebagai <em>Tamat Tempoh</em>. Pengguna di bawah NGO ini masih wujud tetapi tidak boleh mencipta permohonan baharu sehingga akreditasi dipulihkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); confirmDelete(); }} disabled={deleting} className="bg-destructive hover:bg-destructive/90 text-white">
              {deleting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses...</> : "Ya, Tarik Akreditasi"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function PbtStatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    aktif: { label: "Aktif", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    dalam_semakan: { label: "Dalam Semakan", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    tidak_aktif: { label: "Tidak Aktif", cls: "bg-muted text-muted-foreground" },
  };
  const s = map[status] || { label: status, cls: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={s.cls}>{s.label}</Badge>;
}

function NgoStatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    aktif: { label: "Aktif", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
    dalam_semakan: { label: "Dalam Semakan", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    tamat_tempoh: { label: "Tamat Tempoh", cls: "bg-red-100 text-red-700 border-red-200" },
  };
  const s = map[status] || { label: status, cls: "bg-muted text-muted-foreground" };
  return <Badge variant="outline" className={s.cls}>{s.label}</Badge>;
}
