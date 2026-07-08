const TAB_KEYS = ["a", "b", "c", "d", "e", "f", "g"];

/**
 * Squelette de chargement d'un voyage (PHIL-R19) — affiché instantanément
 * pendant que le layout + la page se résolvent (couverture, onglets, requêtes).
 * Améliore la latence perçue sur base distante.
 */
export default function TripLoading() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">
      <div className="animate-pulse">
        <div className="overflow-hidden rounded-lg border border-laiton-clair bg-papier">
          <div className="h-40 bg-laiton-clair/30 sm:h-52" />
          <div className="flex items-end justify-between gap-3 px-5 py-4">
            <div className="space-y-2">
              <div className="h-7 w-48 rounded bg-laiton-clair/40" />
              <div className="h-4 w-64 rounded bg-laiton-clair/25" />
            </div>
            <div className="h-6 w-20 rounded-full bg-laiton-clair/25" />
          </div>
        </div>

        <div className="mt-2 flex gap-4 overflow-hidden rounded-lg border border-laiton-clair bg-papier px-5 py-3">
          {TAB_KEYS.map((k) => (
            <div key={k} className="h-5 w-16 shrink-0 rounded bg-laiton-clair/25" />
          ))}
        </div>

        <div className="mt-6 space-y-3">
          <div className="h-24 rounded-lg bg-laiton-clair/20" />
          <div className="h-24 rounded-lg bg-laiton-clair/20" />
          <div className="h-24 rounded-lg bg-laiton-clair/20" />
        </div>
      </div>
    </main>
  );
}
