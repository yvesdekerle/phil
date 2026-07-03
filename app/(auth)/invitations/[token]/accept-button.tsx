"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { type AcceptState, acceptInvitation } from "./actions";

export function AcceptButton({ token }: { token: string }) {
  const [state, setState] = useState<AcceptState>({ status: "idle" });
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col items-center gap-3">
      <Button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => setState(await acceptInvitation(token)))}
        className="w-full"
      >
        {pending ? "Embarquement…" : "Rejoindre le voyage"}
      </Button>
      {state.status === "error" ? (
        <p role="alert" className="text-sm text-bordeaux">
          {state.message}
        </p>
      ) : null}
    </div>
  );
}
