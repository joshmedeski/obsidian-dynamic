import { resolve } from 'node:path';
import builtins from 'builtin-modules';
import type { UserConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export interface ObsidianViteConfigOptions {
  entry?: string;
  outDir?: string;
  prod?: boolean;
  extraPlugins?: any[];
}

export function createObsidianViteConfig({
  entry = 'src/main.ts',
  outDir = 'build',
  prod = false,
  extraPlugins = [],
}: ObsidianViteConfigOptions = {}): UserConfig {
  return {
    plugins: [
      viteStaticCopy({ targets: [{ src: 'public/*', dest: '.' }] }),
      ...extraPlugins,
    ],
    resolve: {
      alias: {
        '@': resolve(process.cwd(), './src'),
      },
    },
    build: {
      lib: {
        entry: resolve(process.cwd(), entry),
        name: 'main',
        fileName: () => 'main.js',
        formats: ['cjs'],
      },
      minify: prod,
      sourcemap: prod ? false : 'inline',
      cssCodeSplit: false,
      emptyOutDir: false,
      outDir,
      rollupOptions: {
        input: {
          main: resolve(process.cwd(), entry),
        },
        output: {
          entryFileNames: 'main.js',
          assetFileNames: (assetInfo) => {
            if (assetInfo.name === 'styles.css') return 'styles.css';
            if (assetInfo.name === 'manifest.json') return 'manifest.json';
            return '[name][extname]';
          },
        },
        external: [
          'obsidian',
          'electron',
          '@codemirror/autocomplete',
          '@codemirror/collab',
          '@codemirror/commands',
          '@codemirror/language',
          '@codemirror/lint',
          '@codemirror/search',
          '@codemirror/state',
          '@codemirror/view',
          '@lezer/common',
          '@lezer/highlight',
          '@lezer/lr',
          ...builtins,
        ],
      },
    },
  };
}
