import { notFound, redirect } from "next/navigation";
import { eventDayKey, eventTime } from "@/lib/events/datetime";
import type { TripEvent } from "@/lib/events/types";
import { getDateFnsLocale, getIntlLocale, getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { formatDateRange } from "@/lib/trips/format";
import { PrintGuideButton } from "./print-button";

/**
 * PHIL-U06 — Guide de voyage (avant / pendant / après). Une seule source HTML,
 * lisible sur le site ET imprimable en PDF (bouton → `window.print()`, cadré par
 * le CSS `@media print`). Le chrome de l'app (`header`, onglets) est masqué à
 * l'impression via `print:hidden` sur les layouts. Rempli avec les données du
 * voyage — pas de nouvelle table.
 */
export default async function TripGuidePage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const t = await getT();
  const dfLocale = await getDateFnsLocale();
  const il = await getIntlLocale();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [
    { data: trip },
    { data: participants },
    { data: eventsData },
    { data: checklist },
    { data: expenses },
    { data: journal },
    { count: photoCount },
  ] = await Promise.all([
    supabase
      .from("trips")
      .select(
        "id, name, destination, start_date, end_date, default_timezone, currency_primary, currency_secondary",
      )
      .eq("id", tripId)
      .single(),
    supabase
      .from("trip_participants")
      .select("user_id, profiles!trip_participants_user_id_fkey(display_name)")
      .eq("trip_id", tripId),
    supabase
      .from("trip_events")
      .select("*")
      .eq("trip_id", tripId)
      .order("starts_at", { ascending: true }),
    supabase
      .from("checklist_items")
      .select("id, section, title, done, quantity")
      .eq("trip_id", tripId)
      .order("position", { ascending: true }),
    supabase.from("expenses").select("amount, currency, is_settlement").eq("trip_id", tripId),
    supabase
      .from("journal_entries")
      .select("day, author_id, body, profiles!journal_entries_author_id_fkey(display_name)")
      .eq("trip_id", tripId)
      .order("day", { ascending: true }),
    supabase.from("trip_photos").select("id", { count: "exact", head: true }).eq("trip_id", tripId),
  ]);

  if (!trip) {
    notFound();
  }

  // Noms d'affichage (profil peut être null → repli).
  const nameOf = (id: string): string => {
    const p = (participants ?? []).find((row) => row.user_id === id);
    // biome-ignore lint/suspicious/noExplicitAny: la jointure profiles arrive en objet ou tableau selon PostgREST
    const prof = (p as any)?.profiles;
    const dn = Array.isArray(prof) ? prof[0]?.display_name : prof?.display_name;
    return dn ?? t("guide.someone");
  };

  const events = (eventsData ?? []) as TripEvent[];
  const nights = Math.max(
    0,
    Math.round(
      (new Date(trip.end_date).getTime() - new Date(trip.start_date).getTime()) / 86_400_000,
    ),
  );

  // Programme groupé par jour (dans le fuseau du voyage).
  const days = new Map<string, TripEvent[]>();
  for (const e of events) {
    const key = eventDayKey(e.starts_at, e.timezone ?? trip.default_timezone);
    const list = days.get(key) ?? [];
    list.push(e);
    days.set(key, list);
  }
  const orderedDays = [...days.keys()].sort();
  const dayLabel = (key: string): string =>
    new Date(`${key}T12:00:00`).toLocaleDateString(il, {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

  // Valise groupée par section (les 3 catégories connues).
  const sections = ["a_emporter", "avant_depart", "sur_place"] as const;
  const checklistBySection = new Map<
    string,
    { id: string; title: string; done: boolean; quantity: string }[]
  >();
  for (const item of checklist ?? []) {
    const list = checklistBySection.get(item.section) ?? [];
    list.push({ id: item.id, title: item.title, done: item.done, quantity: item.quantity ?? "" });
    checklistBySection.set(item.section, list);
  }

  // Dépenses : total par devise (hors remboursements internes). Les soldes
  // détaillés restent dans l'onglet Budget (calcul monétaire de référence).
  const spendByCurrency = new Map<string, number>();
  for (const e of expenses ?? []) {
    if (e.is_settlement) {
      continue;
    }
    spendByCurrency.set(e.currency, (spendByCurrency.get(e.currency) ?? 0) + e.amount);
  }
  const money = (amount: number, currency: string): string =>
    new Intl.NumberFormat(il, { style: "currency", currency }).format(amount);

  return (
    <div className="phil-guide mx-auto max-w-3xl">
      <style>{`@media print { @page { margin: 1.4cm; } .phil-guide a { text-decoration: none; color: inherit; } }`}</style>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-laiton">{t("guide.kicker")}</p>
          <h1 className="font-display text-4xl text-encre">{trip.name}</h1>
          <p className="mt-1 text-sm text-encre-douce">
            {trip.destination} · {formatDateRange(trip.start_date, trip.end_date, dfLocale)}
          </p>
        </div>
        <div className="print:hidden">
          <PrintGuideButton />
        </div>
      </div>

      {/* AVANT */}
      <GuideSection title={t("guide.sectionBefore")} intro={t("guide.beforeIntro")}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Fact label={t("guide.destination")} value={trip.destination} />
          <Fact label={t("guide.nights")} value={String(nights)} />
          <Fact label={t("guide.timezone")} value={trip.default_timezone} />
          <Fact
            label={t("guide.currency")}
            value={[trip.currency_primary, trip.currency_secondary].filter(Boolean).join(" · ")}
          />
        </div>

        <GuideBlock title={t("guide.crew")}>
          <p className="text-sm text-encre">
            {(participants ?? []).map((p) => nameOf(p.user_id)).join(" · ") || t("guide.emptyCrew")}
          </p>
        </GuideBlock>

        <GuideBlock title={t("guide.toPrepare")}>
          {(checklist ?? []).length === 0 ? (
            <p className="text-sm text-encre-douce">{t("guide.emptyChecklist")}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {sections
                .filter((s) => (checklistBySection.get(s) ?? []).length > 0)
                .map((s) => (
                  <div key={s} className="break-inside-avoid">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-laiton">
                      {t(`checklist.tabs.${s}`)}
                    </p>
                    <ul className="flex flex-col gap-0.5 text-sm text-encre">
                      {(checklistBySection.get(s) ?? []).map((item) => (
                        <li key={item.id} className="flex gap-2">
                          <span aria-hidden="true">{item.done ? "✓" : "○"}</span>
                          <span className={item.done ? "text-encre-douce line-through" : ""}>
                            {item.title}
                            {item.quantity ? ` · ${item.quantity}` : ""}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
            </div>
          )}
        </GuideBlock>
      </GuideSection>

      {/* PENDANT */}
      <GuideSection title={t("guide.sectionDuring")} intro={t("guide.duringIntro")}>
        {orderedDays.length === 0 ? (
          <p className="text-sm text-encre-douce">{t("guide.emptyProgramme")}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {orderedDays.map((key) => (
              <div key={key} className="break-inside-avoid">
                <p className="mb-1 font-display text-lg capitalize text-encre">{dayLabel(key)}</p>
                <ul className="flex flex-col gap-1 border-l-2 border-laiton-clair pl-3">
                  {(days.get(key) ?? []).map((e) => (
                    <li key={e.id} className="text-sm">
                      <span className="font-medium text-encre">
                        {eventTime(e.starts_at, e.timezone ?? trip.default_timezone)}
                      </span>{" "}
                      <span className="text-encre">{e.title}</span>
                      {e.location_name || e.location_address ? (
                        <span className="text-encre-douce">
                          {" "}
                          — {e.location_address ?? e.location_name}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </GuideSection>

      {/* APRÈS */}
      <GuideSection title={t("guide.sectionAfter")} intro={t("guide.afterIntro")}>
        <GuideBlock title={t("guide.spending")}>
          {spendByCurrency.size === 0 ? (
            <p className="text-sm text-encre-douce">{t("guide.emptySpending")}</p>
          ) : (
            <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-encre">
              {[...spendByCurrency.entries()].map(([currency, total]) => (
                <li key={currency}>
                  <span className="font-medium">{money(total, currency)}</span>{" "}
                  <span className="text-encre-douce">{t("guide.totalSpent")}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1 text-xs text-encre-douce">{t("guide.balancesNote")}</p>
        </GuideBlock>

        <GuideBlock title={t("guide.photos")}>
          <p className="text-sm text-encre-douce">
            {t("guide.photosCount").replace("{n}", String(photoCount ?? 0))}
          </p>
        </GuideBlock>

        <GuideBlock title={t("guide.journal")}>
          {(journal ?? []).length === 0 ? (
            <p className="text-sm text-encre-douce">{t("guide.emptyJournal")}</p>
          ) : (
            <div className="flex flex-col gap-2">
              {(journal ?? []).map((entry) => {
                // biome-ignore lint/suspicious/noExplicitAny: jointure profiles objet|tableau
                const prof = (entry as any).profiles;
                const author = Array.isArray(prof) ? prof[0]?.display_name : prof?.display_name;
                return (
                  <div
                    key={`${entry.day}-${entry.author_id}`}
                    className="break-inside-avoid text-sm"
                  >
                    <span className="font-medium text-encre">{author ?? t("guide.someone")}</span>
                    <span className="text-encre-douce"> — {entry.body}</span>
                  </div>
                );
              })}
            </div>
          )}
        </GuideBlock>
      </GuideSection>

      <footer className="mt-8 border-t border-laiton-clair pt-3 text-center text-xs text-encre-douce">
        {t("guide.brandedBy")} · <span className="font-display text-sm text-encre">Phil</span> ·{" "}
        {(process.env.NEXT_PUBLIC_APP_URL ?? "phil.vercel.app").replace(/^https?:\/\//, "")}
      </footer>
    </div>
  );
}

function GuideSection({
  title,
  intro,
  children,
}: {
  title: string;
  intro: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-8 break-inside-avoid">
      <h2 className="font-display text-2xl text-bordeaux">{title}</h2>
      <p className="mb-3 text-sm text-encre-douce italic">{intro}</p>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function GuideBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="break-inside-avoid rounded-lg border border-laiton-clair bg-papier px-4 py-3">
      <p className="mb-1.5 text-sm font-medium text-encre">{title}</p>
      {children}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-laiton-clair bg-papier px-3 py-2">
      <p className="text-xs text-encre-douce">{label}</p>
      <p className="text-sm font-medium text-encre">{value}</p>
    </div>
  );
}
