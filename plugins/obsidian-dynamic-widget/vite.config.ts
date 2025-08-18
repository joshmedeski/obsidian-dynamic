import { defineConfig } from "vite";
import { createObsidianViteConfig } from "obsidian-vite-config";

export default defineConfig(({ mode }) =>
  createObsidianViteConfig({ prod: mode === "production" }),
);
