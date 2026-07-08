import type { Database } from "@/types/database";

export type TripIdea = Database["public"]["Tables"]["trip_ideas"]["Row"];
export type IdeaStatus = Database["public"]["Enums"]["idea_status"];

export type IdeaWithMeta = TripIdea & {
  /** Voix positives (likes + super likes) — sert au tri « popularité ». */
  voteCount: number;
  hasVoted: boolean;
  // PHIL-U07 : compteurs de verdict du swipe (affichés sur la carte).
  supers: number;
  likes: number;
  maybes: number;
  nos: number;
  /** true si tout l'équipage a swipé positif (like/super like) sur l'idée. */
  isMatch: boolean;
  creatorName: string;
  scheduledEvent: { id: string; starts_at: string; timezone: string } | null;
};
