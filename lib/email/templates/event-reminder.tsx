import { Button, Section, Text } from "@react-email/components";
import type { Locale } from "@/lib/i18n/config";
import { messages, translator } from "@/lib/i18n/messages";
import { EmailShell, emailStyles } from "./base";

type Props = {
  eventTitle: string;
  eventTime: string;
  locationName: string | null;
  eventUrl: string;
  locale: Locale;
};

export function EventReminderEmail({
  eventTitle,
  eventTime,
  locationName,
  eventUrl,
  locale,
}: Props) {
  const t = translator(messages[locale]);
  return (
    <EmailShell
      locale={locale}
      preview={t("email.reminder.preview")
        .replace("{title}", eventTitle)
        .replace("{time}", eventTime)}
    >
      <Text style={emailStyles.heading}>{t("email.reminder.heading")}</Text>
      <Text style={emailStyles.text}>
        <strong>{eventTitle}</strong> — {eventTime}
        {locationName ? `, ${locationName}` : ""}.
      </Text>
      <Text style={emailStyles.muted}>{t("email.reminder.note")}</Text>
      <Section style={emailStyles.buttonWrap}>
        <Button href={eventUrl} style={emailStyles.button}>
          {t("email.reminder.button")}
        </Button>
      </Section>
    </EmailShell>
  );
}
