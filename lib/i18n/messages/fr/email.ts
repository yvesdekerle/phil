/**
 * Emails transactionnels — messages français (PHIL-Q37).
 * Namespace racine `email`. Envoyés dans la langue du destinataire.
 * Placeholders `{name}`, `{trip}`, `{destination}`, `{dates}`, `{category}`,
 * `{days}`, `{title}`, `{time}` remplacés côté template/sender via `.replace()`.
 */
export const emailFr = {
  email: {
    tagline: "Carnet de voyage",
    signature: "À bientôt sur la route, Phil",
    invitation: {
      subject: "{name} t'invite à rejoindre « {trip} »",
      preview: "{name} t'invite à rejoindre « {trip} »",
      heading: "Embarquement proposé",
      inviterFallback: "Un compagnon de route",
      bodyBefore: "{name} t'invite à rejoindre le voyage ",
      bodyAfter: " — {destination}, {dates}.",
      perks:
        "Calendrier partagé, documents du groupe, idées à voter : tout le voyage au même endroit.",
      button: "Rejoindre le voyage",
      fallbackPrefix: "Si le bouton ne fonctionne pas, copie ce lien : ",
    },
    expiry: {
      subject: "Ton document expire dans {days} jours",
      preview: "{category} : expiration dans {days} jours",
      heading: "Un document arrive à échéance",
      bodyBefore: "Ton document ",
      bodyMiddle: " ({category}) expire dans ",
      days: "{days} jours",
      bodyAfter: ".",
      renewalNote:
        "Un renouvellement peut prendre plusieurs semaines — mieux vaut s'y prendre avant le départ.",
      button: "Ouvrir mon coffre",
    },
    reminder: {
      preview: "Demain : {title} à {time}",
      heading: "C'est pour demain",
      note: "Phileas n'a jamais raté un départ : billets et papiers prêts la veille.",
      button: "Voir les détails",
    },
  },
};
