"use client";

import { useEffect, useState, useTransition } from "react";
import { Switch } from "@/components/ui/switch";
import { deletePushSubscription, savePushSubscription } from "./push-actions";

/**
 * Activation des notifications push sur CET appareil (PHIL-N07).
 * Les types de notifications se règlent avec les interrupteurs K04 :
 * ce réglage-ci décide seulement si l'appareil reçoit quelque chose.
 */
export function PushToggle() {
  const [supported, setSupported] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      return;
    }
    setSupported(true);
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setEnabled(sub !== null))
      .catch(() => {});
  }, []);

  function toggle(next: boolean) {
    setError(null);
    startTransition(async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        if (next) {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") {
            setError("Notifications refusées par le navigateur.");
            return;
          }
          const sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
          });
          const result = await savePushSubscription(sub.toJSON());
          if (!result.ok) {
            await sub.unsubscribe();
            setError("Enregistrement impossible.");
            return;
          }
          setEnabled(true);
        } else {
          const sub = await reg.pushManager.getSubscription();
          if (sub) {
            await deletePushSubscription(sub.endpoint);
            await sub.unsubscribe();
          }
          setEnabled(false);
        }
      } catch (e) {
        console.error(e);
        setError("Cet appareil n'a pas pu s'abonner (service worker requis — en prod).");
      }
    });
  }

  if (!supported) {
    return (
      <p className="text-xs text-encre-douce">
        Notifications push non prises en charge par ce navigateur.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="push-device" className="flex items-center justify-between gap-4">
        <span className="text-sm text-encre">Recevoir les notifications sur cet appareil</span>
        <Switch id="push-device" checked={enabled} disabled={pending} onCheckedChange={toggle} />
      </label>
      <p className="text-xs text-encre-douce">
        Les types de notifications se règlent ci-dessus — cet interrupteur décide si cet appareil
        les reçoit.
      </p>
      {error ? <p className="text-xs text-bordeaux">{error}</p> : null}
    </div>
  );
}
