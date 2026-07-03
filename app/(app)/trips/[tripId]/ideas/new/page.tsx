import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { IdeaForm } from "./idea-form";

export default async function NewIdeaPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: trip } = await supabase.from("trips").select("id").eq("id", tripId).single();
  if (!trip) {
    notFound();
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <Link
        href={`/trips/${tripId}/ideas`}
        className="text-sm text-encre-douce underline underline-offset-4 hover:text-encre"
      >
        ← Retour aux idées
      </Link>
      <h1 className="text-center font-display text-2xl text-encre">Proposer une idée</h1>
      <p className="text-center text-sm text-encre-douce">
        Pas de date à ce stade — on la planifiera si le groupe embarque.
      </p>
      <Card>
        <CardContent>
          <IdeaForm tripId={trip.id} />
        </CardContent>
      </Card>
    </div>
  );
}
