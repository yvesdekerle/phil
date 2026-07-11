import { MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { waContactLink } from "@/lib/whatsapp";
import { type FriendSuggestion, FriendSuggestions } from "./friend-suggestions";
import { InviteSection } from "./invite-form";
import { LeaveTripButton, ParticipantRowActions } from "./participant-actions";

export default async function TripParticipantsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const t = await getT();
  const roleLabels: Record<string, string> = {
    OWNER: t("participants.roleOwner"),
    EDITOR: t("participants.roleEditor"),
    VIEWER: t("participants.roleViewer"),
  };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data }, { data: invitations }, { data: trip }] = await Promise.all([
    supabase
      .from("trip_participants")
      .select(
        "user_id, role, joined_at, profiles!trip_participants_user_id_fkey(display_name, avatar_url, whatsapp)",
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
    supabase.from("trips").select("whatsapp_group_url").eq("id", tripId).single(),
  ]);

  // PHIL-Q28 : équipage par ordre alphabétique
  const participants = (data ?? []).sort((a, b) =>
    (a.profiles?.display_name ?? "").localeCompare(b.profiles?.display_name ?? "", "fr"),
  );
  const iAmOwner = participants.some((p) => p.user_id === user.id && p.role === "OWNER");
  const myRole = participants.find((p) => p.user_id === user.id)?.role;
  const canInvite = myRole === "OWNER" || myRole === "EDITOR";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  // PHIL-Q06 : compagnons de mes autres voyages, pas encore à bord de celui-ci
  let friendSuggestions: FriendSuggestion[] = [];
  if (canInvite) {
    const { data: myTrips } = await supabase
      .from("trips")
      .select(
        "id, trip_participants(user_id, profiles!trip_participants_user_id_fkey(display_name, avatar_url))",
      )
      .neq("id", tripId);
    const aboard = new Set(participants.map((p) => p.user_id));
    const seen = new Map<string, FriendSuggestion>();
    for (const tr of myTrips ?? []) {
      for (const p of tr.trip_participants) {
        if (p.user_id !== user.id && !aboard.has(p.user_id) && !seen.has(p.user_id)) {
          seen.set(p.user_id, {
            userId: p.user_id,
            name: p.profiles?.display_name ?? t("participants.travelerFallback"),
            avatarUrl: p.profiles?.avatar_url ?? null,
          });
        }
      }
    }
    friendSuggestions = [...seen.values()];
  }

  return (
    <div className="flex flex-col gap-5">
      {trip?.whatsapp_group_url ? (
        <div>
          <Button asChild variant="outline">
            <a href={trip.whatsapp_group_url} target="_blank" rel="noopener noreferrer">
              <MessageCircle aria-hidden="true" /> {t("participants.groupChat")}
            </a>
          </Button>
        </div>
      ) : null}
      <ul className="flex flex-col gap-2">
        {participants.map((p) => {
          const profile = p.profiles;
          const name = profile?.display_name ?? t("participants.travelerFallback");
          const isMe = p.user_id === user.id;
          return (
            <li
              key={p.user_id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-card px-4 py-3"
            >
              {profile?.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt=""
                  width={36}
                  height={36}
                  className="rounded-full border border-line"
                />
              ) : (
                <span className="flex size-9 items-center justify-center rounded-full border border-line bg-sand text-sm text-mist">
                  {name.charAt(0).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 flex-1 text-sm font-medium text-ink">
                {name}
                {isMe ? <span className="text-slate">{t("participants.you")}</span> : null}
                {profile?.whatsapp ? (
                  waContactLink(profile.whatsapp) ? (
                    <a
                      href={waContactLink(profile.whatsapp) ?? undefined}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-0.5 flex items-center gap-1 text-xs font-normal text-slate hover:text-ink hover:underline"
                    >
                      <MessageCircle className="size-3.5" aria-hidden="true" />
                      {profile.whatsapp}
                    </a>
                  ) : (
                    <span className="mt-0.5 flex items-center gap-1 text-xs font-normal text-slate">
                      <MessageCircle className="size-3.5" aria-hidden="true" />
                      {profile.whatsapp}
                    </span>
                  )
                ) : null}
              </span>
              {iAmOwner && !isMe ? (
                <ParticipantRowActions
                  tripId={tripId}
                  userId={p.user_id}
                  userName={name}
                  role={p.role}
                />
              ) : (
                <span className="text-xs text-slate">{roleLabels[p.role] ?? p.role}</span>
              )}
            </li>
          );
        })}
      </ul>

      {canInvite ? <FriendSuggestions tripId={tripId} friends={friendSuggestions} /> : null}

      {canInvite ? (
        <InviteSection tripId={tripId} pending={invitations ?? []} baseUrl={baseUrl} />
      ) : null}

      <div className="flex items-center justify-between">
        <LeaveTripButton tripId={tripId} />
        <Link
          href={`/trips/${tripId}/emergency`}
          className="text-sm text-slate underline underline-offset-4 hover:text-ink"
        >
          {t("participants.emergencyLink")}
        </Link>
      </div>
    </div>
  );
}
