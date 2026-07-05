import type { Metadata } from "next";
import { Bodoni_Moda, Figtree } from "next/font/google";
import "./globals.css";
import { CookieNotice } from "@/components/cookie-notice";
import { OfflineAuthGuard } from "@/components/offline/offline-auth-guard";
import { OfflineBanner } from "@/components/offline/offline-banner";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { cn } from "@/lib/utils";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

const bodoni = Bodoni_Moda({
  variable: "--font-bodoni",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Phil — Ton compagnon de voyage",
  description: "Carnet de voyage collaboratif avec coffre-fort d'identité personnel.",
  icons: {
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    title: "Phil",
    statusBarStyle: "default",
  },
};

export const viewport = {
  themeColor: "#f4eee1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={cn("h-full antialiased font-sans", figtree.variable, bodoni.variable)}
    >
      <body className="min-h-full flex flex-col font-sans">
        <ServiceWorkerRegister />
        <OfflineAuthGuard />
        <OfflineBanner />
        <CookieNotice />
        {/* Conteneur qui grandit : pousse le footer en bas même sur les pages courtes */}
        <div className="flex flex-1 flex-col">{children}</div>
        <footer className="border-t border-laiton-clair/50 px-4 py-4 text-center text-xs text-encre-douce">
          Phil — carnet de voyage entre amis ·{" "}
          <a href="/privacy" className="underline underline-offset-4 hover:text-encre">
            Confidentialité
          </a>{" "}
          ·{" "}
          <a href="/legal" className="underline underline-offset-4 hover:text-encre">
            Mentions légales
          </a>
        </footer>
      </body>
    </html>
  );
}
