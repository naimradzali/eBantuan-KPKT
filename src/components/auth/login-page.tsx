"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, HeartHandshake, Landmark, ShieldCheck, Loader2, Lock, Mail, Eye, EyeOff, Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { api } from "@/lib/api-client";
import { toast } from "sonner";
import { ROLE_LABELS, type Role, type User } from "@/lib/types";

const DEMO_ACCOUNTS: { role: Role; emel: string; password: string; label: string; icon: typeof Building2; desc: string; color: string }[] = [
  { role: "pegawai_pbt", emel: "pegawai.mbsa@pbt.gov.my", password: "pbt123", label: "Pegawai PBT", icon: Building2, desc: "Trek 1 · Bantuan Perumahan", color: "from-blue-500/20 to-cyan-500/20" },
  { role: "wakil_ngo", emel: "wakil.pekb-ngo-2024-001@ngo.org.my", password: "ngo123", label: "Wakil NGO", icon: HeartHandshake, desc: "Trek 2 · Geran PEKB", color: "from-teal-500/20 to-emerald-500/20" },
  { role: "pegawai_kpkt", emel: "kpkt1@kpkt.gov.my", password: "kpkt123", label: "Pegawai KPKT", icon: Landmark, desc: "Semakan & Kelulusan", color: "from-violet-500/20 to-purple-500/20" },
  { role: "admin", emel: "admin@kpkt.gov.my", password: "admin123", label: "Pentadbir Sistem", icon: ShieldCheck, desc: "Pengurusan Sistem", color: "from-amber-500/20 to-orange-500/20" },
];

export function LoginPage() {
  const setUser = useAppStore((s) => s.setUser);
  const [mode, setMode] = useState<"select" | "login">("select");
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [emel, setEmel] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  function selectAccount(acc: typeof DEMO_ACCOUNTS[number]) {
    setSelectedRole(acc.role);
    setEmel(acc.emel);
    setPassword(acc.password);
    setMode("login");
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!emel || !password) {
      toast.error("Sila isi emel dan kata laluan");
      return;
    }
    setLoading(true);
    try {
      const res = await api.post<{ user: User; token: string }>("/api/auth/login", { emel, kataLaluan: password });
      setUser(res.user, res.token);
      toast.success(`Selamat datang, ${res.user.namaPenuh}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Log masuk gagal");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-teal-50/30 dark:from-slate-950 dark:via-slate-900 dark:to-teal-950/20">
      {/* Background mesh */}
      <div className="fixed inset-0 gradient-mesh pointer-events-none" />

      {/* Floating decorative shapes */}
      <div className="fixed top-20 left-10 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl animate-pulse-glow pointer-events-none" />
      <div className="fixed bottom-20 right-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl animate-pulse-glow pointer-events-none" style={{ animationDelay: "2s" }} />

      {/* Header */}
      <header className="relative z-10 glass-nav px-4 sm:px-8 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
              <Landmark className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold text-foreground leading-tight">eBantuan-PEKB</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Kementerian Perumahan dan Kerajaan Tempatan</p>
            </div>
          </div>
          <Badge variant="outline" className="hidden sm:flex glass border-primary/20 text-primary">
            <Sparkles className="w-3 h-3 mr-1" />
            Prototaip PoC v1.0
          </Badge>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8 sm:py-12">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
          {/* Left — Hero */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="hidden lg:block space-y-6"
          >
            <Badge variant="outline" className="glass border-accent/30 text-accent-foreground">
              <HeartHandshake className="w-3 h-3 mr-1" />
              Platform Bersepadu Bantuan Perumahan & Geran
            </Badge>
            <h2 className="text-4xl xl:text-5xl font-bold leading-tight">
              Sistem Permohonan <span className="text-gradient-primary">Bantuan Perumahan</span> dan Geran PEKB
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed">
              Platform digital bersepadu bagi Pelaksanaan Program Ekonomi Kediaman Bandar (PEKB) oleh Pihak Berkuasa Tempatan (PBT) dan Pertubuhan Bukan Kerajaan (NGO).
            </p>

            <div className="grid grid-cols-2 gap-4 pt-4">
              {[
                { icon: Building2, label: "Trek 1 — PBT", desc: "Baik Pulih Rumah & RMR" },
                { icon: HeartHandshake, label: "Trek 2 — NGO", desc: "Geran Ekonomi & Sara Hidup" },
                { icon: Sparkles, label: "AI GLM-4.5", desc: "Penyaringan & Pengesahan" },
                { icon: ShieldCheck, label: "Ketelusan", desc: "Audit Trail Tidak Berubah" },
              ].map((f) => (
                <div key={f.label} className="glass-card rounded-xl p-4">
                  <f.icon className="w-5 h-5 text-accent mb-2" />
                  <div className="font-semibold text-sm">{f.label}</div>
                  <div className="text-xs text-muted-foreground">{f.desc}</div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Right — Login / Role selection */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <AnimatePresence mode="wait">
              {mode === "select" ? (
                <motion.div
                  key="select"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="glass-card rounded-2xl p-6 sm:p-8 shadow-xl"
                >
                  <div className="mb-6 text-center">
                    <h3 className="text-xl font-bold mb-1">Pilih Peranan Log Masuk</h3>
                    <p className="text-sm text-muted-foreground">Pilih akaun demo untuk menerokai sistem</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {DEMO_ACCOUNTS.map((acc) => (
                      <button
                        key={acc.role}
                        onClick={() => selectAccount(acc)}
                        className={`group relative overflow-hidden rounded-xl border border-white/40 dark:border-white/10 p-4 text-left transition-all hover:scale-[1.02] hover:shadow-lg bg-gradient-to-br ${acc.color}`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-white/60 dark:bg-white/10 backdrop-blur flex items-center justify-center flex-shrink-0">
                            <acc.icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <div className="font-semibold text-sm">{acc.label}</div>
                            <div className="text-xs text-muted-foreground truncate">{acc.desc}</div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 pt-4 border-t border-border/40">
                    <p className="text-xs text-muted-foreground text-center">
                      Klik mana-mana peranan untuk log masuk automatik dengan akaun demo
                    </p>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="login"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="glass-card rounded-2xl p-6 sm:p-8 shadow-xl"
                >
                  <button
                    onClick={() => setMode("select")}
                    className="text-xs text-muted-foreground hover:text-foreground mb-4 flex items-center gap-1"
                  >
                    ← Kembali ke pilihan peranan
                  </button>

                  <div className="mb-6">
                    <h3 className="text-xl font-bold mb-1">Log Masuk Sistem</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedRole ? `Peranan: ${ROLE_LABELS[selectedRole]}` : "Sila masukkan kredensial anda"}
                    </p>
                  </div>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="emel">Alamat E-mel</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="emel"
                          type="email"
                          value={emel}
                          onChange={(e) => setEmel(e.target.value)}
                          placeholder="nama@kpkt.gov.my"
                          className="pl-9"
                          autoComplete="email"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="password">Kata Laluan</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pl-9 pr-9"
                          autoComplete="current-password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sedang log masuk...
                        </>
                      ) : (
                        <>
                          Log Masuk
                          <ArrowRight className="w-4 h-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </form>

                  <div className="mt-6 pt-4 border-t border-border/40">
                    <p className="text-xs text-muted-foreground text-center">
                      Demo OTP: <code className="px-1.5 py-0.5 rounded bg-muted font-mono">123456</code> · Sistem PoC — bukan produksi
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 glass-nav px-4 sm:px-8 py-4 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>© 2026 Kementerian Perumahan dan Kerajaan Tempatan (KPKT) Malaysia</p>
          <p className="flex items-center gap-2">
            <span>Enjin AI: GLM-4.5 (z.ai)</span>
            <span className="hidden sm:inline">·</span>
            <span className="hidden sm:inline">Klasifikasi: TERHAD</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
