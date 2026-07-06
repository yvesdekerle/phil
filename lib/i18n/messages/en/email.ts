/** Transactional emails — English messages (PHIL-Q37). Root namespace `email`. */
export const emailEn = {
  email: {
    tagline: "Travel journal",
    signature: "See you on the road, Phil",
    invitation: {
      subject: "{name} invites you to join “{trip}”",
      preview: "{name} invites you to join “{trip}”",
      heading: "All aboard",
      inviterFallback: "A travelling companion",
      bodyBefore: "{name} invites you to join the trip ",
      bodyAfter: " — {destination}, {dates}.",
      perks: "Shared calendar, group documents, ideas to vote on: the whole trip in one place.",
      button: "Join the trip",
      fallbackPrefix: "If the button doesn't work, copy this link: ",
    },
    expiry: {
      subject: "Your document expires in {days} days",
      preview: "{category}: expires in {days} days",
      heading: "A document is coming due",
      bodyBefore: "Your document ",
      bodyMiddle: " ({category}) expires in ",
      days: "{days} days",
      bodyAfter: ".",
      renewalNote: "A renewal can take several weeks — best to see to it before you set off.",
      button: "Open my vault",
    },
    reminder: {
      preview: "Tomorrow: {title} at {time}",
      heading: "It's tomorrow",
      note: "Phileas never missed a departure: tickets and papers ready the night before.",
      button: "See the details",
    },
  },
};
