import Link from "next/link";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatDateRange } from "@/lib/trips/format";
import { AcceptButton } from "./accept-button";

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-lg border border-laiton-clair bg-papier px-8 py-10 text-center shadow-[0_2px_16px_rgba(31,42,68,0.08)]">
        <p className="font-display text-4xl text-encre">Phil</p>
        <p className="mt-2 mb-6 text-[0.65rem] font-medium tracking-[0.18em] text-laiton uppercase">
          Invitation au voyage
        </p>
        {children}
      </div>
    </main>
  );
}

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  if (!z.string().uuid().safeParse(token).success) {
    return (
      <Shell>
        <p className="text-sm text-encre-douce">
          Ce lien d'invitation n'est pas valide. Vérifie qu'il a été copié en entier.
        </p>
      </Shell>
    );
  }

  const admin = createAdminClient();
  const { data: invitation } = await admin
    .from("trip_invitations")
    .select(
      "token, role, accepted_at, expires_at, trips(name, destination, start_date, end_date), profiles!trip_invitations_invited_by_fkey(display_name)",
    )
    .eq("token", token)
    .single();

  if (!invitation?.trips) {
    return (
      <Shell>
        <p className="text-sm text-encre-douce">
          Cette invitation n'existe pas ou a été annulée par l'équipage.
        </p>
      </Shell>
    );
  }

  const trip = invitation.trips;
  const inviterName = invitation.profiles?.display_name ?? "Un compagnon de route";
  const expired = new Date(invitation.expires_at) < new Date();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Shell>
      <h1 className="font-display text-2xl text-encre italic">{trip.name}</h1>
      <p className="mt-2 text-sm text-encre-douce">
        {trip.destination} · {formatDateRange(trip.start_date, trip.end_date)}
      </p>
      <p className="mt-4 mb-6 text-sm text-encre">
        {inviterName} t'invite à monter à bord
        {invitation.role === "VIEWER" ? " (en lecture)" : ""}.
      </p>

      {invitation.accepted_at ? (
        <p className="text-sm text-encre-douce">
          Cette invitation a déjà été utilisée.{" "}
          <Link href="/trips" className="text-bordeaux underline underline-offset-4">
            Voir mes voyages
          </Link>
        </p>
      ) : expired ? (
        <p className="text-sm text-encre-douce">
          Cette invitation a expiré — demande un nouveau lien à {inviterName}.
        </p>
      ) : user ? (
        <AcceptButton token={token} />
      ) : (
        <Button asChild className="w-full">
          <Link href={`/login?next=/invitations/${token}`}>Se connecter pour rejoindre</Link>
        </Button>
      )}
    </Shell>
  );
}
