import { Search } from "lucide-react";

/**
 * Champ de recherche tolérante (PHIL-Q22) — formulaire GET, filtrage serveur
 * via `fuzzyMatch` (accents ignorés, petites fautes admises).
 */
export function SearchForm({
  action,
  q,
  placeholder,
  hidden = {},
}: {
  action: string;
  q?: string;
  placeholder: string;
  /** Paramètres d'URL à conserver (tri, filtre…). */
  hidden?: Record<string, string | undefined>;
}) {
  return (
    <form action={action} className="relative max-w-xs flex-1">
      {Object.entries(hidden).map(([name, value]) =>
        value ? <input key={name} type="hidden" name={name} value={value} /> : null,
      )}
      <Search
        className="pointer-events-none absolute top-2 left-2.5 size-4 text-encre-douce"
        aria-hidden="true"
      />
      <input
        type="search"
        name="q"
        defaultValue={q ?? ""}
        placeholder={placeholder}
        className="h-8 w-full rounded-full border border-laiton-clair bg-papier pr-3 pl-8 text-sm text-encre placeholder:text-encre-douce/70 focus:outline-none focus:ring-1 focus:ring-laiton"
      />
    </form>
  );
}
