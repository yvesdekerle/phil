import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

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
  const { data } = await supabase
    .from("trip_participants")
    .select("role, joined_at, profiles!trip_participants_user_id_fkey(display_name, avatar_url)")
    .eq("trip_id", tripId)
    .order("joined_at", { ascending: true });

  const participants = data ?? [];

  return (
    <ul className="flex flex-col gap-2">
      {participants.map((p) => {
        const profile = p.profiles;
        const name = profile?.display_name ?? "Voyageur";
        return (
          <li
            key={`${name}-${p.joined_at}`}
            className="flex items-center gap-3 rounded-lg border border-laiton-clair bg-papier px-4 py-3"
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
            <span className="flex-1 text-sm font-medium text-encre">{name}</span>
            <span className="text-xs text-encre-douce">{ROLE_LABELS[p.role] ?? p.role}</span>
          </li>
        );
      })}
      <li className="mt-2 text-center text-xs text-encre-douce">
        L'invitation de nouveaux compagnons arrive avec la Phase 7.
      </li>
    </ul>
  );
}
