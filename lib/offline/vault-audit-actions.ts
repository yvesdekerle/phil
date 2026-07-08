"use server";

import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { areUuids } from "@/lib/validation";

/**
 * Rejoue les consultations de documents du coffre faites offline (PHIL-T01
 * Phase 5b) dans `vault_access_log`, avec leur horodatage d'origine (`accessed_at`
 * antidaté) et un marqueur « offline ». On ne loggue que des documents `VAULT`
 * réellement possédés par l'utilisateur (garde anti-entrée périmée/étrangère).
 */
const schema = z.array(z.object({ documentId: z.string(), at: z.string() })).max(500);

export async function logDeferredVaultViews(
  input: unknown,
): Promise<{ ok: boolean; logged: number }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, logged: 0 };
  }
  // Garde-fous : UUID valide + horodatage parseable (les entrées viennent d'un
  // client, même si on les a nous-mêmes enfilées).
  const entries = parsed.data.filter(
    (e) => areUuids(e.documentId) && !Number.isNaN(Date.parse(e.at)),
  );
  if (entries.length === 0) {
    return { ok: true, logged: 0 };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, logged: 0 };
  }

  // Propriété vérifiée via le client de session (RLS) : uniquement ses docs VAULT.
  const ids = [...new Set(entries.map((e) => e.documentId))];
  const { data: docs } = await supabase
    .from("documents")
    .select("id, owner_id, scope")
    .in("id", ids);
  const ownedVault = new Set(
    (docs ?? []).filter((d) => d.owner_id === user.id && d.scope === "VAULT").map((d) => d.id),
  );

  const rows = entries
    .filter((e) => ownedVault.has(e.documentId))
    .map((e) => ({
      document_id: e.documentId,
      accessed_by: user.id,
      document_owner_id: user.id,
      action: "VIEW" as const,
      accessed_at: e.at,
      user_agent: "offline (différé)",
    }));
  if (rows.length === 0) {
    // Rien à logguer, mais l'appel a réussi → le client peut vider sa file.
    return { ok: true, logged: 0 };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("vault_access_log").insert(rows);
  if (error) {
    return { ok: false, logged: 0 };
  }
  return { ok: true, logged: rows.length };
}
