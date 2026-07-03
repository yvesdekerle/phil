import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isVaultUnlocked } from "@/lib/webauthn/vault-session";
import { VaultUnlock } from "./vault-unlock";

/**
 * Gate du coffre (PHIL-C05) : si une passkey existe, la session
 * « vault unlocked » (15 min) est exigée pour toutes les pages /vault.
 * Sans passkey : accès par la session standard (l'activation est proposée
 * sur la page Sécurité).
 */
export default async function VaultLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
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
