import type { Metadata } from "next";
import { Schibsted_Grotesk, Spline_Sans_Mono } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import { CookieNotice } from "@/components/cookie-notice";
import { I18nProvider } from "@/components/i18n/provider";
import { OfflineAuthGuard } from "@/components/offline/offline-auth-guard";
import { OfflineBanner } from "@/components/offline/offline-banner";
import { ServiceWorkerRegister } from "@/components/pwa/sw-register";
import { completeMessages } from "@/lib/i18n/messages";
import { getLocale, getT } from "@/lib/i18n/server";
import { palette } from "@/lib/ui/colors";
import { cn } from "@/lib/utils";

const schibsted = Schibsted_Grotesk({
  variable: "--font-schibsted",
  subsets: ["latin"],
});

const splineMono = Spline_Sans_Mono({
  variable: "--font-spline-mono",
  subsets: ["latin"],
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
  themeColor: palette.sand,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  const t = await getT();
  return (
    <html
      lang={locale}
      className={cn("h-full antialiased font-sans", schibsted.variable, splineMono.variable)}
    >
      <body className="min-h-full flex flex-col font-sans">
        <I18nProvider locale={locale} dict={completeMessages(locale)}>
          <ServiceWorkerRegister />
          <OfflineAuthGuard />
          <OfflineBanner />
          <CookieNotice />
          <Toaster position="bottom-center" richColors />

          {/* Conteneur qui grandit : pousse le footer en bas même sur les pages courtes */}
          <div className="flex flex-1 flex-col">{children}</div>
          <footer className="border-t border-line/50 px-4 py-4 text-center text-xs text-slate">
            {t("footer.tagline")} ·{" "}
            <a href="/privacy" className="underline underline-offset-4 hover:text-ink">
              {t("footer.privacy")}
            </a>{" "}
            ·{" "}
            <a href="/legal" className="underline underline-offset-4 hover:text-ink">
              {t("footer.legal")}
            </a>
          </footer>
        </I18nProvider>
      </body>
    </html>
  );
}
