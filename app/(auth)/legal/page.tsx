import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("legal.metaTitle") };
}

export default async function LegalPage() {
  const t = await getT();
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <Link href="/" className="text-sm text-encre-douce underline underline-offset-4">
        {t("legal.back")}
      </Link>
      <h1 className="mt-4 font-display text-3xl text-encre">{t("legal.title")}</h1>

      <div className="mt-6 flex flex-col gap-6 text-sm leading-relaxed text-encre-douce">
        <section>
          <h2 className="font-display text-xl text-encre">{t("legal.publisher")}</h2>
          <p className="mt-2">
            {t("legal.publisherBody")}
            <a href="mailto:yves.dekerle@gmail.com" className="underline underline-offset-4">
              yves.dekerle@gmail.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-encre">{t("legal.hosting")}</h2>
          <p className="mt-2">
            {t("legal.hostingApp")}
            <br />
            {t("legal.hostingData")}
          </p>
        </section>

        <section>
          <h2 className="font-display text-xl text-encre">{t("legal.access")}</h2>
          <p className="mt-2">{t("legal.accessBody")}</p>
        </section>

        <section>
          <h2 className="font-display text-xl text-encre">{t("legal.personalData")}</h2>
          <p className="mt-2">
            {t("legal.personalDataPre")}
            <Link href="/privacy" className="underline underline-offset-4">
              {t("legal.privacyLink")}
            </Link>
            .
          </p>
        </section>
      </div>

      <p className="mt-10 text-xs text-encre-douce">{t("legal.updated")}</p>
    </main>
  );
}
