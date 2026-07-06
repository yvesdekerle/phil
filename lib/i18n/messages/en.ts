import type { PartialMessages } from ".";

/**
 * English messages (PHIL-Q37) — Verne-flavoured microcopy. Peut être partiel :
 * toute clé absente retombe automatiquement sur le français (voir `translator`).
 * On traduit écran par écran.
 */
export const en: PartialMessages = {
  nav: {
    trips: "Trips",
    vault: "Vault",
    friends: "Friends",
    clocks: "Clocks",
    tips: "Tips",
    profileAria: "Your profile",
    language: "Change language",
  },
  passport: {
    expiresBeforePrefix: "Your passport expires on ",
    expiresBeforeSuffix: " — before the end of the trip. Renew it right away.",
    expires6Prefix: "Your passport expires on ",
    expires6Suffix:
      " — less than 6 months after your return. Some countries require 6 months' validity after the stay: check the destination's rules.",
  },
  tripTabs: {
    aria: "Trip sections",
    calendar: "Calendar",
    map: "Map",
    lodging: "Lodging",
    documents: "Documents",
    ideas: "Ideas",
    polls: "Polls",
    checklist: "Packing",
    photos: "Photos",
    budget: "Purse",
    participants: "Travellers",
    settings: "Settings",
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
