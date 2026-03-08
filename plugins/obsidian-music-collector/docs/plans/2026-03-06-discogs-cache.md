# Discogs Collection Cache Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Cache Discogs collection results locally using Obsidian's `saveData()`/`loadData()` with a user-configurable TTL and manual refresh button.

**Architecture:** Store cached releases and a `lastFetched` timestamp alongside plugin settings in `data.json`. On view open, serve from cache immediately. Auto-refresh only when cache is older than the configured TTL. The existing refresh button forces a fetch regardless of TTL. Requires refactoring `loadData`/`saveData` to preserve cache data alongside settings.

**Tech Stack:** Obsidian API (`loadData`/`saveData`), Svelte 5, TypeScript

---

### Task 1: Add cache types and TTL setting

**Files:**
- Modify: `src/types.ts`

**Step 1: Add `DiscogsCache` interface and `cacheTTLMinutes` setting**

Add after the `DiscogsRelease` interface (~line 74):

```ts
export interface DiscogsCache {
  releases: DiscogsRelease[];
  lastFetched: number; // Unix timestamp ms
}
```

Add `cacheTTLMinutes` to `MusicCollectorSettings` (~line 82):

```ts
export interface MusicCollectorSettings {
  outputFolder: string;
  templatePath: string;
  filenameFormat: string;
  discogsToken: string;
  discogsUsername: string;
  cacheTTLMinutes: number;
}
```

Update `DEFAULT_SETTINGS` (~line 84) to include the new field:

```ts
export const DEFAULT_SETTINGS: MusicCollectorSettings = {
  outputFolder: 'Music',
  templatePath: '',
  filenameFormat: '{{artist}} - {{title}}',
  discogsToken: '',
  discogsUsername: '',
  cacheTTLMinutes: 60,
};
```

**Step 2: Commit**

```bash
git add src/types.ts
git commit -m "feat: Add DiscogsCache type and cacheTTLMinutes setting"
```

---

### Task 2: Refactor plugin data persistence to preserve cache

**Files:**
- Modify: `src/main.ts`

Currently `saveSettings()` calls `this.saveData(this.settings)` which overwrites the entire `data.json`, losing any cache data. We need to store cache alongside settings.

**Step 1: Add a `discogsCache` field and refactor load/save**

Add import for `DiscogsCache` type. Add a `discogsCache` field to the plugin class. Refactor `loadSettings` to also load cache. Refactor `saveSettings` to merge settings with cache before saving. Add a `saveCache` method.

In `src/main.ts`, update the plugin class:

```ts
import { type App, Plugin, PluginSettingTab } from 'obsidian';
import { mount, unmount } from 'svelte';
import { MusicSearchModal } from './MusicSearchModal';
import SettingsTab from './SettingsTab.svelte';
import { DiscogsCollectionView, DISCOGS_VIEW_TYPE } from './DiscogsCollectionView';
import { createAlbumNote } from './noteCreator';
import { initStore } from './store';
import { DEFAULT_SETTINGS, type DiscogsCache, type MusicCollectorSettings } from './types';

// ... MusicCollectorSettingTab class unchanged ...

export default class MusicCollectorPlugin extends Plugin {
  settings: MusicCollectorSettings = DEFAULT_SETTINGS;
  discogsCache: DiscogsCache | null = null;

  // onload() unchanged

  async loadSettings() {
    const data = await this.loadData();
    if (data) {
      const { discogsCache, ...rest } = data;
      this.settings = { ...DEFAULT_SETTINGS, ...rest };
      this.discogsCache = discogsCache ?? null;
    }
  }

  async saveSettings() {
    await this.saveData({ ...this.settings, discogsCache: this.discogsCache });
  }

  async saveCache(cache: DiscogsCache) {
    this.discogsCache = cache;
    await this.saveData({ ...this.settings, discogsCache: this.discogsCache });
  }

  onunload() {}
}
```

**Step 2: Commit**

```bash
git add src/main.ts
git commit -m "feat: Refactor plugin data persistence to preserve cache"
```

---

### Task 3: Expose cache through the store

**Files:**
- Modify: `src/store.ts`

The store needs to expose the cache so the Svelte component can read/write it. Add a function to save cache through the plugin instance.

**Step 1: Add cache store and save function**

```ts
import { writable } from 'svelte/store';
import type MusicCollectorPlugin from './main';
import { DEFAULT_SETTINGS, type DiscogsCache, type MusicCollectorSettings } from './types';
import type { DiscogsRelease } from './types';

export const pluginSettings = writable<MusicCollectorSettings>(DEFAULT_SETTINGS);
export const discogsCollection = writable<DiscogsRelease[]>([]);
export const discogsLoading = writable<boolean>(false);
export const discogsError = writable<string>('');

let plugin: MusicCollectorPlugin;

export function initStore(p: MusicCollectorPlugin) {
  plugin = p;
  pluginSettings.set(p.settings);

  // Hydrate collection from cache on startup
  if (p.discogsCache?.releases?.length) {
    discogsCollection.set(p.discogsCache.releases);
  }
}

export async function saveDiscogsCache(releases: DiscogsRelease[]) {
  const cache: DiscogsCache = { releases, lastFetched: Date.now() };
  await plugin.saveCache(cache);
}

export function getDiscogsCache(): DiscogsCache | null {
  return plugin?.discogsCache ?? null;
}

pluginSettings.subscribe((value) => {
  if (plugin) {
    plugin.settings = value;
    plugin.saveSettings();
  }
});
```

**Step 2: Commit**

```bash
git add src/store.ts
git commit -m "feat: Expose cache read/write through store"
```

---

### Task 4: Update Svelte component to use cache with TTL

**Files:**
- Modify: `src/DiscogsCollection.svelte`

The component should:
1. On mount, if store is already hydrated from cache, show it immediately
2. Check if cache is stale (older than TTL) -- if so, auto-refresh in background
3. Manual refresh button always fetches fresh data
4. After any fetch, persist to cache

**Step 1: Update the `loadCollection` and mount logic**

Replace the script section:

```svelte
<script lang="ts">
  import { type App, TFile } from "obsidian";
  import type { DiscogsRelease } from "./types";
  import {
    discogsCollection,
    discogsLoading,
    discogsError,
    pluginSettings,
    saveDiscogsCache,
    getDiscogsCache,
  } from "./store";
  import { fetchDiscogsCollection } from "./discogs";

  export let app: App;
  export let onImport: (release: DiscogsRelease) => void;

  type FilterTab = "all" | "in-vault" | "not-in-vault";
  let activeTab: FilterTab = "all";

  function getVaultMatches(): Set<string> {
    const folder = $pluginSettings.outputFolder;
    const keys = new Set<string>();
    const files = app.vault.getFiles().filter((f) => f.path.startsWith(folder + "/"));
    for (const file of files) {
      const cache = app.metadataCache.getFileCache(file);
      const fm = cache?.frontmatter;
      if (fm?.title && fm?.artist) {
        keys.add(`${fm.artist.toLowerCase()}|||${fm.title.toLowerCase()}`);
      }
      const name = file.basename;
      if (name.includes(" - ")) {
        keys.add(name.toLowerCase());
      }
    }
    return keys;
  }

  function isInVault(release: DiscogsRelease, matches: Set<string>): boolean {
    const fmKey = `${release.artist.toLowerCase()}|||${release.title.toLowerCase()}`;
    if (matches.has(fmKey)) return true;
    const filenameKey = `${release.artist} - ${release.title}`.toLowerCase();
    if (matches.has(filenameKey)) return true;
    return false;
  }

  $: vaultMatches = getVaultMatches();
  $: filteredReleases = $discogsCollection.filter((r) => {
    if (activeTab === "in-vault") return isInVault(r, vaultMatches);
    if (activeTab === "not-in-vault") return !isInVault(r, vaultMatches);
    return true;
  });

  function isCacheStale(): boolean {
    const cache = getDiscogsCache();
    if (!cache?.lastFetched) return true;
    const ttlMs = $pluginSettings.cacheTTLMinutes * 60 * 1000;
    return Date.now() - cache.lastFetched > ttlMs;
  }

  async function loadCollection(force = false) {
    const { discogsUsername, discogsToken } = $pluginSettings;
    if (!discogsUsername || !discogsToken) {
      discogsError.set("Configure your Discogs username and token in settings.");
      return;
    }

    if (!force && !isCacheStale() && $discogsCollection.length > 0) {
      return;
    }

    discogsLoading.set(true);
    discogsError.set("");
    try {
      const releases = await fetchDiscogsCollection(discogsUsername, discogsToken);
      discogsCollection.set(releases);
      await saveDiscogsCache(releases);
    } catch (e: any) {
      discogsError.set(e?.message ?? "Failed to fetch collection");
    }
    discogsLoading.set(false);
  }

  function handleImageError(e: Event) {
    const img = e.target as HTMLImageElement;
    img.style.display = "none";
    const placeholder = img.nextElementSibling as HTMLElement;
    if (placeholder) placeholder.style.display = "flex";
  }

  // On mount: show cached data immediately, auto-refresh if stale
  if ($discogsCollection.length === 0) {
    loadCollection();
  } else if (isCacheStale()) {
    loadCollection();
  }
</script>
```

**Important:** The refresh button in the template must pass `force = true`. Update line ~104:

```svelte
<button class="discogs-refresh clickable-icon" on:click={() => loadCollection(true)} title="Refresh collection">
```

The rest of the template and styles remain unchanged.

**Step 2: Commit**

```bash
git add src/DiscogsCollection.svelte
git commit -m "feat: Use cached collection with TTL-based auto-refresh"
```

---

### Task 5: Add TTL setting to the settings UI

**Files:**
- Modify: `src/SettingsTab.svelte`

**Step 1: Read `src/SettingsTab.svelte` to understand current layout**

Read the file first to see the existing settings UI structure.

**Step 2: Add a "Cache TTL" number input to the Discogs settings section**

Add a setting for `cacheTTLMinutes` with a label like "Collection cache duration (minutes)" and a number input. Bind it to `$pluginSettings.cacheTTLMinutes`. Place it after the existing Discogs token/username settings.

**Step 3: Commit**

```bash
git add src/SettingsTab.svelte
git commit -m "feat: Add cache TTL setting to settings UI"
```

---

### Task 6: Build and verify

**Step 1: Build the plugin**

```bash
cd /Users/joshmedeski/c/ob/main/plugins/obsidian-music-collector
pnpm build
```

Expected: Clean build with no TypeScript errors.

**Step 2: Manual verification in Obsidian**

1. Open Obsidian, open Discogs Collection view
2. First load should fetch from Discogs and cache
3. Close and reopen view -- should show cached data instantly with no loading spinner
4. Wait or set TTL to 0 -- should auto-refresh
5. Click refresh button -- should always fetch fresh
6. Check Settings > Music Collector -- TTL field should be present

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: Address build/runtime issues from cache implementation"
```
