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
        <div className="rounded-xl bg-card px-8 pt-10 pb-8 text-center shadow-float">
          <header>
            <p className="text-4xl font-extrabold tracking-tight text-ink">Phil</p>
            <p className="mt-2 font-mono text-label tracking-widest text-mist uppercase">
              {t("login.subtitle")}
            </p>
          </header>

          <div aria-hidden="true" className="my-7 border-t border-wash" />

          <h1 className="text-heading text-ink">{t("login.welcome")}</h1>
          <p className="mt-1.5 mb-7 text-body text-slate">{t("login.connectPrompt")}</p>

          <SignInButton next={safeNext} />

          {error === "auth" ? (
            <p role="alert" className="mt-4 text-caption text-berry-ink">
              {t("login.authError")}
            </p>
          ) : null}
        </div>

        <p className="mt-6 text-center text-caption text-slate">{t("login.tagline")}</p>
      </div>
    </main>
  );
}
