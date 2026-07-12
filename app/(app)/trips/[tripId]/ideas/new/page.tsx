import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getT } from "@/lib/i18n/server";
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
  const t = await getT();

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5">
      <Link
        href={`/trips/${tripId}/ideas`}
        className="text-sm text-slate underline underline-offset-4 hover:text-ink"
      >
        {t("ideas.backToIdeas")}
      </Link>
      <h1 className="text-center font-sans text-2xl text-ink">{t("ideas.propose")}</h1>
      <p className="text-center text-sm text-slate">{t("ideas.newSubtitle")}</p>
      <Card>
        <CardContent>
          <IdeaForm tripId={trip.id} />
        </CardContent>
      </Card>
    </div>
  );
}
