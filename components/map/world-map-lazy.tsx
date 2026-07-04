"use client";

import dynamic from "next/dynamic";

export const WorldMapLazy = dynamic(() => import("./world-map").then((m) => m.WorldMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-[420px] w-full items-center justify-center rounded-lg border border-laiton-clair bg-parchemin text-sm text-encre-douce">
      Phil déroule la mappemonde…
    </div>
  ),
});
