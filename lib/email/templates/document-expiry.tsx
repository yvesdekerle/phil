import { Button, Section, Text } from "@react-email/components";
import type { Locale } from "@/lib/i18n/config";
import { messages, translator } from "@/lib/i18n/messages";
import { EmailShell, emailStyles } from "./base";

type Props = {
  documentName: string;
  categoryLabel: string;
  daysLeft: number;
  vaultUrl: string;
  locale: Locale;
};

export function DocumentExpiryEmail({
  documentName,
  categoryLabel,
  daysLeft,
  vaultUrl,
  locale,
}: Props) {
  const t = translator(messages[locale]);
  const days = String(daysLeft);
  return (
    <EmailShell
      locale={locale}
      preview={t("email.expiry.preview")
        .replace("{category}", categoryLabel)
        .replace("{days}", days)}
    >
      <Text style={emailStyles.heading}>{t("email.expiry.heading")}</Text>
      <Text style={emailStyles.text}>
        {t("email.expiry.bodyBefore")}
        <strong>{documentName}</strong>
        {t("email.expiry.bodyMiddle").replace("{category}", categoryLabel.toLowerCase())}
        <strong>{t("email.expiry.days").replace("{days}", days)}</strong>
        {t("email.expiry.bodyAfter")}
      </Text>
      <Text style={emailStyles.muted}>{t("email.expiry.renewalNote")}</Text>
      <Section style={emailStyles.buttonWrap}>
        <Button href={vaultUrl} style={emailStyles.button}>
          {t("email.expiry.button")}
        </Button>
      </Section>
    </EmailShell>
  );
}
