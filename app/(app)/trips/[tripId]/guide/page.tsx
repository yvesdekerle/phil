import { notFound, redirect } from "next/navigation";
import { computeBalances, computeSettlements } from "@/lib/budget/balances";
import { getRates, toBase } from "@/lib/budget/rates";
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
    { data: photos, count: photoCount },
    { data: eventNotes },
  ] = await Promise.all([
    supabase
      .from("trips")
      .select(
        "id, name, destination, start_date, end_date, default_timezone, currency_primary, currency_secondary, cover_image_url",
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
    supabase
      .from("expenses")
      .select(
        "amount, currency, is_settlement, paid_by, split_mode, expense_beneficiaries(user_id, share)",
      )
      .eq("trip_id", tripId),
    supabase
      .from("journal_entries")
      .select("day, author_id, body, profiles!journal_entries_author_id_fkey(display_name)")
      .eq("trip_id", tripId)
      .order("day", { ascending: true }),
    supabase
      .from("trip_photos")
      .select("id, caption", { count: "exact" })
      .eq("trip_id", tripId)
      .order("created_at", { ascending: true })
      .limit(12),
    supabase
      .from("event_notes")
      .select("event_id, body, created_at, trip_events!inner(trip_id)")
      .eq("trip_events.trip_id", tripId)
      .order("created_at", { ascending: true }),
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

  // PHIL-U06 : notes d'événements groupées par événement, pour le programme.
  const notesByEvent = new Map<string, { body: string; at: string }[]>();
  for (const n of eventNotes ?? []) {
    const list = notesByEvent.get(n.event_id) ?? [];
    list.push({ body: n.body, at: n.created_at });
    notesByEvent.set(n.event_id, list);
  }

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

  // Soldes détaillés « qui doit combien à qui » : on reprend le calcul de
  // référence de l'onglet Budget (conversion dans la devise principale via les
  // taux, puis règlements simplifiés glouton). Les paiements de règlement
  // (is_settlement) sont inclus — ils remboursent une dette (comme Équilibre).
  const primary = trip.currency_primary ?? "EUR";
  const rates = await getRates(primary);
  const forBalance = (expenses ?? []).map((e) => {
    const raw = Number(e.amount);
    const amount =
      e.currency === primary ? raw : rates ? (toBase(raw, e.currency, rates) ?? raw) : raw;
    const convertible =
      e.currency === primary || (rates != null && toBase(raw, e.currency, rates) !== null);
    return {
      amount,
      currency: convertible ? primary : e.currency,
      paid_by: e.paid_by,
      splitMode: e.split_mode as "equal" | "shares" | "exact",
      beneficiaries: (e.expense_beneficiaries ?? []).map((b) => ({
        userId: b.user_id,
        share: b.share === null ? null : Number(b.share),
      })),
    };
  });
  const settlements = computeSettlements(computeBalances(forBalance, primary));
  const hasExpenses = (expenses ?? []).some((e) => !e.is_settlement);

  return (
    <div className="phil-guide mx-auto max-w-3xl">
      <style>{`@media print { @page { margin: 1.4cm; } .phil-guide a { text-decoration: none; color: inherit; } }`}</style>

      {/* PHIL-U06 : page de garde — impression uniquement (couverture + titre). */}
      <section className="hidden break-after-page print:block">
        <div className="flex min-h-[80vh] flex-col items-center justify-center gap-5 text-center">
          {trip.cover_image_url ? (
            // biome-ignore lint/performance/noImgElement: page de garde imprimée, URL libre (bucket/legacy), pas d'optimiseur
            <img
              src={trip.cover_image_url.split("#")[0]}
              alt=""
              className="max-h-72 w-full max-w-lg rounded-2xl object-cover shadow-lg"
            />
          ) : null}
          <p className="text-xs uppercase tracking-[0.3em] text-mist">{t("guide.kicker")}</p>
          <h1 className="font-sans text-5xl text-ink">{trip.name}</h1>
          <p className="text-lg text-slate">{trip.destination}</p>
          <p className="text-sm text-slate">
            {formatDateRange(trip.start_date, trip.end_date, dfLocale)}
          </p>
        </div>
      </section>

      <div className="mb-6 flex items-start justify-between gap-4 print:hidden">
        <div>
          <p className="text-xs uppercase tracking-wide text-mist">{t("guide.kicker")}</p>
          <h1 className="font-sans text-4xl text-ink">{trip.name}</h1>
          <p className="mt-1 text-sm text-slate">
            {trip.destination} · {formatDateRange(trip.start_date, trip.end_date, dfLocale)}
          </p>
        </div>
        <div>
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
          <p className="text-sm text-ink">
            {(participants ?? []).map((p) => nameOf(p.user_id)).join(" · ") || t("guide.emptyCrew")}
          </p>
        </GuideBlock>

        <GuideBlock title={t("guide.toPrepare")}>
          {(checklist ?? []).length === 0 ? (
            <p className="text-sm text-slate">{t("guide.emptyChecklist")}</p>
          ) : (
            <div className="flex flex-col gap-3">
              {sections
                .filter((s) => (checklistBySection.get(s) ?? []).length > 0)
                .map((s) => (
                  <div key={s} className="break-inside-avoid">
                    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-mist">
                      {t(`checklist.tabs.${s}`)}
                    </p>
                    <ul className="flex flex-col gap-0.5 text-sm text-ink">
                      {(checklistBySection.get(s) ?? []).map((item) => (
                        <li key={item.id} className="flex gap-2">
                          <span aria-hidden="true">{item.done ? "✓" : "○"}</span>
                          <span className={item.done ? "text-slate line-through" : ""}>
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
          <p className="text-sm text-slate">{t("guide.emptyProgramme")}</p>
        ) : (
          <div className="flex flex-col gap-4">
            {orderedDays.map((key) => (
              <div key={key} className="break-inside-avoid">
                <p className="mb-1 font-sans text-lg capitalize text-ink">{dayLabel(key)}</p>
                <ul className="flex flex-col gap-1 border-l-2 border-line pl-3">
                  {(days.get(key) ?? []).map((e) => {
                    const notes = notesByEvent.get(e.id) ?? [];
                    return (
                      <li key={e.id} className="text-sm">
                        <span className="font-medium text-ink">
                          {eventTime(e.starts_at, e.timezone ?? trip.default_timezone)}
                        </span>{" "}
                        <span className="text-ink">{e.title}</span>
                        {e.location_name || e.location_address ? (
                          <span className="text-slate">
                            {" "}
                            — {e.location_address ?? e.location_name}
                          </span>
                        ) : null}
                        {notes.length > 0 ? (
                          <ul className="mt-0.5 ml-4 flex flex-col gap-0.5 text-xs text-slate italic">
                            {notes.map((note) => (
                              <li key={note.at}>— {note.body}</li>
                            ))}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
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
            <p className="text-sm text-slate">{t("guide.emptySpending")}</p>
          ) : (
            <ul className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-ink">
              {[...spendByCurrency.entries()].map(([currency, total]) => (
                <li key={currency}>
                  <span className="font-medium">{money(total, currency)}</span>{" "}
                  <span className="text-slate">{t("guide.totalSpent")}</span>
                </li>
              ))}
            </ul>
          )}
        </GuideBlock>

        <GuideBlock title={t("guide.settlements")}>
          {settlements.length === 0 ? (
            <p className="text-sm text-slate">
              {hasExpenses ? t("guide.settled") : t("guide.emptySpending")}
            </p>
          ) : (
            <ul className="flex flex-col gap-1 text-sm text-ink">
              {settlements.map((s) => (
                <li key={`${s.from}-${s.to}`} className="flex items-center gap-1.5">
                  <span className="font-medium">{nameOf(s.from)}</span>
                  <span className="text-slate">→</span>
                  <span className="font-medium">{nameOf(s.to)}</span>
                  <span className="ml-auto font-medium text-lagoon-ink tabular-nums">
                    {money(s.amount, primary)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-1.5 text-xs text-slate">{t("guide.balancesNote")}</p>
        </GuideBlock>

        <GuideBlock title={t("guide.photos")}>
          {(photoCount ?? 0) === 0 ? (
            <p className="text-sm text-slate">{t("guide.photosCount").replace("{n}", "0")}</p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {(photos ?? []).map((p) => (
                  // biome-ignore lint/performance/noImgElement: vignette servie par notre API authentifiée (Supabase Storage), pas d'optimiseur Next
                  <img
                    key={p.id}
                    src={`/api/photos/${p.id}/view?thumb=1`}
                    alt={p.caption ?? t("guide.photos")}
                    loading="lazy"
                    className="aspect-square w-full rounded-md border border-line object-cover"
                  />
                ))}
              </div>
              <p className="mt-2 text-xs text-slate">
                {t("guide.photosCount").replace("{n}", String(photoCount ?? 0))}
                {(photoCount ?? 0) > (photos ?? []).length
                  ? ` · ${t("guide.photosMore").replace(
                      "{n}",
                      String((photoCount ?? 0) - (photos ?? []).length),
                    )}`
                  : ""}
              </p>
            </>
          )}
        </GuideBlock>

        <GuideBlock title={t("guide.journal")}>
          {(journal ?? []).length === 0 ? (
            <p className="text-sm text-slate">{t("guide.emptyJournal")}</p>
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
                    <span className="font-medium text-ink">{author ?? t("guide.someone")}</span>
                    <span className="text-slate"> — {entry.body}</span>
                  </div>
                );
              })}
            </div>
          )}
        </GuideBlock>
      </GuideSection>

      <footer className="mt-8 border-t border-line pt-3 text-center text-xs text-slate">
        {t("guide.brandedBy")} · <span className="font-sans text-sm text-ink">Phil</span> ·{" "}
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
      <h2 className="font-sans text-2xl text-lagoon-ink">{title}</h2>
      <p className="mb-3 text-sm text-slate italic">{intro}</p>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function GuideBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="break-inside-avoid rounded-lg border border-line bg-card px-4 py-3">
      <p className="mb-1.5 text-sm font-medium text-ink">{title}</p>
      {children}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-line bg-card px-3 py-2">
      <p className="text-xs text-slate">{label}</p>
      <p className="text-sm font-medium text-ink">{value}</p>
    </div>
  );
}
