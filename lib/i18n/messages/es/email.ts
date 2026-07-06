/** Correos transaccionales — mensajes en español (PHIL-Q37). Namespace raíz `email`. */
export const emailEs = {
  email: {
    tagline: "Cuaderno de viaje",
    signature: "Hasta pronto en la ruta, Phil",
    invitation: {
      subject: "{name} te invita a unirte a «{trip}»",
      preview: "{name} te invita a unirte a «{trip}»",
      heading: "Embarque propuesto",
      inviterFallback: "Un compañero de ruta",
      bodyBefore: "{name} te invita a unirte al viaje ",
      bodyAfter: " — {destination}, {dates}.",
      perks:
        "Calendario compartido, documentos del grupo, ideas para votar: todo el viaje en un solo lugar.",
      button: "Unirse al viaje",
      fallbackPrefix: "Si el botón no funciona, copia este enlace: ",
    },
    expiry: {
      subject: "Tu documento caduca en {days} días",
      preview: "{category}: caduca en {days} días",
      heading: "Un documento está por caducar",
      bodyBefore: "Tu documento ",
      bodyMiddle: " ({category}) caduca en ",
      days: "{days} días",
      bodyAfter: ".",
      renewalNote: "Una renovación puede tardar varias semanas — mejor resolverlo antes de partir.",
      button: "Abrir mi caja fuerte",
    },
    reminder: {
      preview: "Mañana: {title} a las {time}",
      heading: "Es para mañana",
      note: "Phileas nunca perdió una salida: billetes y papeles listos la víspera.",
      button: "Ver los detalles",
    },
  },
};
