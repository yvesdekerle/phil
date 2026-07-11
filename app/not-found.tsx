import Link from "next/link";
import { getT } from "@/lib/i18n/server";

/** Page 404 globale (PHIL — audit D15), dans le ton Phil. */
export default async function NotFound() {
  const t = await getT();
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 text-center">
      <p className="font-sans text-6xl text-mist italic">404</p>
      <h1 className="mt-4 font-sans text-2xl text-ink">{t("notFound.title")}</h1>
      <p className="mt-2 text-sm text-slate">{t("notFound.body")}</p>
      <Link
        href="/trips"
        className="mt-6 rounded-full bg-lagoon-ink px-5 py-2 text-sm font-medium text-card transition-colors hover:bg-lagoon-ink/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mist"
      >
        {t("notFound.back")}
      </Link>
    </main>
  );
}
