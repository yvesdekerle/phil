import type { Messages } from "./fr";

/** English messages (PHIL-Q37) — Verne-flavoured microcopy, mirrors fr.ts keys. */
export const en: Messages = {
  nav: {
    trips: "Trips",
    vault: "Vault",
    friends: "Friends",
    clocks: "Clocks",
    tips: "Tips",
    profileAria: "Your profile",
  },
  profileMenu: {
    profile: "Profile",
    exploration: "Exploration",
    signOut: "Sign out",
    signingOut: "Signing out…",
  },
  footer: {
    tagline: "Phil — a travel journal among friends",
    privacy: "Privacy",
    legal: "Legal notice",
  },
  login: {
    welcome: "Welcome aboard",
    subtitle: "London — Bombay — Yokohama — London",
    connectPrompt: "Sign in to get the next departure ready.",
    google: "Continue with Google",
    googleLoading: "Boarding…",
    authError: "Boarding didn't go through. Try again in a moment.",
    tagline: "Phil has kept exact time since 1872.",
  },
  error: {
    title: "Phil has lost the thread",
    body: "An unexpected stopover — even Phileas met the odd delay. Try again in a moment.",
    bodyGlobal: "An unexpected breakdown. Reload the page — the adventure resumes.",
    retry: "Back on the road",
  },
  trips: {
    title: "Your trips",
    create: "Create a trip",
    emptyTitle: "Phil is ready to set off — where to?",
    emptyBody:
      "Eighty days begin with a single step: create your first trip and bring your companions along.",
    travelers: "travellers",
    traveler: "traveller",
    status: {
      en_cours: "Ongoing",
      a_venir: "Upcoming",
      passe: "Past",
      archive: "Archived",
    },
  },
  clocks: {
    title: "Clocks",
    subtitle: "The time at home and at each of your destinations — earliest zone to latest.",
    home: "Your home",
    saved: "✓ saved",
    homeSuffix: "— home",
    diff: "from home",
    empty: "Add a trip to another time zone and its clock will appear here.",
  },
  common: {
    save: "Save",
    cancel: "Cancel",
    add: "Add",
    delete: "Delete",
    loading: "Loading…",
  },
};
