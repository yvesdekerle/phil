import { redirect } from "next/navigation";
import { CoffreGate } from "@/components/vault/coffre-gate";
import { createClient } from "@/lib/supabase/server";
import { isVaultUnlocked } from "@/lib/webauthn/vault-session";
import { VaultUnlock } from "./vault-unlock";

/**
 * Gate du coffre.
 *  - Coffre E2EE activé (PHIL-T01) : verrou biométrique UNIQUE côté client
 *    (`CoffreGate`). Une biométrie déverrouille la clé maîtresse, qui ouvre
 *    ensuite tous les documents chiffrés sans redemander.
 *  - Sinon : ancien verrou passkey/HMAC (PHIL-C05).
 */
export default async function VaultLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: coffreKey } = await supabase
    .from("user_crypto_keys")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (coffreKey) {
    return <CoffreGate>{children}</CoffreGate>;
  }

  const { data: passkeys } = await supabase
    .from("user_passkeys")
    .select("id")
    .eq("user_id", user.id)
    .limit(1);

  const hasPasskey = (passkeys ?? []).length > 0;
  if (hasPasskey && !(await isVaultUnlocked(user.id))) {
    return <VaultUnlock />;
  }

  return <>{children}</>;
}
