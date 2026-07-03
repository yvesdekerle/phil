import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { UploadForm } from "@/components/documents/upload-form";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
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

  const { data: trip } = await supabase.from("trips").select("id, name").eq("id", tripId).single();
  if (!trip) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <Link
        href={`/trips/${tripId}/documents`}
        className="text-sm text-encre-douce underline underline-offset-4 hover:text-encre"
      >
        ← Retour aux documents
      </Link>
      <h1 className="text-center font-display text-2xl text-encre">Ajouter au voyage</h1>
      <p className="text-center text-sm text-encre-douce">
        Ce document sera visible de tous les participants dès l'envoi.
      </p>
      <Card>
        <CardContent>
          <UploadForm
            userId={user.id}
            action={createTripDocument}
            defaultCategory="ticket"
            tripId={trip.id}
            submitLabel="Ajouter au voyage"
            pendingLabel="Phil distribue le document…"
          />
        </CardContent>
      </Card>
    </div>
  );
}
