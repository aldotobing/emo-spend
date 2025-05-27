import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EmoSpend - Emotional Spending Tracker",
    short_name: "EmoSpend",
    description: "Track your expenses and understand your emotional spending patterns",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#6366f1",
    icons: [
      {
        src: "/icons/favicon.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/favicon.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/icons/favicon.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/favicon.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
