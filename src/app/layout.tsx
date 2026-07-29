import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "eBantuan-PEKB | KPKT Malaysia",
  description:
    "Sistem Permohonan Bantuan Perumahan dan Geran PEKB — Kementerian Perumahan dan Kerajaan Tempatan (KPKT) Malaysia.",
  keywords: [
    "KPKT", "PEKB", "Bantuan Perumahan", "Geran NGO", "PBT", "NGO",
    "B40", "Miskin Tegar", "OKU", "Malaysia",
  ],
  authors: [{ name: "Bahagian Perancangan & ICT, KPKT" }],
  icons: { icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ms" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
        <SonnerToaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
