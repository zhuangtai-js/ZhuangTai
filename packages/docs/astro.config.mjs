import react from "@astrojs/react";
import starlight from "@astrojs/starlight";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "astro/config";
import { redirects, site } from "./src/config/site.mjs";
import { starlightConfig } from "./src/config/starlight.mjs";

export default defineConfig({
  redirects,
  vite: {
    plugins: [tailwindcss()],
  },
  site,
  integrations: [react(), starlight(starlightConfig)],
});
