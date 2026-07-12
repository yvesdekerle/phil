import { Check, Circle } from "lucide-react";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

/**
 * PHIL-U01 — Pastilles « à préparer avant le départ » : un coup d'œil sur ce qui
 * est déjà en place (hébergement, transport, activités, repas, valise). Lecture
 * seule des données existantes, pas de nouvelle table. Affiché sur la vue voyage
 * tant que le voyage n'est pas passé.
 */
export async function TripReadiness({ tripId }: { tripId: string }) {
  const supabase = await createClient();
  const t = await getT();

  const [{ data: events }, { count: meals }, { count: checklist }] = await Promise.all([
    supabase.from("trip_events").select("type").eq("trip_id", tripId),
    supabase.from("trip_meals").select("id", { count: "exact", head: true }).eq("trip_id", tripId),
    supabase
      .from("checklist_items")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", tripId),
  ]);

  const types = new Set((events ?? []).map((e) => e.type));
  const items = [
    { key: "lodging", done: types.has("LODGING") },
    { key: "transport", done: types.has("TRANSPORT") },
    { key: "activities", done: types.has("ACTIVITY") },
    { key: "meals", done: (meals ?? 0) > 0 },
    { key: "packing", done: (checklist ?? 0) > 0 },
  ] as const;

  const ready = items.filter((i) => i.done).length;

  return (
    <section className="rounded-lg border border-line bg-card px-4 py-3">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-medium text-ink">{t("readiness.title")}</p>
        <span className="text-xs text-slate">
          {ready}/{items.length}
        </span>
      </div>
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => (
          <li
            key={item.key}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs",
              item.done
                ? "border-lagoon/30 bg-lagoon/10 text-ink"
                : "border-line bg-sand/40 text-slate",
            )}
          >
            {item.done ? (
              <Check className="size-3.5 text-lagoon" aria-hidden="true" />
            ) : (
              <Circle className="size-3.5 text-mist" aria-hidden="true" />
            )}
            {t(`readiness.${item.key}`)}
          </li>
        ))}
      </ul>
    </section>
  );
}
