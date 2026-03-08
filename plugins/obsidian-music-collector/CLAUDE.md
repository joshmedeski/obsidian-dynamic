# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

- `bun run dev` — Watch mode for development (Vite build with source maps)
- `bun run build` — Production build

This plugin is part of a monorepo. Run commands from this plugin directory. Uses `obsidian-vite-config` (workspace package) for shared Vite configuration.

## Architecture

Obsidian plugin for managing a music collection. Two main integrations:

**MusicBrainz** — Search for albums/release groups, fetch cover art from Cover Art Archive. Rate-limited to 1 req/sec. Entry point: `src/musicbrainz.ts`.

**Discogs** — Browse your Discogs vinyl collection with cached API responses. Entry point: `src/discogs.ts`. Cache is stored in plugin data with configurable TTL.

### Key Files

- `src/main.ts` — Plugin entry point. Registers commands, views, settings tab. Manages plugin data persistence (settings + cache stored together via `saveData`).
- `src/store.ts` — Svelte writable stores for shared state. `pluginSettings` auto-saves on change. `discogsCollection` hydrates from cache on startup.
- `src/noteCreator.ts` — Creates album notes from search results. Supports custom templates with `{{variable}}` substitution and optional Templater plugin integration.
- `src/types.ts` — All TypeScript interfaces and default settings.

### UI Layer (Svelte 5)

Svelte components are mounted/unmounted manually into Obsidian DOM containers (not SvelteKit). CSS is injected via Svelte compiler option (`css: 'injected'`).

- `DiscogsCollectionView.ts` — Obsidian `ItemView` wrapper that mounts `DiscogsCollection.svelte`
- `MusicSearchModal.ts` — Obsidian `Modal` wrapper that mounts `MusicSearch.svelte`
- `SettingsTab.svelte` — Settings UI mounted in `PluginSettingTab`

### Data Flow

Plugin data (`this.loadData()`/`this.saveData()`) contains both settings and Discogs cache as a flat object. On load, they're split: settings go to `this.settings`, cache to `this.discogsCache`. On save, they're merged back.

The `vaultRevision` store triggers re-evaluation of vault matching (checking which Discogs releases already have notes) after note creation.

## Conventions

- All HTTP requests use Obsidian's `requestUrl` (not `fetch`)
- Svelte components use `export let` props pattern (Svelte 5 compatibility mode)
- Plugin output goes to `public/` (manifest.json, styles.css)
