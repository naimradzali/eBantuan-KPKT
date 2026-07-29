"use client";

import { Badge } from "@/components/ui/badge";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  KATEGORI_LABELS,
  PERTINDIHAN_LABELS,
  PENGESAHAN_LABELS,
  ROLE_LABELS,
  type StatusPermohonan,
  type KategoriBantuan,
  type StatusPertindihanAi,
  type StatusPengesahanAi,
  type Role,
} from "@/lib/types";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: StatusPermohonan }) {
  return (
    <Badge variant="outline" className={cn("border font-medium", STATUS_COLORS[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function KategoriBadge({ kategori }: { kategori: KategoriBantuan }) {
  const colorMap: Record<KategoriBantuan, string> = {
    baik_pulih_rumah: "bg-amber-100 text-amber-700 border-amber-200",
    rumah_mesra_rakyat: "bg-orange-100 text-orange-700 border-orange-200",
    geran_ekonomi: "bg-teal-100 text-teal-700 border-teal-200",
    bantuan_sara_hidup: "bg-sky-100 text-sky-700 border-sky-200",
  };
  return (
    <Badge variant="outline" className={cn("border font-medium", colorMap[kategori])}>
      {KATEGORI_LABELS[kategori]}
    </Badge>
  );
}

export function PertindihanBadge({ status }: { status: StatusPertindihanAi }) {
  const colorMap: Record<StatusPertindihanAi, string> = {
    tiada_pertindihan: "bg-emerald-100 text-emerald-700 border-emerald-200",
    disyaki_pertindihan: "bg-amber-100 text-amber-700 border-amber-200",
    disahkan_pertindihan: "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <Badge variant="outline" className={cn("border font-medium", colorMap[status])}>
      {PERTINDIHAN_LABELS[status]}
    </Badge>
  );
}

export function PengesahanBadge({ status }: { status: StatusPengesahanAi }) {
  const colorMap: Record<StatusPengesahanAi, string> = {
    belum_disemak: "bg-muted text-muted-foreground",
    sah: "bg-emerald-100 text-emerald-700 border-emerald-200",
    tidak_lengkap: "bg-amber-100 text-amber-700 border-amber-200",
    mencurigakan: "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <Badge variant="outline" className={cn("border font-medium", colorMap[status])}>
      {PENGESAHAN_LABELS[status]}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: Role }) {
  return (
    <Badge variant="secondary" className="font-medium">
      {ROLE_LABELS[role]}
    </Badge>
  );
}

export function TrekBadge({ trek }: { trek: string }) {
  return trek === "bantuan_perumahan" ? (
    <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
      Trek 1 · PBT
    </Badge>
  ) : (
    <Badge variant="outline" className="bg-accent/10 text-accent-foreground border-accent/30">
      Trek 2 · NGO
    </Badge>
  );
}

export function SkorIndicator({ skor, size = "md" }: { skor: number; size?: "sm" | "md" | "lg" }) {
  const sizes = {
    sm: "w-12 h-12 text-xs",
    md: "w-16 h-16 text-sm",
    lg: "w-24 h-24 text-lg",
  };
  const color =
    skor >= 70 ? "text-emerald-600 bg-emerald-50 border-emerald-200"
    : skor >= 50 ? "text-amber-600 bg-amber-50 border-amber-200"
    : "text-red-600 bg-red-50 border-red-200";
  return (
    <div className={cn("rounded-full border-2 flex items-center justify-center font-bold flex-shrink-0", sizes[size], color)}>
      {skor}
    </div>
  );
}
