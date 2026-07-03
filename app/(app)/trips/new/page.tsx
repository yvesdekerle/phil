import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { getOwnProfile } from "@/lib/supabase/profiles";
import { createClient } from "@/lib/supabase/server";
import { TripForm } from "./trip-form";

export default async function NewTripPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profile = await getOwnProfile(supabase);

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
      <h1 className="mb-2 text-center font-display text-3xl text-encre">Nouveau voyage</h1>
      <p className="mb-6 text-center text-sm text-encre-douce">
        Un nom, une destination, deux dates — le reste suivra.
      </p>
      <Card>
        <CardContent>
          <TripForm defaultTimezone={profile?.timezone ?? "Europe/Paris"} />
        </CardContent>
      </Card>
    </main>
  );
}
