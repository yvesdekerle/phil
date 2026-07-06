import Link from "next/link";
import { getT } from "@/lib/i18n/server";

/** Page 404 globale (PHIL — audit D15), dans le ton Phil. */
export default async function NotFound() {
  const t = await getT();
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-6xl text-laiton italic">404</p>
      <h1 className="mt-4 font-display text-2xl text-encre">{t("notFound.title")}</h1>
      <p className="mt-2 text-sm text-encre-douce">{t("notFound.body")}</p>
      <Link
        href="/trips"
        className="mt-6 rounded-full bg-bordeaux px-5 py-2 text-sm font-medium text-papier transition-colors hover:bg-bordeaux/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laiton"
      >
        {t("notFound.back")}
      </Link>
    </main>
  );
}
