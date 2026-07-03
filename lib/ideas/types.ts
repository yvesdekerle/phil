import type { Database } from "@/types/database";

export type TripIdea = Database["public"]["Tables"]["trip_ideas"]["Row"];
export type IdeaStatus = Database["public"]["Enums"]["idea_status"];

export type IdeaWithMeta = TripIdea & {
  voteCount: number;
  hasVoted: boolean;
  creatorName: string;
};
