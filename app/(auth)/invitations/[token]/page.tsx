import Link from "next/link";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { formatDateRange } from "@/lib/trips/format";
import { AcceptButton } from "./accept-button";

function Shell({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-lg border border-line bg-card px-8 py-10 text-center shadow-[0_2px_16px_rgba(15,47,56,0.08)]">
        <p className="font-sans text-4xl text-ink">Phil</p>
        <p className="mt-2 mb-6 text-[0.65rem] font-medium tracking-[0.18em] text-mist uppercase">
          {label}
        </p>
        {children}
      </div>
    </main>
  );
}

export default async function InvitationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const t = await getT();
  const label = t("invitations.label");

  if (!z.string().uuid().safeParse(token).success) {
    return (
      <Shell label={label}>
        <p className="text-sm text-slate">{t("invitations.invalidLink")}</p>
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
      <Shell label={label}>
        <p className="text-sm text-slate">{t("invitations.notFound")}</p>
      </Shell>
    );
  }

  const trip = invitation.trips;
  const inviterName = invitation.profiles?.display_name ?? t("invitations.inviterFallback");
  const expired = new Date(invitation.expires_at) < new Date();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <Shell label={label}>
      <h1 className="text-heading text-ink">{trip.name}</h1>
      <p className="mt-2 text-sm text-slate">
        {trip.destination} · {formatDateRange(trip.start_date, trip.end_date)}
      </p>
      <p className="mt-4 mb-6 text-sm text-ink">
        {t("invitations.invites").replace("{name}", inviterName)}
        {invitation.role === "VIEWER" ? t("invitations.viewerSuffix") : ""}.
      </p>

      {invitation.accepted_at ? (
        <p className="text-sm text-slate">
          {t("invitations.alreadyUsed")}{" "}
          <Link href="/trips" className="text-lagoon-ink underline underline-offset-4">
            {t("invitations.seeMyTrips")}
          </Link>
        </p>
      ) : expired ? (
        <p className="text-sm text-slate">
          {t("invitations.expired").replace("{name}", inviterName)}
        </p>
      ) : user ? (
        <AcceptButton token={token} />
      ) : (
        <Button asChild className="w-full">
          <Link href={`/login?next=/invitations/${token}`}>{t("invitations.signInToJoin")}</Link>
        </Button>
      )}
    </Shell>
  );
}
