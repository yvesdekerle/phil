import {
  Banknote,
  CloudDownload,
  FileCheck,
  HeartPulse,
  Landmark,
  Plane,
  Smartphone,
  Wifi,
} from "lucide-react";
import Link from "next/link";
import { getT } from "@/lib/i18n/server";

/** Conseils de voyage (PHIL-Q17) — le carnet de bord du voyageur prévoyant. */
export default async function ConseilsPage() {
  const t = await getT();

  const SECTIONS: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    tips: string[];
  }[] = [
    {
      icon: CloudDownload,
      title: t("tips.maps.title"),
      tips: [t("tips.maps.t1"), t("tips.maps.t2"), t("tips.maps.t3")],
    },
    {
      icon: Smartphone,
      title: t("tips.phone.title"),
      tips: [t("tips.phone.t1"), t("tips.phone.t2"), t("tips.phone.t3"), t("tips.phone.t4")],
    },
    {
      icon: FileCheck,
      title: t("tips.papers.title"),
      tips: [t("tips.papers.t1"), t("tips.papers.t2"), t("tips.papers.t3")],
    },
    {
      icon: Banknote,
      title: t("tips.money.title"),
      tips: [t("tips.money.t1"), t("tips.money.t2"), t("tips.money.t3")],
    },
    {
      icon: HeartPulse,
      title: t("tips.health.title"),
      tips: [t("tips.health.t1"), t("tips.health.t2"), t("tips.health.t3")],
    },
    {
      icon: Plane,
      title: t("tips.flight.title"),
      tips: [t("tips.flight.t1"), t("tips.flight.t2"), t("tips.flight.t3")],
    },
    {
      icon: Landmark,
      title: t("tips.onsite.title"),
      tips: [t("tips.onsite.t1"), t("tips.onsite.t2"), t("tips.onsite.t3")],
    },
    {
      icon: Wifi,
      title: t("tips.inphil.title"),
      tips: [t("tips.inphil.t1"), t("tips.inphil.t2"), t("tips.inphil.t3")],
    },
  ];

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
      <h1 className="font-display text-3xl text-encre">{t("tips.title")}</h1>
      <p className="mt-1 mb-6 text-sm text-encre-douce">{t("tips.subtitle")}</p>

      <div className="flex flex-col gap-4">
        {SECTIONS.map((section) => {
          const Icon = section.icon;
          return (
            <section
              key={section.title}
              className="rounded-lg border border-laiton-clair bg-papier px-5 py-4"
            >
              <h2 className="mb-2 flex items-center gap-2 text-sm font-medium text-encre">
                <Icon className="size-4 text-laiton" aria-hidden="true" />
                {section.title}
              </h2>
              <ul className="flex flex-col gap-1.5">
                {section.tips.map((tip) => (
                  <li key={tip} className="flex gap-2 text-sm text-encre-douce">
                    <span className="text-laiton">—</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>

      <p className="mt-6 text-sm text-encre-douce">
        <Link href="/trips" className="underline underline-offset-4 hover:text-encre">
          {t("tips.back")}
        </Link>
      </p>
    </main>
  );
}
