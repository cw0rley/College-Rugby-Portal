import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          firebase: ["firebase/app", "firebase/firestore", "firebase/auth", "firebase/analytics", "firebase/storage", "firebase/functions"],
        },
      },
    },
  },
});
