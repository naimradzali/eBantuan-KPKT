"use client";

import { useMemo } from "react";
import {
  LayoutDashboard, FileText, FilePlus2, ClipboardCheck, BarChart3,
  Users, Building2, ScrollText, Cpu, Bell, LogOut, Menu, X,
  Landmark, ChevronLeft, ChevronRight, UserCircle, Sparkles, ShieldCheck,
} from "lucide-react";
import { useAppStore, useRoleAccess } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ROLE_LABELS, type AppView } from "@/lib/types";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { api } from "@/lib/api-client";
import { AIChatbotWidget } from "@/components/views/ai-chatbot-widget";
import { PbtDashboardView } from "@/components/views/pbt-dashboard";
import { NgoDashboardView } from "@/components/views/ngo-dashboard";
import { KpktDashboardView } from "@/components/views/kpkt-dashboard";
import { AdminDashboardView } from "@/components/views/admin-dashboard";
import { ApplicationsListView } from "@/components/views/applications-list";
import { ApplicationWizardView } from "@/components/views/application-wizard";
import { ApplicationDetailView } from "@/components/views/application-detail";
import { ReviewQueueView } from "@/components/views/review-queue";
import { AnalyticsView } from "@/components/views/analytics";
import { AdminUsersView } from "@/components/views/admin-users";
import { AdminPbtNgoView } from "@/components/views/admin-pbt-ngo";
import { AdminAuditView } from "@/components/views/admin-audit";
import { AdminAiConfigView } from "@/components/views/admin-ai-config";
import { NotificationsView } from "@/components/views/notifications";
import { ProfileView } from "@/components/views/profile";

interface NavItem {
  view: AppView;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: string[]; // if undefined, available to all
}

const NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Utama",
    items: [
      { view: "dashboard", label: "Papan Pemuka", icon: LayoutDashboard },
      { view: "applications", label: "Senarai Permohonan", icon: FileText },
      { view: "new-application", label: "Permohonan Baharu", icon: FilePlus2, roles: ["pegawai_pbt", "wakil_ngo"] },
    ],
  },
  {
    title: "Semakan & Kelulusan",
    items: [
      { view: "review-queue", label: "Baris Semakan", icon: ClipboardCheck, roles: ["penilai_pbt", "penilai_ngo", "pegawai_kpkt", "pegawai_kpkt_pusat"] },
      { view: "analytics", label: "Analitik & Laporan", icon: BarChart3, roles: ["pegawai_kpkt", "pegawai_kpkt_pusat", "admin"] },
    ],
  },
  {
    title: "Pentadbiran",
    items: [
      { view: "admin-users", label: "Pengurusan Pengguna", icon: Users, roles: ["admin"] },
      { view: "admin-pbt-ngo", label: "Profil PBT & NGO", icon: Building2, roles: ["admin"] },
      { view: "admin-audit", label: "Log Audit", icon: ScrollText, roles: ["admin"] },
      { view: "admin-ai-config", label: "Konfigurasi AI", icon: Cpu, roles: ["admin"] },
    ],
  },
];

export function AppShell() {
  const user = useAppStore((s) => s.user);
  const view = useAppStore((s) => s.view);
  const setView = useAppStore((s) => s.setView);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const logout = useAppStore((s) => s.logout);
  const toggleChatbot = useAppStore((s) => s.toggleChatbot);
  const { role } = useRoleAccess();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);

  // fetch unread notification count
  useEffect(() => {
    if (!user) return;
    let active = true;
    const fetchNotif = async () => {
      try {
        const res = await api.get<{ belumDibaca?: number }>(`/api/notifications?userId=${user.id}`);
        if (active) setNotifCount(res.belumDibaca || 0);
      } catch { /* ignore */ }
    };
    fetchNotif();
    const interval = setInterval(fetchNotif, 30000);
    return () => { active = false; clearInterval(interval); };
  }, [user]);

  const navGroups = useMemo(() => {
    return NAV_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((i) => !i.roles || (role && i.roles.includes(role))),
    })).filter((g) => g.items.length > 0);
  }, [role]);

  const handleLogout = () => {
    logout();
    toast.success("Anda telah log keluar");
  };

  const renderView = () => {
    switch (view) {
      case "dashboard":
        if (role === "pegawai_pbt" || role === "penilai_pbt") return <PbtDashboardView />;
        if (role === "wakil_ngo" || role === "penilai_ngo") return <NgoDashboardView />;
        if (role === "pegawai_kpkt" || role === "pegawai_kpkt_pusat") return <KpktDashboardView />;
        if (role === "admin") return <AdminDashboardView />;
        return <PbtDashboardView />;
      case "applications": return <ApplicationsListView />;
      case "new-application": return <ApplicationWizardView />;
      case "application-detail": return <ApplicationDetailView />;
      case "review-queue": return <ReviewQueueView />;
      case "analytics": return <AnalyticsView />;
      case "admin-users": return <AdminUsersView />;
      case "admin-pbt-ngo": return <AdminPbtNgoView />;
      case "admin-audit": return <AdminAuditView />;
      case "admin-ai-config": return <AdminAiConfigView />;
      case "notifications": return <NotificationsView />;
      case "profile": return <ProfileView />;
      default: return <PbtDashboardView />;
    }
  };

  const initials = user?.namaPenuh?.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase() || "U";

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-teal-50/20 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/10">
      <div className="fixed inset-0 gradient-mesh pointer-events-none opacity-60" />

      {/* Top header */}
      <header className="relative z-30 glass-nav border-b border-border/40 sticky top-0">
        <div className="flex items-center justify-between px-4 sm:px-6 h-16">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="lg:hidden p-2 rounded-lg hover:bg-muted"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="hidden lg:flex p-2 rounded-lg hover:bg-muted"
            >
              {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-md">
                <Landmark className="w-5 h-5 text-white" />
              </div>
              <div className="hidden sm:block">
                <div className="font-bold text-sm leading-tight">eBantuan-PEKB</div>
                <div className="text-[10px] text-muted-foreground">KPKT Malaysia</div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* AI Chatbot button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleChatbot(true)}
              className="hidden sm:flex items-center gap-2 glass border-accent/30 text-accent-foreground hover:bg-accent/10"
            >
              <Sparkles className="w-4 h-4" />
              <span className="text-xs">Bantuan AI</span>
            </Button>

            {/* Notifications */}
            <button
              onClick={() => setView("notifications")}
              className="relative p-2 rounded-lg hover:bg-muted transition-colors"
              aria-label="Notifikasi"
            >
              <Bell className="w-5 h-5" />
              {notifCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
                  {notifCount > 9 ? "9+" : notifCount}
                </span>
              )}
            </button>

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-xs font-bold">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <div className="text-xs font-semibold leading-tight max-w-[140px] truncate">{user?.namaPenuh}</div>
                    <div className="text-[10px] text-muted-foreground">{role ? ROLE_LABELS[role] : ""}</div>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-semibold">{user?.namaPenuh}</span>
                    <span className="text-xs text-muted-foreground font-normal truncate">{user?.emel}</span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setView("profile")}>
                  <UserCircle className="w-4 h-4 mr-2" />
                  Profil Saya
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setView("notifications")}>
                  <Bell className="w-4 h-4 mr-2" />
                  Notifikasi
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Log Keluar
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <div className="flex flex-1 relative z-10">
        {/* Sidebar — desktop */}
        <aside
          className={cn(
            "hidden lg:flex flex-col glass border-r border-border/40 transition-all duration-300 sticky top-16 self-start",
            sidebarCollapsed ? "w-16" : "w-64"
          )}
          style={{ height: "calc(100vh - 4rem)" }}
        >
          <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-4 space-y-4">
            {navGroups.map((group) => (
              <div key={group.title}>
                {!sidebarCollapsed && (
                  <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.title}
                  </div>
                )}
                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const Icon = item.icon;
                    const active = view === item.view;
                    return (
                      <button
                        key={item.view}
                        onClick={() => setView(item.view)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all relative group",
                          active
                            ? "bg-gradient-to-r from-primary/15 to-accent/10 text-primary shadow-sm"
                            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                          sidebarCollapsed && "justify-center"
                        )}
                        title={sidebarCollapsed ? item.label : undefined}
                      >
                        {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-gradient-to-b from-primary to-accent" />}
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          {!sidebarCollapsed && (
            <div className="p-3 border-t border-border/40">
              <div className="glass-card rounded-lg p-3 text-center">
                <ShieldCheck className="w-5 h-5 text-accent mx-auto mb-1" />
                <div className="text-[10px] font-semibold">Sistem PoC</div>
                <div className="text-[9px] text-muted-foreground">v1.0 · Klasifikasi TERHAD</div>
              </div>
            </div>
          )}
        </aside>

        {/* Sidebar — mobile drawer */}
        {mobileOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              className="relative w-64 glass border-r border-border/40 flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-border/40">
                <span className="font-bold text-sm">Navigasi</span>
                <button onClick={() => setMobileOpen(false)}><X className="w-4 h-4" /></button>
              </div>
              <nav className="flex-1 overflow-y-auto scrollbar-thin px-2 py-4 space-y-4">
                {navGroups.map((group) => (
                  <div key={group.title}>
                    <div className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{group.title}</div>
                    <div className="space-y-0.5">
                      {group.items.map((item) => {
                        const Icon = item.icon;
                        const active = view === item.view;
                        return (
                          <button
                            key={item.view}
                            onClick={() => { setView(item.view); setMobileOpen(false); }}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                              active ? "bg-primary/15 text-primary" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                            )}
                          >
                            <Icon className="w-4 h-4" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>
            </motion.aside>
          </div>
        )}

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <div className="p-4 sm:p-6 lg:p-8 min-h-[calc(100vh-4rem)]">
            {renderView()}
          </div>
          {/* Sticky footer */}
          <footer className="glass-nav border-t border-border/40 px-4 sm:px-6 py-3 mt-auto">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-1 text-[11px] text-muted-foreground">
              <p>© 2026 Kementerian Perumahan dan Kerajaan Tempatan (KPKT) — eBantuan-PEKB Prototaip v1.0</p>
              <p className="flex items-center gap-2">
                <span className="flex items-center gap-1"><Sparkles className="w-3 h-3" /> AI: GLM-4.5</span>
                <span>·</span>
                <span>PDPA 2010 Compliant</span>
              </p>
            </div>
          </footer>
        </main>
      </div>

      {/* AI Chatbot floating widget */}
      <AIChatbotWidget />
    </div>
  );
}
