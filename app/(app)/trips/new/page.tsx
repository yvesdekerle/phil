import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getT } from "@/lib/i18n/server";
import { getOwnProfile } from "@/lib/supabase/profiles";
import { createClient } from "@/lib/supabase/server";
import { TripForm } from "./trip-form";

export default async function NewTripPage() {
  const t = await getT();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getOwnProfile(supabase);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-6">
      <h1 className="text-title text-ink">{t("newTrip.title")}</h1>
      <p className="mt-1 mb-6 text-body text-slate">{t("newTrip.subtitle")}</p>
      <Card>
        <CardContent>
          <TripForm defaultTimezone={profile?.timezone ?? "Europe/Paris"} />
        </CardContent>
      </Card>
    </main>
  );
}
