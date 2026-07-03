export const LODGING_PLATFORMS = ["booking", "airbnb", "hotel", "other"] as const;
export type LodgingPlatform = (typeof LODGING_PLATFORMS)[number];

export const LODGING_PLATFORM_LABELS: Record<LodgingPlatform, string> = {
  booking: "Booking",
  airbnb: "Airbnb",
  hotel: "Hôtel en direct",
  other: "Autre",
};
