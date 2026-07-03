import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { UploadForm } from "./upload-form";

export default async function NewDocumentPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <main className="mx-auto w-full max-w-lg flex-1 px-4 py-8">
      <h1 className="mb-2 text-center font-display text-3xl text-encre">Ajouter au coffre</h1>
      <p className="mb-6 text-center text-sm text-encre-douce">
        Ton document reste privé — tu décideras plus tard de le partager, voyage par voyage.
      </p>
      <Card>
        <CardContent>
          <UploadForm userId={user.id} />
        </CardContent>
      </Card>
    </main>
  );
}
