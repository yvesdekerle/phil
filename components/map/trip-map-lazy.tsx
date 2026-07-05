"use client";

import dynamic from "next/dynamic";
import { useT } from "@/components/i18n/provider";

function MapLoading() {
  const t = useT();
  return (
    <div className="flex h-[28rem] w-full items-center justify-center rounded-lg border border-laiton-clair bg-papier text-sm text-encre-douce">
      {t("map.loading")}
    </div>
  );
}

/** Leaflet a besoin de window : chargement client uniquement. */
export const TripMapLazy = dynamic(() => import("./trip-map").then((m) => m.TripMap), {
  ssr: false,
  loading: () => <MapLoading />,
});
