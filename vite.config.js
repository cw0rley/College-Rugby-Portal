import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
        globIgnores: ["**/rugby.jpg"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/www\.google\.com\/s2\/favicons/,
            handler: "CacheFirst",
            options: {
              cacheName: "school-favicons",
              expiration: { maxEntries: 1500, maxAgeSeconds: 30 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-stylesheets",
              expiration: { maxAgeSeconds: 60 * 24 * 60 * 60 },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com/,
            handler: "CacheFirst",
            options: {
              cacheName: "google-fonts-webfonts",
              expiration: { maxEntries: 30, maxAgeSeconds: 60 * 24 * 60 * 60 },
            },
          },
        ],
      },
      manifest: {
        name: "College Rugby Portal",
        short_name: "Rugby Portal",
        description: "Find college rugby programs across the US",
        theme_color: "#0A1F44",
        background_color: "#0A1F44",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "/logo-icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/logo-icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/logo-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
});
