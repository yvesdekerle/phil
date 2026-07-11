import { getT } from "@/lib/i18n/server";
import { SignInButton } from "./sign-in-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const t = await getT();
  // Anti open-redirect : uniquement des chemins internes.
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/trips";

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-12">
      <div className="animate-rise w-full max-w-sm">
        {/* Billet d'embarquement */}
        <div className="relative rounded-lg border border-line bg-card px-8 pt-10 pb-8 shadow-[0_2px_16px_rgba(15,47,56,0.08)]">
          {/* Encoches latérales du billet */}
          <span
            aria-hidden="true"
            className="absolute top-1/2 -left-2.5 size-5 -translate-y-1/2 rounded-full border-r border-line bg-sand"
          />
          <span
            aria-hidden="true"
            className="absolute top-1/2 -right-2.5 size-5 -translate-y-1/2 rounded-full border-l border-line bg-sand"
          />

          <header className="text-center">
            <p className="font-sans text-5xl text-ink">Phil</p>
            <p className="mt-3 text-[0.65rem] font-medium tracking-[0.18em] text-mist uppercase">
              {t("login.subtitle")}
            </p>
          </header>

          <div aria-hidden="true" className="my-7 border-t border-dashed border-line" />

          <h1 className="text-center font-sans text-2xl text-ink italic">{t("login.welcome")}</h1>
          <p className="mt-2 mb-7 text-center text-sm text-slate">{t("login.connectPrompt")}</p>

          <SignInButton next={safeNext} />

          {error === "auth" ? (
            <p role="alert" className="mt-4 text-center text-sm text-lagoon-ink">
              {t("login.authError")}
            </p>
          ) : null}
        </div>

        <p className="mt-6 text-center text-xs text-slate">{t("login.tagline")}</p>
      </div>
    </main>
  );
}
