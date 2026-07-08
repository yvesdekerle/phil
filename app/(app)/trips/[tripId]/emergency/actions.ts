"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionStateWithSuccess } from "@/lib/forms/action-state";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";

const sheetSchema = z.object({
  tripId: z.string().uuid(),
  emergencyContacts: z.string().trim().max(1000),
  insurancePolicy: z.string().trim().max(200),
  insurancePhone: z.string().trim().max(50),
  bloodGroup: z.string().trim().max(10),
  allergies: z.string().trim().max(500),
  notes: z.string().trim().max(1000),
});

export type SheetState = ActionStateWithSuccess;

/** Enregistre ma fiche d'urgence pour ce voyage (PHIL-N06). */
export async function saveEmergencySheet(
  _prev: SheetState,
  formData: FormData,
): Promise<SheetState> {
  const parsed = sheetSchema.safeParse({
    tripId: formData.get("tripId"),
    emergencyContacts: formData.get("emergencyContacts") ?? "",
    insurancePolicy: formData.get("insurancePolicy") ?? "",
    insurancePhone: formData.get("insurancePhone") ?? "",
    bloodGroup: formData.get("bloodGroup") ?? "",
    allergies: formData.get("allergies") ?? "",
    notes: formData.get("notes") ?? "",
  });
  const t = await getT();
  if (!parsed.success) {
    return { status: "error", message: t("emergency.msg.invalidInput") };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const d = parsed.data;
  const { error } = await supabase.from("emergency_sheets").upsert({
    trip_id: d.tripId,
    user_id: user.id,
    emergency_contacts: d.emergencyContacts || null,
    insurance_policy: d.insurancePolicy || null,
    insurance_phone: d.insurancePhone || null,
    blood_group: d.bloodGroup || null,
    allergies: d.allergies || null,
    notes: d.notes || null,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    return { status: "error", message: t("emergency.msg.saveFailed") };
  }
  revalidatePath(`/trips/${d.tripId}/emergency`);
  return { status: "success", message: t("emergency.msg.saved") };
}
