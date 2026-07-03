"use client";

import { startRegistration } from "@simplewebauthn/browser";
import { Fingerprint } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import {
  deletePasskey,
  getRegistrationOptions,
  type SecurityActionState,
  verifyRegistration,
} from "./actions";

type Passkey = {
  id: string;
  device_name: string | null;
  created_at: string;
  last_used_at: string | null;
};

export function PasskeyManager({ passkeys }: { passkeys: Passkey[] }) {
  const router = useRouter();
  const [state, setState] = useState<SecurityActionState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  function register() {
    setState({ status: "idle" });
    startTransition(async () => {
      try {
        const options = await getRegistrationOptions();
        const response = await startRegistration({ optionsJSON: options });
        const deviceName = `${navigator.platform || "Appareil"} — ${new Date().toLocaleDateString("fr-FR")}`;
        const result = await verifyRegistration(response, deviceName);
        setState(result);
        if (result.status === "success") {
          router.refresh();
        }
      } catch (e) {
        console.error(e);
        setState({
          status: "error",
          message: "Enregistrement annulé ou non pris en charge par cet appareil.",
        });
      }
    });
  }

  function revoke(id: string) {
    startTransition(async () => {
      const result = await deletePasskey(id);
      setState(result);
      if (result.status === "success") {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <Button type="button" disabled={pending} onClick={register}>
        <Fingerprint aria-hidden="true" />
        {pending ? "En attente de l'appareil…" : "Activer Face ID / Touch ID pour le coffre"}
      </Button>

      {state.status !== "idle" ? (
        <p
          className={
            state.status === "error" ? "text-sm text-bordeaux" : "text-sm text-encre-douce"
          }
        >
          {state.message}
        </p>
      ) : null}

      {passkeys.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {passkeys.map((p) => (
            <li
              key={p.id}
              className="flex items-center gap-3 rounded-md border border-laiton-clair bg-parchemin/50 px-3 py-2 text-sm"
            >
              <span className="min-w-0 flex-1 truncate text-encre">
                {p.device_name ?? "Appareil"}
                <span className="text-xs text-encre-douce">
                  {" "}
                  · ajoutée le {new Date(p.created_at).toLocaleDateString("fr-FR")}
                  {p.last_used_at
                    ? ` · utilisée le ${new Date(p.last_used_at).toLocaleDateString("fr-FR")}`
                    : ""}
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pending}
                onClick={() => revoke(p.id)}
              >
                Révoquer
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-encre-douce">
          Aucune passkey — le coffre s'ouvre pour l'instant avec ta seule session Google.
        </p>
      )}
    </div>
  );
}
