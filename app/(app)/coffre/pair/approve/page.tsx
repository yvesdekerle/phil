import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PairApprove } from "./pair-approve";

/**
 * Page d'approbation d'un appareil (PHIL-T01, Phase 4c), ouverte en scannant le
 * QR affiché par le nouvel appareil. Authentification requise (même compte).
 */
export default async function PairApprovePage({
  searchParams,
}: {
  searchParams: Promise<{ pid?: string }>;
}) {
  const { pid } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-12">
      <h1 className="mb-4 text-center font-sans text-2xl text-ink">Ajouter un appareil</h1>
      {pid ? (
        <PairApprove pairingId={pid} />
      ) : (
        <p className="text-center text-sm text-lagoon-ink">Lien d'appariement invalide.</p>
      )}
    </main>
  );
}
