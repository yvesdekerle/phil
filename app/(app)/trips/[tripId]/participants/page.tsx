import Image from "next/image";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { InviteSection } from "./invite-form";
import { LeaveTripButton, ParticipantRowActions } from "./participant-actions";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Capitaine",
  EDITOR: "Éditeur",
  VIEWER: "Lecteur",
};

export default async function TripParticipantsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data }, { data: invitations }] = await Promise.all([
    supabase
      .from("trip_participants")
      .select(
        "user_id, role, joined_at, profiles!trip_participants_user_id_fkey(display_name, avatar_url)",
      )
      .eq("trip_id", tripId)
      .order("joined_at", { ascending: true }),
    supabase
      .from("trip_invitations")
      .select("id, invited_email, role, token, expires_at")
      .eq("trip_id", tripId)
      .is("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: true }),
  ]);

  const participants = data ?? [];
  const iAmOwner = participants.some((p) => p.user_id === user.id && p.role === "OWNER");
  const myRole = participants.find((p) => p.user_id === user.id)?.role;
  const canInvite = myRole === "OWNER" || myRole === "EDITOR";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col gap-2">
        {participants.map((p) => {
          const profile = p.profiles;
          const name = profile?.display_name ?? "Voyageur";
          const isMe = p.user_id === user.id;
          return (
            <li
              key={p.user_id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-laiton-clair bg-papier px-4 py-3"
            >
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt=""
                  width={36}
                  height={36}
                  className="rounded-full border border-laiton-clair"
                />
              ) : (
                <span className="flex size-9 items-center justify-center rounded-full border border-laiton-clair bg-parchemin text-sm text-laiton">
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 flex-1 text-sm font-medium text-encre">
                {name}
                {isMe ? <span className="text-encre-douce"> (toi)</span> : null}
              </span>
              {iAmOwner && !isMe ? (
                <ParticipantRowActions
                  tripId={tripId}
                  userId={p.user_id}
                  userName={name}
                  role={p.role}
                />
              ) : (
                <span className="text-xs text-encre-douce">{ROLE_LABELS[p.role] ?? p.role}</span>
              )}
            </li>
          );
        })}
      </ul>

      {canInvite ? (
        <InviteSection tripId={tripId} pending={invitations ?? []} baseUrl={baseUrl} />
      ) : null}

      <div>
        <LeaveTripButton tripId={tripId} />
      </div>
    </div>
  );
}
