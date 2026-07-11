import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { UploadForm } from "@/components/documents/upload-form";
import { Card, CardContent } from "@/components/ui/card";
import { getT } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { TRIP_CATEGORIES } from "@/lib/vault/categories";
import { createTripDocument } from "./actions";

export default async function NewTripDocumentPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }
  const t = await getT();

  const { data: trip } = await supabase.from("trips").select("id, name").eq("id", tripId).single();
  if (!trip) {
    notFound();
  }
  const { data: events } = await supabase
    .from("trip_events")
    .select("id, title")
    .eq("trip_id", tripId)
    .order("starts_at", { ascending: true });

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <Link
        href={`/trips/${tripId}/documents`}
        className="text-sm text-slate underline underline-offset-4 hover:text-ink"
      >
        {t("tripDocs.backToDocs")}
      </Link>
      <h1 className="text-center font-sans text-2xl text-ink">{t("tripDocs.newTitle")}</h1>
      <p className="text-center text-sm text-slate">{t("tripDocs.newSubtitle")}</p>
      <Card>
        <CardContent>
          <UploadForm
            userId={user.id}
            action={createTripDocument}
            defaultCategory="other"
            categories={TRIP_CATEGORIES}
            tripId={trip.id}
            submitLabel={t("tripDocs.submit")}
            pendingLabel={t("tripDocs.pending")}
            freeLabel
            events={events ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
