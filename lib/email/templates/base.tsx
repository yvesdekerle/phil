import { Body, Container, Head, Hr, Html, Preview, Section, Text } from "@react-email/components";

const styles = {
  body: { backgroundColor: "#f4eee1", fontFamily: "Georgia, 'Times New Roman', serif" },
  container: {
    backgroundColor: "#fbf8f1",
    border: "1px solid #d9c9a3",
    borderRadius: "8px",
    margin: "24px auto",
    maxWidth: "520px",
    padding: "32px",
  },
  wordmark: {
    color: "#1f2a44",
    fontSize: "28px",
    fontWeight: 700 as const,
    margin: "0 0 4px",
    textAlign: "center" as const,
  },
  tagline: {
    color: "#a98a54",
    fontSize: "11px",
    letterSpacing: "2px",
    margin: "0 0 24px",
    textAlign: "center" as const,
    textTransform: "uppercase" as const,
  },
  hr: { borderColor: "#d9c9a3", margin: "24px 0" },
  signature: { color: "#5a6379", fontSize: "13px", margin: 0, textAlign: "center" as const },
};

export function EmailShell({ preview, children }: { preview: string; children: React.ReactNode }) {
  return (
    <Html lang="fr">
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Text style={styles.wordmark}>Phil</Text>
          <Text style={styles.tagline}>Carnet de voyage</Text>
          <Section>{children}</Section>
          <Hr style={styles.hr} />
          <Text style={styles.signature}>À bientôt sur la route, Phil</Text>
        </Container>
      </Body>
    </Html>
  );
}

export const emailStyles = {
  heading: {
    color: "#1f2a44",
    fontSize: "20px",
    fontWeight: 700 as const,
    margin: "0 0 12px",
  },
  text: { color: "#1f2a44", fontSize: "14px", lineHeight: "22px", margin: "0 0 12px" },
  muted: { color: "#5a6379", fontSize: "13px", lineHeight: "20px", margin: "0 0 12px" },
  button: {
    backgroundColor: "#6e1f2e",
    borderRadius: "6px",
    color: "#fbf8f1",
    display: "inline-block",
    fontSize: "14px",
    fontWeight: 600 as const,
    padding: "12px 24px",
    textDecoration: "none",
  },
  buttonWrap: { margin: "20px 0", textAlign: "center" as const },
  fallbackLink: { color: "#6e1f2e", fontSize: "12px", wordBreak: "break-all" as const },
};
