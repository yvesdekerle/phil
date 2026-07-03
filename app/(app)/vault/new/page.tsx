import { redirect } from "next/navigation";
import { UploadForm } from "@/components/documents/upload-form";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { createDocument } from "./actions";

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
          <UploadForm
            userId={user.id}
            action={createDocument}
            submitLabel="Ajouter au coffre"
            pendingLabel="Phil range ton document…"
          />
        </CardContent>
      </Card>
    </main>
  );
}
