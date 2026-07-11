"use client";

import dynamic from "next/dynamic";
import { useT } from "@/components/i18n/provider";

function WorldMapLoading() {
  const t = useT();
  return (
    <div className="flex h-[420px] w-full items-center justify-center rounded-lg border border-line bg-sand text-sm text-slate">
      {t("map.worldLoading")}
    </div>
  );
}

export const WorldMapLazy = dynamic(() => import("./world-map").then((m) => m.WorldMap), {
  ssr: false,
  loading: () => <WorldMapLoading />,
});
