import type { PartialMessages } from ".";

/**
 * Mensajes en español (PHIL-Q37) — microcopia con sabor a Verne. Puede ser parcial:
 * toda clave ausente recae automáticamente en el francés (ver `translator`).
 * Se traduce pantalla por pantalla.
 */
export const es: PartialMessages = {
  nav: {
    trips: "Viajes",
    vault: "Caja fuerte",
    friends: "Amigos",
    clocks: "Relojes",
    tips: "Consejos",
    profileAria: "Tu perfil",
    language: "Cambiar de idioma",
  },
  passport: {
    expiresBeforePrefix: "Tu pasaporte caduca el ",
    expiresBeforeSuffix: " — antes del final del viaje. Renuévalo sin demora.",
    expires6Prefix: "Tu pasaporte caduca el ",
    expires6Suffix:
      " — menos de 6 meses después del regreso. Algunos países exigen 6 meses de validez tras la estancia: comprueba las normas del destino.",
  },
  tripTabs: {
    aria: "Secciones del viaje",
    calendar: "Bitácora",
    map: "Mapa",
    lodging: "Alojamiento",
    documents: "Documentos",
    ideas: "Ideas",
    polls: "Encuestas",
    checklist: "Maleta",
    photos: "Fotos",
    budget: "Presupuesto",
    participants: "Participantes",
    settings: "Ajustes",
  },
  profileMenu: {
    profile: "Perfil",
    exploration: "Exploración",
    signOut: "Cerrar sesión",
    signingOut: "Cerrando sesión…",
  },
  footer: {
    tagline: "Phil — cuaderno de viaje entre amigos",
    privacy: "Privacidad",
    legal: "Aviso legal",
  },
  login: {
    welcome: "Bienvenido a bordo",
    subtitle: "Londres — Bombay — Yokohama — Londres",
    connectPrompt: "Inicia sesión para preparar la próxima salida.",
    google: "Continuar con Google",
    googleLoading: "Embarcando…",
    authError: "El embarque no ha salido bien. Inténtalo de nuevo en un momento.",
    tagline: "Phil guarda la hora exacta desde 1872.",
  },
  error: {
    title: "Phil ha perdido el hilo",
    body: "Una escala imprevista — hasta Phileas tuvo algún que otro contratiempo. Inténtalo de nuevo en un momento.",
    bodyGlobal: "Una avería inesperada. Recarga la página — la aventura continúa.",
    retry: "Retomar el camino",
  },
  trips: {
    title: "Tus viajes",
    create: "Crear un viaje",
    emptyTitle: "Phil está listo para partir, ¿adónde vamos?",
    emptyBody:
      "80 días empiezan por un primer paso: crea tu primer viaje y embarca a tus compañeros de ruta.",
    travelers: "viajeros",
    traveler: "viajero",
    status: {
      en_cours: "En curso",
      a_venir: "Próximo",
      passe: "Pasado",
      archive: "Archivado",
    },
  },
  clocks: {
    title: "Relojes",
    subtitle:
      "La hora en tu casa y en cada uno de tus destinos — del huso más temprano al más tardío.",
    home: "Tu casa",
    saved: "✓ guardado",
    homeSuffix: "— en tu casa",
    diff: "respecto a tu casa",
    empty: "Añade un viaje a otro huso horario y su reloj aparecerá aquí.",
  },
  common: {
    save: "Guardar",
    cancel: "Cancelar",
    add: "Añadir",
    delete: "Eliminar",
    loading: "Cargando…",
  },
};
