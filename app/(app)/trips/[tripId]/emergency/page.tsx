import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "./print-button";
import { SheetForm } from "./sheet-form";

/**
 * Fiches d'urgence du voyage (PHIL-N06) : digitales, partagées avec
 * l'équipage, imprimables (le papier survit aux téléphones noyés).
 */
export default async function EmergencyPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const [{ data: sheets }, { data: members }] = await Promise.all([
    supabase.from("emergency_sheets").select("*").eq("trip_id", tripId),
    supabase
      .from("trip_participants")
      .select("user_id, profiles!trip_participants_user_id_fkey(display_name)")
      .eq("trip_id", tripId),
  ]);

  const nameOf = (id: string) =>
    members?.find((m) => m.user_id === id)?.profiles?.display_name ?? "Voyageur";
  const mySheet = sheets?.find((s) => s.user_id === user.id);
  const otherSheets = (sheets ?? []).filter((s) => s.user_id !== user.id);

  const row = (label: string, value: string | null) =>
    value ? (
      <p className="text-sm">
        <span className="text-encre-douce">{label} : </span>
        <span className="whitespace-pre-line text-encre">{value}</span>
      </p>
    ) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/trips/${tripId}/participants`}
          className="text-sm text-encre-douce underline underline-offset-4 hover:text-encre"
        >
          ← Retour aux participants
        </Link>
        <PrintButton />
      </div>

      <section className="rounded-lg border border-laiton-clair bg-papier px-5 py-4 print:hidden">
        <h2 className="mb-3 text-sm font-medium text-encre">Ma fiche d'urgence</h2>
        <SheetForm
          tripId={tripId}
          defaults={{
            emergencyContacts: mySheet?.emergency_contacts ?? "",
            insurancePolicy: mySheet?.insurance_policy ?? "",
            insurancePhone: mySheet?.insurance_phone ?? "",
            bloodGroup: mySheet?.blood_group ?? "",
            allergies: mySheet?.allergies ?? "",
            notes: mySheet?.notes ?? "",
          }}
        />
      </section>

      <section>
        <h2 className="mb-3 font-display text-xl text-encre">
          Fiches de l'équipage{" "}
          <span className="text-sm text-encre-douce">
            ({(sheets ?? []).length}/{members?.length ?? 0} remplies)
          </span>
        </h2>
        {(sheets ?? []).length === 0 ? (
          <p className="rounded-lg border border-dashed border-laiton-clair bg-papier/60 px-4 py-8 text-center text-sm text-encre-douce">
            Aucune fiche pour l'instant — remplis la tienne, l'équipage suivra.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2">
            {[...(mySheet ? [mySheet] : []), ...otherSheets].map((s) => (
              <article
                key={s.user_id}
                className="break-inside-avoid rounded-lg border border-laiton-clair bg-papier px-4 py-3"
              >
                <h3 className="mb-1.5 font-medium text-encre">
                  {nameOf(s.user_id)}
                  {s.user_id === user.id ? " (toi)" : ""}
                </h3>
                <div className="flex flex-col gap-1">
                  {row("Urgence", s.emergency_contacts)}
                  {row("Assurance", s.insurance_policy)}
                  {row("Assisteur", s.insurance_phone)}
                  {row("Groupe sanguin", s.blood_group)}
                  {row("Allergies", s.allergies)}
                  {row("Notes", s.notes)}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
