import { Button, Section, Text } from "@react-email/components";
import { EmailShell, emailStyles } from "./base";

type Props = {
  eventTitle: string;
  eventTime: string;
  locationName: string | null;
  eventUrl: string;
};

export function EventReminderEmail({ eventTitle, eventTime, locationName, eventUrl }: Props) {
  return (
    <EmailShell preview={`Demain : ${eventTitle} à ${eventTime}`}>
      <Text style={emailStyles.heading}>C'est pour demain</Text>
      <Text style={emailStyles.text}>
        <strong>{eventTitle}</strong> — {eventTime}
        {locationName ? `, ${locationName}` : ""}.
      </Text>
      <Text style={emailStyles.muted}>
        Phileas n'a jamais raté un départ : billets et papiers prêts la veille.
      </Text>
      <Section style={emailStyles.buttonWrap}>
        <Button href={eventUrl} style={emailStyles.button}>
          Voir les détails
        </Button>
      </Section>
    </EmailShell>
  );
}
