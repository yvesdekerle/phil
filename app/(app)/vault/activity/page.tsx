import { format, parseISO, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

const ACTION_LABELS: Record<string, string> = {
  UPLOAD: "Ajout",
  VIEW: "Consultation",
  DOWNLOAD: "Téléchargement",
  UPDATE: "Modification",
  DELETE: "Suppression",
  SHARE: "Partage",
  UNSHARE: "Fin de partage",
};

const PERIODS = [
  { key: "7", label: "7 jours" },
  { key: "30", label: "30 jours" },
  { key: "all", label: "Tout" },
] as const;

/** Vue « Activité de mon coffre » (PHIL-E08) : audit RLS de vault_access_log. */
export default async function VaultActivityPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; document?: string; period?: string }>;
}) {
  const { action, document: documentId, period = "30" } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  let query = supabase
    .from("vault_access_log")
    .select(
      "id, action, accessed_at, document_id, documents(file_name), profiles!vault_access_log_accessed_by_fkey(display_name)",
    )
    .eq("document_owner_id", user.id)
    .order("accessed_at", { ascending: false })
    .limit(200);

  const VAULT_ACTIONS = [
    "UPLOAD",
    "VIEW",
    "DOWNLOAD",
    "UPDATE",
    "DELETE",
    "SHARE",
    "UNSHARE",
  ] as const;
  const actionFilter = VAULT_ACTIONS.find((a) => a === action);
  if (actionFilter) {
    query = query.eq("action", actionFilter);
  }
  if (documentId) {
    query = query.eq("document_id", documentId);
  }
  if (period !== "all") {
    const days = period === "7" ? 7 : 30;
    query = query.gte("accessed_at", subDays(new Date(), days).toISOString());
  }

  const [{ data: entries }, { data: myDocs }] = await Promise.all([
    query,
    supabase
      .from("documents")
      .select("id, file_name")
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .order("file_name"),
  ]);

  const buildHref = (patch: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    const merged = { action, document: documentId, period, ...patch };
    for (const [k, v] of Object.entries(merged)) {
      if (v && !(k === "period" && v === "30")) {
        params.set(k, v);
      }
    }
    const qs = params.toString();
    return qs ? `/vault/activity?${qs}` : "/vault/activity";
  };

  const chip = (href: string, label: string, active: boolean) => (
    <Link
      key={href + label}
      href={href}
      className={cn(
        "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "border-bordeaux bg-bordeaux text-papier"
          : "border-laiton-clair bg-papier text-encre hover:bg-parchemin",
      )}
    >
      {label}
    </Link>
  );

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <Link
        href="/vault"
        className="text-sm text-encre-douce underline underline-offset-4 hover:text-encre"
      >
        ← Retour au coffre
      </Link>
      <h1 className="mt-3 font-display text-3xl text-encre">Activité de mon coffre</h1>
      <p className="mt-1 mb-6 text-sm text-encre-douce">
        Qui a consulté quoi, et quand — Phil tient le registre depuis le premier jour.
      </p>

      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {chip(buildHref({ action: undefined }), "Toutes actions", !action)}
        {Object.entries(ACTION_LABELS).map(([key, label]) =>
          chip(buildHref({ action: key }), label, action === key),
        )}
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {PERIODS.map((p) => chip(buildHref({ period: p.key }), p.label, period === p.key))}
      </div>
      {(myDocs ?? []).length > 0 ? (
        <div className="mb-6 flex flex-wrap items-center gap-1.5">
          {chip(buildHref({ document: undefined }), "Tous documents", !documentId)}
          {(myDocs ?? []).map((d) =>
            chip(buildHref({ document: d.id }), d.file_name, documentId === d.id),
          )}
        </div>
      ) : null}

      {(entries ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-6 py-14 text-center">
          <p className="font-display text-xl text-encre italic">Rien à signaler</p>
          <p className="mt-2 text-sm text-encre-douce">
            Aucune activité sur cette période — le coffre est resté fermé.
          </p>
        </div>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {(entries ?? []).map((entry) => (
            <li
              key={entry.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md border border-laiton-clair/60 bg-papier px-4 py-2.5 text-sm"
            >
              <span className="w-40 shrink-0 text-xs text-encre-douce tabular-nums">
                {format(parseISO(entry.accessed_at), "d MMM yyyy · HH:mm", { locale: fr })}
              </span>
              <span className="shrink-0 rounded-full bg-encre/10 px-2 py-0.5 text-xs font-medium text-encre">
                {ACTION_LABELS[entry.action] ?? entry.action}
              </span>
              <span className="min-w-0 flex-1 truncate text-encre">
                {entry.documents?.file_name ?? "Document supprimé"}
              </span>
              <span className="shrink-0 text-xs text-encre-douce">
                par {entry.profiles?.display_name ?? "?"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
