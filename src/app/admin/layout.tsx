import type { Metadata } from "next";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "관리툴 (2026)",
  description: "운영 관리툴",
};

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="min-h-dvh flex-1 bg-zinc-950 p-6 text-zinc-100">
        {children}
      </main>
    </div>
  );
}
