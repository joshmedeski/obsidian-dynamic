import { svelte } from '@sveltejs/vite-plugin-svelte';
import { createObsidianViteConfig } from 'obsidian-vite-config';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) =>
  createObsidianViteConfig({
    prod: mode === 'production',
    extraPlugins: [svelte({ compilerOptions: { css: 'injected' } })],
  })
);
