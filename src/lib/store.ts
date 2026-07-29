"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Role } from "@/lib/types";

export type AppView =
  | "dashboard"
  | "applications"
  | "new-application"
  | "application-detail"
  | "review-queue"
  | "analytics"
  | "admin-users"
  | "admin-pbt-ngo"
  | "admin-audit"
  | "admin-ai-config"
  | "notifications"
  | "profile";

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  setUser: (user: User | null, token?: string | null) => void;
  logout: () => void;

  // SPA routing
  view: AppView;
  setView: (view: AppView) => void;
  activeApplicationId: string | null;
  setActiveApplication: (id: string | null) => void;

  // Sidebar
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;

  // AI Chatbot
  chatbotOpen: boolean;
  toggleChatbot: (open?: boolean) => void;

  // Notifications
  notificationsOpen: boolean;
  toggleNotifications: (open?: boolean) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      setUser: (user, token) => set({ user, token }),
      logout: () => set({ user: null, token: null, view: "dashboard", activeApplicationId: null }),

      view: "dashboard",
      setView: (view) => set({ view }),
      activeApplicationId: null,
      setActiveApplication: (id) => set({ activeApplicationId: id }),

      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

      chatbotOpen: false,
      toggleChatbot: (open) => set((s) => ({ chatbotOpen: open ?? !s.chatbotOpen })),

      notificationsOpen: false,
      toggleNotifications: (open) => set((s) => ({ notificationsOpen: open ?? !s.notificationsOpen })),
    }),
    {
      name: "ebantuan-pekb-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        sidebarCollapsed: state.sidebarCollapsed,
      }),
    }
  )
);

// Convenience hook to check role access
export function useRoleAccess() {
  const user = useAppStore((s) => s.user);
  const role = user?.peranan;
  return {
    isPBT: role === "pegawai_pbt" || role === "penilai_pbt",
    isNGO: role === "wakil_ngo" || role === "penilai_ngo",
    isKPKT: role === "pegawai_kpkt" || role === "pegawai_kpkt_pusat",
    isPusat: role === "pegawai_kpkt_pusat",
    isAdmin: role === "admin",
    canReview: role === "penilai_pbt" || role === "penilai_ngo" || role === "pegawai_kpkt" || role === "pegawai_kpkt_pusat",
    canSubmit: role === "pegawai_pbt" || role === "wakil_ngo",
    role: role as Role | undefined,
  };
}
