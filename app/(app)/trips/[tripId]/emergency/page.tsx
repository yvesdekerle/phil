import Link from "next/link";
import { redirect } from "next/navigation";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { PrintButton } from "./print-button";
import { SheetForm } from "./sheet-form";

/**
 * Fiches d'urgence du voyage (PHIL-N06) : digitales, partagées avec
 * l'équipage, imprimables (le papier survit aux téléphones noyés).
 */
export default async function EmergencyPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const t = await getT();
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
      .select("user_id, profiles!trip_participants_user_id_fkey(display_name, whatsapp)")
      .eq("trip_id", tripId),
  ]);

  const nameOf = (id: string) =>
    members?.find((m) => m.user_id === id)?.profiles?.display_name ??
    t("emergency.travelerFallback");
  const whatsappOf = (id: string) =>
    members?.find((m) => m.user_id === id)?.profiles?.whatsapp ?? null;
  const mySheet = sheets?.find((s) => s.user_id === user.id);
  const otherSheets = (sheets ?? []).filter((s) => s.user_id !== user.id);

  const row = (label: string, value: string | null) =>
    value ? (
      <p className="text-sm">
        <span className="text-slate">{label} : </span>
        <span className="whitespace-pre-line text-ink">{value}</span>
      </p>
    ) : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between print:hidden">
        <Link
          href={`/trips/${tripId}/participants`}
          className="text-sm text-slate underline underline-offset-4 hover:text-ink"
        >
          {t("emergency.backToParticipants")}
        </Link>
        <PrintButton />
      </div>

      <section className="rounded-lg border border-line bg-card px-5 py-4 print:hidden">
        <h2 className="mb-3 text-sm font-medium text-ink">{t("emergency.mySheet")}</h2>
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
        <h2 className="mb-3 text-heading text-ink">
          {t("emergency.crewSheets")}{" "}
          <span className="text-sm text-slate">
            ({(sheets ?? []).length}/{members?.length ?? 0} {t("emergency.filled")})
          </span>
        </h2>
        {(sheets ?? []).length === 0 ? (
          <p className="rounded-lg border border-dashed border-line bg-card/60 px-4 py-8 text-center text-sm text-slate">
            {t("emergency.empty")}
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 print:grid-cols-2">
            {[...(mySheet ? [mySheet] : []), ...otherSheets].map((s) => (
              <article
                key={s.user_id}
                className="break-inside-avoid rounded-lg border border-line bg-card px-4 py-3"
              >
                <h3 className="mb-1.5 font-medium text-ink">
                  {nameOf(s.user_id)}
                  {s.user_id === user.id ? t("emergency.you") : ""}
                </h3>
                <div className="flex flex-col gap-1">
                  {row(t("emergency.row.whatsapp"), whatsappOf(s.user_id))}
                  {row(t("emergency.row.emergency"), s.emergency_contacts)}
                  {row(t("emergency.row.insurance"), s.insurance_policy)}
                  {row(t("emergency.row.assistance"), s.insurance_phone)}
                  {row(t("emergency.row.bloodGroup"), s.blood_group)}
                  {row(t("emergency.row.allergies"), s.allergies)}
                  {row(t("emergency.row.notes"), s.notes)}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
