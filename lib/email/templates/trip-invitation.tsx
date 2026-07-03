import { Button, Section, Text } from "@react-email/components";
import { EmailShell, emailStyles } from "./base";

type Props = {
  inviterName: string;
  tripName: string;
  destination: string;
  dates: string;
  inviteUrl: string;
};

export function TripInvitationEmail({
  inviterName,
  tripName,
  destination,
  dates,
  inviteUrl,
}: Props) {
  return (
    <EmailShell preview={`${inviterName} t'invite à rejoindre « ${tripName} »`}>
      <Text style={emailStyles.heading}>Embarquement proposé</Text>
      <Text style={emailStyles.text}>
        {inviterName} t'invite à rejoindre le voyage <strong>{tripName}</strong> — {destination},{" "}
        {dates}.
      </Text>
      <Text style={emailStyles.muted}>
        Calendrier partagé, documents du groupe, idées à voter : tout le voyage au même endroit.
      </Text>
      <Section style={emailStyles.buttonWrap}>
        <Button href={inviteUrl} style={emailStyles.button}>
          Rejoindre le voyage
        </Button>
      </Section>
      <Text style={emailStyles.muted}>
        Si le bouton ne fonctionne pas, copie ce lien :{" "}
        <span style={emailStyles.fallbackLink}>{inviteUrl}</span>
      </Text>
    </EmailShell>
  );
}
