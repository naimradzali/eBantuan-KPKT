"use client";

import { useAppStore } from "@/lib/store";
import { LoginPage } from "@/components/auth/login-page";
import { AppShell } from "@/components/shell/app-shell";

export default function Home() {
  const user = useAppStore((s) => s.user);

  return user ? <AppShell /> : <LoginPage />;
}
