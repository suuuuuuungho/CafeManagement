import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves the site from /<repo-name>/, so the build needs that
// prefix baked into asset URLs. Local dev keeps the default "/".
// The deploy workflow sets VITE_BASE_PATH="/<repo-name>/" at build time.
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || "/",
});
