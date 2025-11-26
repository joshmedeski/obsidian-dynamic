import { createObsidianViteConfig } from 'obsidian-vite-config';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) =>
  createObsidianViteConfig({ prod: mode === 'production' })
);
