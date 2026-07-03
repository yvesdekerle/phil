import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Phil — Carnet de voyage",
    short_name: "Phil",
    description: "Carnet de voyage collaboratif avec coffre-fort d'identité personnel.",
    start_url: "/trips",
    display: "standalone",
    background_color: "#f4eee1",
    theme_color: "#f4eee1",
    lang: "fr",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
