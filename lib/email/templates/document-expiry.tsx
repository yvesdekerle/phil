import { Button, Section, Text } from "@react-email/components";
import { EmailShell, emailStyles } from "./base";

type Props = {
  documentName: string;
  categoryLabel: string;
  daysLeft: number;
  vaultUrl: string;
};

export function DocumentExpiryEmail({ documentName, categoryLabel, daysLeft, vaultUrl }: Props) {
  return (
    <EmailShell preview={`${categoryLabel} : expiration dans ${daysLeft} jours`}>
      <Text style={emailStyles.heading}>Un document arrive à échéance</Text>
      <Text style={emailStyles.text}>
        Ton document <strong>{documentName}</strong> ({categoryLabel.toLowerCase()}) expire dans{" "}
        <strong>{daysLeft} jours</strong>.
      </Text>
      <Text style={emailStyles.muted}>
        Un renouvellement peut prendre plusieurs semaines — mieux vaut s'y prendre avant le départ.
      </Text>
      <Section style={emailStyles.buttonWrap}>
        <Button href={vaultUrl} style={emailStyles.button}>
          Ouvrir mon coffre
        </Button>
      </Section>
    </EmailShell>
  );
}
