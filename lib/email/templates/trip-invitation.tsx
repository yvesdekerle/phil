import { Button, Section, Text } from "@react-email/components";
import type { Locale } from "@/lib/i18n/config";
import { messages, translator } from "@/lib/i18n/messages";
import { EmailShell, emailStyles } from "./base";

type Props = {
  inviterName: string;
  tripName: string;
  destination: string;
  dates: string;
  inviteUrl: string;
  locale: Locale;
};

export function TripInvitationEmail({
  inviterName,
  tripName,
  destination,
  dates,
  inviteUrl,
  locale,
}: Props) {
  const t = translator(messages[locale]);
  return (
    <EmailShell
      locale={locale}
      preview={t("email.invitation.preview")
        .replace("{name}", inviterName)
        .replace("{trip}", tripName)}
    >
      <Text style={emailStyles.heading}>{t("email.invitation.heading")}</Text>
      <Text style={emailStyles.text}>
        {t("email.invitation.bodyBefore").replace("{name}", inviterName)}
        <strong>{tripName}</strong>
        {t("email.invitation.bodyAfter")
          .replace("{destination}", destination)
          .replace("{dates}", dates)}
      </Text>
      <Text style={emailStyles.muted}>{t("email.invitation.perks")}</Text>
      <Section style={emailStyles.buttonWrap}>
        <Button href={inviteUrl} style={emailStyles.button}>
          {t("email.invitation.button")}
        </Button>
      </Section>
      <Text style={emailStyles.muted}>
        {t("email.invitation.fallbackPrefix")}
        <span style={emailStyles.fallbackLink}>{inviteUrl}</span>
      </Text>
    </EmailShell>
  );
}
