import { Skeleton } from "@/components/ui/skeleton";

/**
 * Chargement de route (Lagune vive) — squelettes wash r-8, silhouette proche
 * du contenu ; jamais de spinner plein écran.
 */
export default function Loading() {
  return (
    <main className="mx-auto w-full max-w-content flex-1 px-4 py-6 lg:px-6" aria-busy="true">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="mt-2 h-7 w-48" />
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Skeleton className="h-44 rounded-xl" />
        <Skeleton className="hidden h-44 rounded-xl lg:block" />
      </div>
      <div className="mt-4 flex flex-col gap-2.5">
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
        <Skeleton className="h-14 rounded-lg" />
      </div>
    </main>
  );
}
