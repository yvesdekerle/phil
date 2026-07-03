import { BedDouble, Compass, Plane } from "lucide-react";
import type { EventType } from "@/lib/events/types";
import { cn } from "@/lib/utils";

const ICONS: Record<EventType, typeof Plane> = {
  TRANSPORT: Plane,
  LODGING: BedDouble,
  ACTIVITY: Compass,
};

export function EventTypeIcon({ type, className }: { type: EventType; className?: string }) {
  const Icon = ICONS[type];
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-md border border-laiton-clair bg-parchemin text-laiton",
        className,
      )}
    >
      <Icon className="size-4.5" aria-hidden="true" />
    </span>
  );
}
