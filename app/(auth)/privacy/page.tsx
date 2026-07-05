import Link from "next/link";
import { getT } from "@/lib/i18n/server";

export async function generateMetadata() {
  const t = await getT();
  return { title: t("privacy.metaTitle") };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="font-display text-xl text-encre">{title}</h2>
      <div className="mt-2 flex flex-col gap-2 text-sm leading-relaxed text-encre-douce">
        {children}
      </div>
    </section>
  );
}

export default async function PrivacyPage() {
  const t = await getT();
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <Link href="/" className="text-sm text-encre-douce underline underline-offset-4">
        {t("privacy.back")}
      </Link>
      <h1 className="mt-4 font-display text-3xl text-encre">{t("privacy.title")}</h1>
      <p className="mt-2 text-sm text-encre-douce">{t("privacy.intro")}</p>

      <Section title={t("privacy.responsibleTitle")}>
        <p>
          {t("privacy.responsibleBody")}
          <a href="mailto:yves.dekerle@gmail.com" className="underline underline-offset-4">
            yves.dekerle@gmail.com
          </a>
          .
        </p>
      </Section>

      <Section title={t("privacy.dataTitle")}>
        <p>
          <strong className="text-encre">{t("privacy.accountLabel")}</strong> —{" "}
          {t("privacy.accountBody")}
        </p>
        <p>
          <strong className="text-encre">{t("privacy.tripsLabel")}</strong> —{" "}
          {t("privacy.tripsBody")}
        </p>
        <p>
          <strong className="text-encre">{t("privacy.vaultLabel")}</strong> —{" "}
          {t("privacy.vaultBody")}
        </p>
        <p>
          <strong className="text-encre">{t("privacy.passkeysLabel")}</strong> —{" "}
          {t("privacy.passkeysBody")}
        </p>
      </Section>

      <Section title={t("privacy.storageTitle")}>
        <p>
          {t("privacy.storagePre")}
          <strong>{t("privacy.storageStrong")}</strong>
          {t("privacy.storagePost")}
        </p>
      </Section>

      <Section title={t("privacy.retentionTitle")}>
        <p>{t("privacy.retentionBody")}</p>
      </Section>

      <Section title={t("privacy.rightsTitle")}>
        <p>
          {t("privacy.rightsPre")}
          <a href="mailto:yves.dekerle@gmail.com" className="underline underline-offset-4">
            yves.dekerle@gmail.com
          </a>
          {t("privacy.rightsPost")}
        </p>
      </Section>

      <Section title={t("privacy.cookiesTitle")}>
        <p>{t("privacy.cookiesBody")}</p>
      </Section>

      <p className="mt-10 text-xs text-encre-douce">{t("privacy.updated")}</p>
    </main>
  );
}
