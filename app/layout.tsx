import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import { ToastProvider } from "@/components/Toast";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Kita-Listen - Lokale Kinderverwaltung & Listengenerator",
  description: "Die datenschutzfreundliche, offline-fähige Progressive Web App für Erzieher zur lokalen Verwaltung von Kinderdaten und schnellen Listenerstellung.",
};

export const viewport: Viewport = {
  themeColor: "#4A90D9",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="de" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-[#FAFAF5]">
        <ToastProvider>
          <Navigation />
          <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 md:px-8 md:py-10">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
