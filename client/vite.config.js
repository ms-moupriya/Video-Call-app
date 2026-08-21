import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nodePolyfills } from "vite-plugin-node-polyfills";

export default defineConfig({
  base: "/Video-Call-app/",

  plugins: [
    react(),
    tailwindcss(),

    nodePolyfills({
      globals: {
        global: true,
        process: true,
        buffer: true,
      },
      protocolImports: true,
    }),
  ],
});