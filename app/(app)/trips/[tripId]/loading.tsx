import { Skeleton } from "@/components/ui/skeleton";

/**
 * Squelette de chargement d'un voyage (PHIL-R19, Lagune vive) — silhouette du
 * header compact + bande de dates + cartes du jour, en blocs wash r-8.
 */
const DAY_KEYS = ["a", "b", "c", "d", "e", "f", "g"];

export default function TripLoading() {
  return (
    <main
      className="mx-auto w-full max-w-content flex-1 px-4 py-2 lg:px-8 lg:py-6"
      aria-busy="true"
    >
      <Skeleton className="h-3 w-28" />
      <Skeleton className="mt-2 h-7 w-40" />

      <div className="mt-5 flex gap-2 overflow-hidden">
        {DAY_KEYS.map((k) => (
          <Skeleton key={k} className="h-16 w-11 shrink-0 rounded-lg" />
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
        <Skeleton className="h-20 rounded-lg" />
      </div>
    </main>
  );
}
