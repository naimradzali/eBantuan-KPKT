"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import {
  ClipboardList,
  Search,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  Undo2,
  ArrowUpRight,
  Eye,
  Inbox,
  AlertTriangle,
  Brain,
  Users,
  Gauge,
  ShieldAlert,
  RefreshCw,
  MapPin,
  Wallet,
  Baby,
  Accessibility,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  KategoriBadge,
  PertindihanBadge,
  SkorIndicator,
  StatusBadge,
  TrekBadge,
} from "@/components/shared/badges";
import { api } from "@/lib/api-client";
import { useAppStore, useRoleAccess } from "@/lib/store";
import {
  formatRM,
  formatDate,
  maskIC,
  type Application,
  type Role,
  type StatusPermohonan,
  type StatusPertindihanAi,
  type Trek,
} from "@/lib/types";
import { cn } from "@/lib/utils";

// ============================================================
// Role-based review defaults
// ============================================================

interface RoleDefaults {
  status: StatusPermohonan;
  trek?: Trek;
  subtitle: string;
}

function getRoleDefaults(role?: Role): RoleDefaults | null {
  switch (role) {
    case "penilai_pbt":
      return {
        status: "semakan_pbt_ngo",
        trek: "bantuan_perumahan",
        subtitle:
          "Menyemak permohonan Trek 1 (PBT) di peringkat PBT/NGO serta permohonan yang dipulangkan.",
      };
    case "penilai_ngo":
      return {
        status: "semakan_pbt_ngo",
        trek: "geran_pekb",
        subtitle:
          "Menyemak permohonan Trek 2 (NGO) di peringkat PBT/NGO serta permohonan yang dipulangkan.",
      };
    case "pegawai_kpkt":
      return {
        status: "semakan_daerah",
        subtitle:
          "Menyemak permohonan di peringkat Daerah serta permohonan yang dipulangkan.",
      };
    case "pegawai_kpkt_pusat":
      return {
        status: "semakan_negeri",
        subtitle:
          "Menyemak permohonan di peringkat Negeri/Pusat serta permohonan yang dipulangkan.",
      };
    case "admin":
      return {
        status: "semakan_pbt_ngo",
        subtitle:
          "Pentadbir: akses penuh kepada semua baris semakan dalam sistem.",
      };
    default:
      return null;
  }
}

// ============================================================
// Types & constants
// ============================================================

type TabValue = "semua" | "menunggu" | "dipulangkan";
type ActionTindakan = "lulus" | "tolak" | "pulangkan" | "naik_peringkat";

const PAGE_SIZE = 12;

const ACTION_META: Record<
  ActionTindakan,
  {
    title: string;
    description: string;
    label: string;
    placeholder: string;
    confirmLabel: string;
    variant: "lulus" | "tolak" | "pulangkan" | "naik";
    requireText: boolean;
  }
> = {
  lulus: {
    title: "Lulus Permohonan",
    description:
      "Permohonan akan ditanda sebagai Diluluskan dan dimaklumkan kepada pengemuka.",
    label: "Nota Kelulusan",
    placeholder: "Contoh: Disahkan layak menerima bantuan penuh.",
    confirmLabel: "Sahkan Lulus",
    variant: "lulus",
    requireText: false,
  },
  tolak: {
    title: "Tolak Permohonan",
    description:
      "Permohonan akan ditanda sebagai Ditolak. Alasan wajib diberikan.",
    label: "Alasan Penolakan",
    placeholder: "Contoh: Pendapatan melebihi ambang B40.",
    confirmLabel: "Sahkan Tolak",
    variant: "tolak",
    requireText: true,
  },
  pulangkan: {
    title: "Pulangkan Permohonan",
    description:
      "Permohonan dipulangkan kepada pengemuka untuk pembetulan maklumat.",
    label: "Nota Pembetulan",
    placeholder: "Contoh: Sila kemaskini alamat penerima dan muat naik semula slip gaji.",
    confirmLabel: "Pulangkan",
    variant: "pulangkan",
    requireText: false,
  },
  naik_peringkat: {
    title: "Naik Peringkat",
    description:
      "Permohonan akan dinaikkan ke peringkat semakan seterusnya dalam aliran kelulusan.",
    label: "Nota (pilihan)",
    placeholder: "Contoh: Dokumen lengkap, disyorkan untuk semakan daerah.",
    confirmLabel: "Naik Peringkat",
    variant: "naik",
    requireText: false,
  },
};

// ============================================================
// Helper: AI priority sort
// ============================================================

function pertindihanPriority(s: StatusPertindihanAi): number {
  if (s === "disahkan_pertindihan") return 3;
  if (s === "disyaki_pertindihan") return 2;
  return 0;
}

function priorityRank(app: Application): number {
  // Higher = more urgent. Pertindihan dominates; then low AI score.
  return pertindihanPriority(app.statusPertindihanAi) * 1000 - app.skorKelayakanAi;
}

// ============================================================
// Sub-components
// ============================================================

function StatCard({
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
  tone: "navy" | "teal" | "amber" | "coral";
}) {
  const toneClass = {
    navy: "bg-primary/10 text-primary",
    teal: "bg-accent/15 text-accent-foreground",
    amber: "bg-amber-100 text-amber-700",
    coral: "bg-red-100 text-red-700",
  }[tone];

  return (
    <div className="glass-card rounded-xl p-4 flex items-start gap-3">
      <div className={cn("rounded-lg p-2.5", toneClass)}>
        <Icon className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground truncate">{label}</p>
        <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{hint}</p>}
      </div>
    </div>
  );
}

function ApplicationCardSkeleton() {
  return (
    <div className="glass-card rounded-xl p-5 space-y-4">
      <div className="flex justify-between">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
      <div className="flex gap-2">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-20 rounded-full" />
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <div className="flex items-center gap-3">
        <Skeleton className="size-16 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="grid grid-cols-4 gap-2">
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
        <Skeleton className="h-8" />
      </div>
    </div>
  );
}

function InfoChip({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1 text-xs">
      <Icon className="size-3.5 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  variant,
  onClick,
  disabled,
}: {
  icon: React.ElementType;
  label: string;
  variant: "lulus" | "tolak" | "pulangkan" | "naik";
  onClick: () => void;
  disabled?: boolean;
}) {
  const variantClass = {
    lulus:
      "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 shadow-sm",
    tolak:
      "bg-red-600 hover:bg-red-700 text-white border-red-700 shadow-sm",
    pulangkan:
      "bg-amber-500 hover:bg-amber-600 text-white border-amber-600 shadow-sm",
    naik: "bg-blue-600 hover:bg-blue-700 text-white border-blue-700 shadow-sm",
  }[variant];

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex-1 gap-1 text-xs h-8 transition-colors",
        variantClass
      )}
      title={label}
    >
      <Icon className="size-3.5" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}

function ApplicationCard({
  app,
  rank,
  onView,
  onAction,
}: {
  app: Application;
  rank: number;
  onView: () => void;
  onAction: (a: ActionTindakan) => void;
}) {
  const isFlagged = app.statusPertindihanAi === "disahkan_pertindihan";
  const isDisyaki = app.statusPertindihanAi === "disyaki_pertindihan";

  const cadanganLabel = {
    lulus: "AI: Lulus",
    tolak: "AI: Tolak",
    semak_semula: "AI: Semak Semula",
  }[app.cadanganAi];

  const cadanganTone = {
    lulus: "text-emerald-600 bg-emerald-50 border-emerald-200",
    tolak: "text-red-600 bg-red-50 border-red-200",
    semak_semula: "text-amber-600 bg-amber-50 border-amber-200",
  }[app.cadanganAi];

  const nilai =
    app.trek === "bantuan_perumahan"
      ? app.nilaiAnggaranKerja
      : app.nilaiGeranDipohon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(rank * 0.03, 0.3) }}
      className={cn(
        "glass-card rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden",
        isFlagged && "ring-2 ring-red-400/60"
      )}
    >
      {/* Priority ribbon */}
      {rank < 3 && (
        <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-semibold px-2 py-0.5 rounded-bl-lg">
          Keutamaan #{rank + 1}
        </div>
      )}

      {/* Header: No rujukan + badges */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">No. Rujukan</p>
          <p className="font-mono text-sm font-semibold text-foreground">
            {app.noRujukan}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 justify-end">
          <TrekBadge trek={app.trek} />
          <StatusBadge status={app.statusPermohonan} />
        </div>
      </div>

      {/* Penerima info */}
      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-semibold text-foreground truncate">
            {app.namaPenerima}
          </p>
          <span className="text-xs text-muted-foreground font-mono shrink-0">
            {maskIC(app.noKpPenerima)}
          </span>
        </div>
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3.5 mt-0.5 shrink-0" />
          <span className="line-clamp-2">
            {app.alamatPenerima}
            {app.alamatPenerima && ", "}
            {app.daerahPenerima && `${app.daerahPenerima}, `}
            {app.negeriPenerima}
          </span>
        </div>
      </div>

      {/* Info chips */}
      <div className="flex flex-wrap gap-1.5">
        <KategoriBadge kategori={app.kategoriBantuan} />
        <InfoChip icon={Wallet} label="Pendapatan" value={formatRM(app.pendapatanIsiRumah)} />
        <InfoChip icon={Baby} label="Tanggungan" value={String(app.bilanganTanggungan)} />
        {app.statusOku && (
          <span className="inline-flex items-center gap-1 rounded-md bg-purple-100 text-purple-700 px-2 py-1 text-xs font-medium border border-purple-200">
            <Accessibility className="size-3.5" />
            OKU{app.jenisOku ? ` · ${app.jenisOku}` : ""}
          </span>
        )}
      </div>

      {/* AI section */}
      <Separator />
      <div className="flex items-center gap-4">
        <div className="flex flex-col items-center gap-1">
          <SkorIndicator skor={app.skorKelayakanAi} size="sm" />
          <span className="text-[10px] text-muted-foreground">Skor AI</span>
        </div>
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Brain className="size-3.5 text-accent-foreground shrink-0" />
            <span
              className={cn(
                "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium",
                cadanganTone
              )}
            >
              {cadanganLabel}
            </span>
          </div>
          {app.sebabCadanganAi && (
            <p className="text-[11px] text-muted-foreground line-clamp-2">
              {app.sebabCadanganAi}
            </p>
          )}
          <div className="flex items-center gap-1.5">
            <ShieldAlert
              className={cn(
                "size-3.5 shrink-0",
                isFlagged ? "text-red-600" : isDisyaki ? "text-amber-600" : "text-emerald-600"
              )}
            />
            <PertindihanBadge status={app.statusPertindihanAi} />
          </div>
        </div>
      </div>

      {/* Nilai bantuan + tarikh */}
      <div className="flex items-center justify-between text-xs">
        <div>
          <span className="text-muted-foreground">Nilai Dipohon: </span>
          <span className="font-semibold text-foreground">{formatRM(nilai)}</span>
        </div>
        <span className="text-muted-foreground">
          {formatDate(app.tarikhPermohonan || app.tarikhDicipta)}
        </span>
      </div>

      {/* Primary CTA */}
      <Button
        type="button"
        onClick={onView}
        className="w-full gap-2 bg-primary hover:bg-primary/90"
      >
        <Eye className="size-4" />
        Semak Permohonan
      </Button>

      {/* Quick actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <ActionButton
          icon={CheckCircle2}
          label="Lulus"
          variant="lulus"
          onClick={() => onAction("lulus")}
        />
        <ActionButton
          icon={XCircle}
          label="Tolak"
          variant="tolak"
          onClick={() => onAction("tolak")}
        />
        <ActionButton
          icon={Undo2}
          label="Pulangkan"
          variant="pulangkan"
          onClick={() => onAction("pulangkan")}
        />
        <ActionButton
          icon={ArrowUpRight}
          label="Naik"
          variant="naik"
          onClick={() => onAction("naik_peringkat")}
        />
      </div>
    </motion.div>
  );
}

function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="glass-card rounded-2xl p-12 flex flex-col items-center justify-center text-center">
      <div className="rounded-full bg-muted/60 p-5 mb-4">
        <Inbox className="size-12 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground">
        Tiada permohonan dalam baris semakan
      </h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md">
        Baris semakan anda kosong untuk penapis semasa. Cuba ubah penapis trek
        atau status, atau jalankan carian menggunakan no. rujukan / nama penerima.
      </p>
      <Button variant="outline" onClick={onReset} className="mt-5 gap-2">
        <RefreshCw className="size-4" />
        Set Semula Penapis
      </Button>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="glass-card rounded-2xl p-10 flex flex-col items-center text-center border-red-200">
      <AlertTriangle className="size-10 text-red-600 mb-3" />
      <h3 className="text-lg font-semibold text-foreground">
        Gagal memuatkan baris semakan
      </h3>
      <p className="text-sm text-muted-foreground mt-1 max-w-md">{message}</p>
      <Button variant="outline" onClick={onRetry} className="mt-4 gap-2">
        <RefreshCw className="size-4" />
        Cuba Semula
      </Button>
    </div>
  );
}

// ============================================================
// Action Dialog
// ============================================================

function ActionDialog({
  open,
  onOpenChange,
  app,
  tindakan,
  submitting,
  text,
  onTextChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  app: Application | null;
  tindakan: ActionTindakan | null;
  submitting: boolean;
  text: string;
  onTextChange: (v: string) => void;
  onConfirm: () => void;
}) {
  const meta = tindakan ? ACTION_META[tindakan] : null;
  if (!meta) return null;

  const confirmDisabled = submitting || (meta.requireText && text.trim() === "");

  const confirmClass = {
    lulus: "bg-emerald-600 hover:bg-emerald-700 text-white",
    tolak: "bg-red-600 hover:bg-red-700 text-white",
    pulangkan: "bg-amber-500 hover:bg-amber-600 text-white",
    naik: "bg-blue-600 hover:bg-blue-700 text-white",
  }[meta.variant];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {meta.title}
          </DialogTitle>
          <DialogDescription>{meta.description}</DialogDescription>
        </DialogHeader>

        {app && (
          <div className="rounded-lg border bg-muted/40 p-3 text-sm space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-mono font-semibold">{app.noRujukan}</span>
              <TrekBadge trek={app.trek} />
            </div>
            <p className="text-muted-foreground">
              Penerima: <span className="font-medium text-foreground">{app.namaPenerima}</span>
            </p>
            <p className="text-muted-foreground">
              Kategori: <span className="font-medium text-foreground">{app.kategoriBantuan.replace(/_/g, " ")}</span>
            </p>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="action-text">
            {meta.label}
            {meta.requireText && <span className="text-red-600 ml-1">*</span>}
          </Label>
          <Textarea
            id="action-text"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder={meta.placeholder}
            rows={4}
            disabled={submitting}
          />
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Batal
          </Button>
          <Button
            onClick={onConfirm}
            disabled={confirmDisabled}
            className={confirmClass}
          >
            {submitting ? "Memproses…" : meta.confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Main view
// ============================================================

export function ReviewQueueView() {
  const role = useRoleAccess().role;
  const roleDefaults = useMemo(() => getRoleDefaults(role), [role]);

  const setView = useAppStore((s) => s.setView);
  const setActiveApplication = useAppStore((s) => s.setActiveApplication);

  const [tab, setTab] = useState<TabValue>("menunggu");
  const [trekFilter, setTrekFilter] = useState<"semua" | Trek>(
    roleDefaults?.trek ?? "semua"
  );
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);

  const [data, setData] = useState<Application[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Action dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogApp, setDialogApp] = useState<Application | null>(null);
  const [dialogAction, setDialogAction] = useState<ActionTindakan | null>(null);
  const [dialogText, setDialogText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetFilters = useCallback(() => {
    setTab("menunggu");
    setTrekFilter(roleDefaults?.trek ?? "semua");
    setSearch("");
    setDebouncedSearch("");
    setPage(1);
  }, [roleDefaults]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let status: StatusPermohonan | undefined;
      if (tab === "menunggu") {
        status = roleDefaults?.status;
      } else if (tab === "dipulangkan") {
        status = "dipulangkan";
      }
      const trek = trekFilter === "semua" ? undefined : trekFilter;

      const params = new URLSearchParams();
      if (status) params.append("status", status);
      if (trek) params.append("trek", trek);
      if (debouncedSearch) params.append("search", debouncedSearch);
      // Fetch a large page so we can compute summary stats client-side
      params.append("limit", "200");
      params.append("page", "1");

      const res = await api.get<{
        data: Application[];
        total: number;
        page: number;
        limit: number;
      }>(`/api/applications?${params.toString()}`);

      setData(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ralat tidak diketahui.");
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [tab, trekFilter, debouncedSearch, roleDefaults]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  // Client-side AI-priority sort (pertindihan first, then ascending AI score)
  const sortedData = useMemo(() => {
    return [...data].sort((a, b) => priorityRank(b) - priorityRank(a));
  }, [data]);

  // Paginate client-side
  const totalPages = Math.max(1, Math.ceil(sortedData.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedData = useMemo(
    () =>
      sortedData.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
      ),
    [sortedData, currentPage]
  );

  // Summary stats (computed from full filtered set)
  const stats = useMemo(() => {
    const n = data.length;
    const avgSkor =
      n > 0
        ? Math.round(
            (data.reduce((s, a) => s + (a.skorKelayakanAi ?? 0), 0) / n) * 10
          ) / 10
        : 0;
    const flagged = data.filter(
      (a) => a.statusPertindihanAi !== "tiada_pertindihan"
    ).length;
    return { totalInQueue: total, avgSkor, flagged };
  }, [data, total]);

  const openActionDialog = (app: Application, tindakan: ActionTindakan) => {
    setDialogApp(app);
    setDialogAction(tindakan);
    setDialogText("");
    setDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (!dialogApp || !dialogAction) return;
    const meta = ACTION_META[dialogAction];
    const userId = useAppStore.getState().user?.id;

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        tindakan: dialogAction,
        penggunaId: userId,
      };
      // tolak uses alasan, others use nota — send both so backend has either.
      if (dialogAction === "tolak") {
        body.alasan = dialogText.trim();
      } else {
        body.nota = dialogText.trim();
      }

      await api.post(`/api/applications/${dialogApp.applicationId}/action`, body);

      const successMsg = {
        lulus: "Permohonan diluluskan.",
        tolak: "Permohonan ditolak.",
        pulangkan: "Permohonan dipulangkan kepada pengemuka.",
        naik_peringkat: "Permohonan dinaikkan ke peringkat seterusnya.",
      }[dialogAction];

      toast.success(successMsg, {
        description: `${dialogApp.noRujukan} — ${dialogApp.namaPenerima}`,
      });

      setDialogOpen(false);
      setDialogApp(null);
      setDialogAction(null);
      setDialogText("");
      // Refresh list
      fetchList();
    } catch (err) {
      toast.error("Gagal memproses tindakan.", {
        description: err instanceof Error ? err.message : "Sila cuba lagi.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleView = (app: Application) => {
    setActiveApplication(app.applicationId);
    setView("application-detail");
  };

  // Render
  if (!roleDefaults) {
    return (
      <div className="p-8">
        <ErrorState
          message="Baris semakan tidak tersedia untuk peranan anda."
          onRetry={resetFilters}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2">
            <ClipboardList className="size-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Baris Semakan Permohonan
            </h1>
            <p className="text-sm text-muted-foreground">
              {roleDefaults.subtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          icon={Users}
          label="Jumlah Dalam Baris"
          value={stats.totalInQueue}
          hint="Mengikut penapis semasa"
          tone="navy"
        />
        <StatCard
          icon={Gauge}
          label="Purata Skor AI"
          value={stats.avgSkor}
          hint="Skor kelayakan purata"
          tone="teal"
        />
        <StatCard
          icon={AlertTriangle}
          label="Kes Pertindihan Dikesan"
          value={stats.flagged}
          hint="Disyaki & disahkan pertindihan"
          tone="coral"
        />
      </div>

      {/* Filter bar */}
      <div className="glass-card rounded-xl p-4 flex flex-col gap-3">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
          <Tabs value={tab} onValueChange={(v) => { setTab(v as TabValue); setPage(1); }}>
            <TabsList>
              <TabsTrigger value="menunggu">Menunggu Semakan</TabsTrigger>
              <TabsTrigger value="dipulangkan">Dipulangkan</TabsTrigger>
              <TabsTrigger value="semua">Semua</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <Select
              value={trekFilter}
              onValueChange={(v) => {
                setTrekFilter(v as "semua" | Trek);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Trek" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Trek</SelectItem>
                <SelectItem value="bantuan_perumahan">Trek 1 · PBT</SelectItem>
                <SelectItem value="geran_pekb">Trek 2 · NGO</SelectItem>
              </SelectContent>
            </Select>

            <div className="relative flex-1 sm:w-72">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Cari no. rujukan / nama / KP…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            Menunjukkan{" "}
            <span className="font-semibold text-foreground">
              {pagedData.length}
            </span>{" "}
            daripada{" "}
            <span className="font-semibold text-foreground">
              {sortedData.length}
            </span>{" "}
            permohonan
          </span>
          <span className="hidden sm:inline">
            Disusun mengikut keutamaan AI (pertindihan & skor)
          </span>
        </div>
      </div>

      {/* Content grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <ApplicationCardSkeleton key={i} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={fetchList} />
      ) : pagedData.length === 0 ? (
        <EmptyState onReset={resetFilters} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {pagedData.map((app, i) => (
            <ApplicationCard
              key={app.applicationId}
              app={app}
              rank={(currentPage - 1) * PAGE_SIZE + i}
              onView={() => handleView(app)}
              onAction={(a) => openActionDialog(app, a)}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && sortedData.length > PAGE_SIZE && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            Halaman {currentPage} daripada {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="gap-1"
            >
              <ChevronLeft className="size-4" />
              Sebelum
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="gap-1"
            >
              Seterus
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Action dialog */}
      <ActionDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          if (!submitting) setDialogOpen(v);
        }}
        app={dialogApp}
        tindakan={dialogAction}
        submitting={submitting}
        text={dialogText}
        onTextChange={setDialogText}
        onConfirm={handleConfirm}
      />
    </div>
  );
}
