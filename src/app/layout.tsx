import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
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
  title: "kconts",
  description: "kconts 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="dark">
      <body
        className={`${geistSans.variable} ${
          geistMono.variable
        } antialiased overflow-x-hidden bg-gradient-to-br from-zinc-950 via-zinc-950 to-zinc-900 text-zinc-50`}
      >
        <ToasterProvider>{children}</ToasterProvider>
      </body>
    </html>
  );
}
