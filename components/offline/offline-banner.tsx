"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useOnlineStatus } from "@/lib/offline/use-online";

/** Bandeau global « Mode offline » (PHIL-I05). */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const pathname = usePathname();

  if (online) {
    return null;
  }

  return (
    <div className="sticky top-0 z-50 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-b border-encre/20 bg-encre px-4 py-2 text-center text-sm text-papier">
      <span>Mode offline — consultation seulement, reconnecte-toi pour modifier.</span>
      {pathname !== "/offline" ? (
        <Link href="/offline" className="underline underline-offset-4">
          Voir mes voyages synchronisés
        </Link>
      ) : null}
    </div>
  );
}
