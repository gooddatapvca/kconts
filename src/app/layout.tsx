import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { ToasterProvider } from "@/components/Toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "관리툴 (2026)",
  description: "FastAPI/ChatGPT 프로젝트용 운영 관리툴",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-zinc-50`}
      >
        <ToasterProvider>
          <div className="flex min-h-dvh">
            <Sidebar />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </ToasterProvider>
      </body>
    </html>
  );
}
