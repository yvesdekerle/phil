import { format, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/vault/category-icon";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  isDocumentCategory,
  type VaultDocument,
} from "@/lib/vault/categories";

export default async function VaultPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category } = await searchParams;
  const activeCategory = category && isDocumentCategory(category) ? category : null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  let query = supabase
    .from("documents")
    .select("*")
    .eq("scope", "VAULT")
    .is("deleted_at", null)
    .order("uploaded_at", { ascending: false });
  if (activeCategory) {
    query = query.eq("category", activeCategory);
  }
  const { data } = await query;
  const documents = (data ?? []) as VaultDocument[];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-display text-3xl text-encre">Ton coffre</h1>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href="/vault/activity">Activité</Link>
          </Button>
          <Button asChild>
            <Link href="/vault/new">Ajouter un document</Link>
          </Button>
        </div>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Link
          href="/vault"
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
            activeCategory === null
              ? "border-bordeaux bg-bordeaux text-papier"
              : "border-laiton-clair bg-papier text-encre-douce hover:text-encre",
          )}
        >
          Tous
        </Link>
        {CATEGORIES.map((c) => (
          <Link
            key={c}
            href={`/vault?category=${c}`}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              activeCategory === c
                ? "border-bordeaux bg-bordeaux text-papier"
                : "border-laiton-clair bg-papier text-encre-douce hover:text-encre",
            )}
          >
            {CATEGORY_LABELS[c]}
          </Link>
        ))}
      </div>

      {documents.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-6 py-16 text-center">
          <p className="font-display text-2xl text-encre italic">
            {activeCategory ? "Rien dans cette catégorie" : "Ton coffre est vide"}
          </p>
          <p className="max-w-sm text-sm text-encre-douce">
            Passeport, carte d'identité, permis : confie-les à Phil, il les gardera sous clé et ne
            les montrera qu'à qui tu décides.
          </p>
          <Button asChild className="mt-2">
            <Link href="/vault/new">Ajouter un document</Link>
          </Button>
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {documents.map((doc) => (
            <li key={doc.id}>
              <Link
                href={`/vault/${doc.id}`}
                className="flex items-center gap-4 rounded-lg border border-laiton-clair bg-papier px-4 py-3 transition-shadow hover:shadow-[0_2px_12px_rgba(31,42,68,0.1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-laiton"
              >
                <CategoryIcon category={doc.category} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-encre">
                    {doc.file_name}
                  </span>
                  <span className="block text-xs text-encre-douce">
                    {CATEGORY_LABELS[doc.category]} · ajouté le{" "}
                    {format(parseISO(doc.uploaded_at), "d MMM yyyy", { locale: fr })}
                  </span>
                </span>
                {doc.expires_at ? (
                  <span className="shrink-0 text-xs text-encre-douce">
                    Expire le {format(parseISO(doc.expires_at), "d MMM yyyy", { locale: fr })}
                  </span>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
