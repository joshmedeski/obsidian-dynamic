# Discogs Collection View Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a full-tab grid view of the user's Discogs vinyl collection, cross-referenced with vault notes, that opens the MusicBrainz search modal pre-filled when clicking an unimported record.

**Architecture:** Discogs API client fetches paginated collection data via personal access token. An Obsidian `ItemView` hosts a Svelte grid component with filter tabs (All/In Vault/Not in Vault). Vault matching uses frontmatter artist+title from notes in the output folder.

**Tech Stack:** TypeScript, Svelte 5, Obsidian API (`ItemView`, `requestUrl`, `CachedMetadataCache`)

---

### Task 1: Add Discogs types and settings

**Files:**
- Modify: `src/types.ts`

**Step 1: Add DiscogsRelease interface and extend settings**

Add after the `SearchResult` interface:

```typescript
export interface DiscogsArtist {
  name: string;
  id: number;
  join: string;
}

export interface DiscogsBasicInformation {
  id: number;
  title: string;
  year: number;
  thumb: string;
  cover_image: string;
  artists: DiscogsArtist[];
  formats: { name: string; qty: string; descriptions?: string[] }[];
  labels: { name: string; catno: string }[];
  genres: string[];
  styles: string[];
  resource_url: string;
}

export interface DiscogsCollectionItem {
  id: number;
  instance_id: number;
  date_added: string;
  rating: number;
  basic_information: DiscogsBasicInformation;
}

export interface DiscogsCollectionResponse {
  pagination: {
    page: number;
    pages: number;
    per_page: number;
    items: number;
  };
  releases: DiscogsCollectionItem[];
}

export interface DiscogsRelease {
  id: number;
  title: string;
  artist: string;
  year: number;
  coverImageUrl: string;
  discogsUrl: string;
}
```

Add `discogsToken` and `discogsUsername` to `MusicCollectorSettings`:

```typescript
export interface MusicCollectorSettings {
  outputFolder: string;
  templatePath: string;
  filenameFormat: string;
  discogsToken: string;
  discogsUsername: string;
}

export const DEFAULT_SETTINGS: MusicCollectorSettings = {
  outputFolder: 'Music',
  templatePath: '',
  filenameFormat: '{{artist}} - {{title}}',
  discogsToken: '',
  discogsUsername: '',
};
```

**Step 2: Verify build**

Run: `cd /Users/joshmedeski/c/ob/main && pnpm --filter obsidian-music-collector build`
Expected: Build succeeds with no type errors.

**Step 3: Commit**

```
feat: Add Discogs types and settings fields
```

---

### Task 2: Create Discogs API client

**Files:**
- Create: `src/discogs.ts`

**Step 1: Implement the Discogs API client**

```typescript
import { requestUrl } from 'obsidian';
import type {
  DiscogsCollectionResponse,
  DiscogsRelease,
} from './types';

const API_BASE = 'https://api.discogs.com';

function joinArtists(artists: { name: string; join: string }[]): string {
  return artists
    .map((a) => a.name.replace(/ \(\d+\)$/, '') + (a.join ? ` ${a.join} ` : ''))
    .join('')
    .trim();
}

function toDiscogsRelease(item: import('./types').DiscogsCollectionItem): DiscogsRelease {
  const info = item.basic_information;
  return {
    id: info.id,
    title: info.title,
    artist: joinArtists(info.artists),
    year: info.year,
    coverImageUrl: info.cover_image,
    discogsUrl: `https://www.discogs.com/release/${info.id}`,
  };
}

export async function fetchDiscogsCollection(
  username: string,
  token: string,
): Promise<DiscogsRelease[]> {
  const releases: DiscogsRelease[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `${API_BASE}/users/${encodeURIComponent(username)}/collection/folders/0/releases?page=${page}&per_page=100&sort=artist&sort_order=asc`;
    const response = await requestUrl({
      url,
      headers: {
        Authorization: `Discogs token=${token}`,
        'User-Agent': 'ObsidianMusicCollector/1.0.0',
      },
    });
    const data: DiscogsCollectionResponse = response.json;
    totalPages = data.pagination.pages;
    releases.push(...data.releases.map(toDiscogsRelease));
    page++;
  }

  return releases;
}
```

**Step 2: Verify build**

Run: `cd /Users/joshmedeski/c/ob/main && pnpm --filter obsidian-music-collector build`
Expected: Build succeeds.

**Step 3: Commit**

```
feat: Add Discogs API client for fetching collection
```

---

### Task 3: Add Discogs collection store

**Files:**
- Modify: `src/store.ts`

**Step 1: Add Discogs collection writable store**

Add imports and a new writable for the collection:

```typescript
import type { DiscogsRelease } from './types';

export const discogsCollection = writable<DiscogsRelease[]>([]);
export const discogsLoading = writable<boolean>(false);
export const discogsError = writable<string>('');
```

**Step 2: Verify build**

Run: `cd /Users/joshmedeski/c/ob/main && pnpm --filter obsidian-music-collector build`
Expected: Build succeeds.

**Step 3: Commit**

```
feat: Add Discogs collection store state
```

---

### Task 4: Update MusicSearchModal to accept initial query

**Files:**
- Modify: `src/MusicSearchModal.ts`
- Modify: `src/MusicSearch.svelte`

**Step 1: Add initialQuery prop to MusicSearchModal**

In `MusicSearchModal.ts`, update the constructor and `onOpen`:

```typescript
export class MusicSearchModal extends Modal {
  private component: any;
  private onSelectCallback: (result: SearchResult) => void;
  private initialQuery: string;

  constructor(
    app: App,
    onSelect: (result: SearchResult) => void,
    initialQuery: string = '',
  ) {
    super(app);
    this.onSelectCallback = onSelect;
    this.initialQuery = initialQuery;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    this.modalEl.addClass('music-collector-modal');
    this.modalEl.style.setProperty('--dialog-width', '700px');

    this.titleEl.setText('Search MusicBrainz');

    this.component = mount(MusicSearch, {
      target: contentEl,
      props: {
        onSelect: (result: SearchResult) => {
          this.onSelectCallback(result);
          this.close();
        },
        initialQuery: this.initialQuery,
      },
    });
  }
```

**Step 2: Update MusicSearch.svelte to use initialQuery**

Change the props and initial state:

```svelte
<script lang="ts">
  import type { SearchResult } from "./types";
  import { searchReleaseGroups } from "./musicbrainz";

  export let onSelect: (result: SearchResult) => void;
  export let initialQuery: string = "";

  let searchTerm = initialQuery;
```

No other changes needed — the existing reactive `$:` block will trigger a search when `searchTerm` is initialized with a non-empty value.

**Step 3: Verify build**

Run: `cd /Users/joshmedeski/c/ob/main && pnpm --filter obsidian-music-collector build`
Expected: Build succeeds.

**Step 4: Commit**

```
feat: Support pre-filled search query in MusicBrainz modal
```

---

### Task 5: Create DiscogsCollection Svelte component

**Files:**
- Create: `src/DiscogsCollection.svelte`

**Step 1: Create the grid component with filter tabs**

```svelte
<script lang="ts">
  import { type App, TFile } from "obsidian";
  import type { DiscogsRelease } from "./types";
  import {
    discogsCollection,
    discogsLoading,
    discogsError,
    pluginSettings,
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
      // Fallback: parse filename "Artist - Title.md"
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

  async function loadCollection() {
    const { discogsUsername, discogsToken } = $pluginSettings;
    if (!discogsUsername || !discogsToken) {
      discogsError.set("Configure your Discogs username and token in settings.");
      return;
    }
    discogsLoading.set(true);
    discogsError.set("");
    try {
      const releases = await fetchDiscogsCollection(discogsUsername, discogsToken);
      discogsCollection.set(releases);
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

  // Load on mount if not already loaded
  if ($discogsCollection.length === 0) {
    loadCollection();
  }
</script>

<div class="discogs-collection-view">
  <div class="discogs-header">
    <div class="discogs-tabs">
      <button
        class="discogs-tab {activeTab === 'all' ? 'is-active' : ''}"
        on:click={() => (activeTab = "all")}
      >
        All ({$discogsCollection.length})
      </button>
      <button
        class="discogs-tab {activeTab === 'in-vault' ? 'is-active' : ''}"
        on:click={() => (activeTab = "in-vault")}
      >
        In Vault ({$discogsCollection.filter((r) => isInVault(r, vaultMatches)).length})
      </button>
      <button
        class="discogs-tab {activeTab === 'not-in-vault' ? 'is-active' : ''}"
        on:click={() => (activeTab = "not-in-vault")}
      >
        Not in Vault ({$discogsCollection.filter((r) => !isInVault(r, vaultMatches)).length})
      </button>
    </div>
    <button class="discogs-refresh clickable-icon" on:click={loadCollection} title="Refresh collection">
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="23 4 23 10 17 10"/>
        <polyline points="1 20 1 14 7 14"/>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
      </svg>
    </button>
  </div>

  {#if $discogsLoading}
    <div class="discogs-loading">
      <div class="loading-spinner"></div>
      <span>Loading Discogs collection...</span>
    </div>
  {:else if $discogsError}
    <div class="discogs-error">{$discogsError}</div>
  {:else if filteredReleases.length === 0}
    <div class="discogs-empty">
      {#if $discogsCollection.length === 0}
        No releases found. Check your Discogs settings.
      {:else}
        No releases match this filter.
      {/if}
    </div>
  {:else}
    <div class="discogs-grid">
      {#each filteredReleases as release}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          class="discogs-card"
          on:click={() => onImport(release)}
        >
          <div class="cover-container">
            {#if release.coverImageUrl}
              <img
                src={release.coverImageUrl}
                alt={release.title}
                loading="lazy"
                on:error={handleImageError}
              />
              <div class="cover-placeholder" style="display: none;">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 18V5l12-2v13"/>
                  <circle cx="6" cy="18" r="3"/>
                  <circle cx="18" cy="16" r="3"/>
                </svg>
              </div>
            {:else}
              <div class="cover-placeholder">
                <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M9 18V5l12-2v13"/>
                  <circle cx="6" cy="18" r="3"/>
                  <circle cx="18" cy="16" r="3"/>
                </svg>
              </div>
            {/if}
            {#if isInVault(release, vaultMatches)}
              <div class="vault-badge" title="In vault">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"/>
                </svg>
              </div>
            {/if}
          </div>
          <div class="discogs-info">
            <div class="discogs-title" title={release.title}>{release.title}</div>
            <div class="discogs-artist" title={release.artist}>{release.artist}</div>
            {#if release.year}
              <span class="discogs-year">{release.year}</span>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .discogs-collection-view {
    padding: 1rem;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .discogs-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 1rem;
    gap: 0.5rem;
  }

  .discogs-tabs {
    display: flex;
    gap: 0.25rem;
  }

  .discogs-tab {
    padding: 0.4rem 0.8rem;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 0.85rem;
  }

  .discogs-tab.is-active {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
  }

  .discogs-tab:hover:not(.is-active) {
    background: var(--background-modifier-hover);
  }

  .discogs-refresh {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    padding: 4px;
    border-radius: 4px;
  }

  .discogs-refresh:hover {
    color: var(--text-normal);
    background: var(--background-modifier-hover);
  }

  .discogs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1rem;
    overflow-y: auto;
    flex: 1;
  }

  .discogs-card {
    display: flex;
    flex-direction: column;
    cursor: pointer;
    border-radius: 8px;
    padding: 8px;
    transition: background-color 0.2s ease;
  }

  .discogs-card:hover {
    background-color: var(--background-modifier-hover);
  }

  .cover-container {
    width: 100%;
    aspect-ratio: 1/1;
    overflow: hidden;
    border-radius: 6px;
    margin-bottom: 8px;
    background-color: var(--background-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    position: relative;
  }

  .cover-container img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .cover-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: var(--text-muted);
  }

  .vault-badge {
    position: absolute;
    top: 6px;
    right: 6px;
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .discogs-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .discogs-title {
    font-weight: 600;
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .discogs-artist {
    font-size: 0.8rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .discogs-year {
    font-size: 0.7rem;
    color: var(--text-faint);
  }

  .discogs-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 2rem;
    color: var(--text-muted);
    flex: 1;
  }

  .loading-spinner {
    width: 20px;
    height: 20px;
    border: 2px solid var(--background-modifier-border);
    border-top-color: var(--text-muted);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .discogs-error {
    text-align: center;
    padding: 2rem;
    color: var(--text-error);
  }

  .discogs-empty {
    text-align: center;
    padding: 2rem;
    color: var(--text-muted);
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
  }
</style>
```

**Step 2: Verify build**

Run: `cd /Users/joshmedeski/c/ob/main && pnpm --filter obsidian-music-collector build`
Expected: Build succeeds.

**Step 3: Commit**

```
feat: Add DiscogsCollection Svelte grid component
```

---

### Task 6: Create DiscogsCollectionView (Obsidian ItemView)

**Files:**
- Create: `src/DiscogsCollectionView.ts`

**Step 1: Implement the view**

```typescript
import { type App, ItemView, type WorkspaceLeaf } from 'obsidian';
import { mount, unmount } from 'svelte';
import DiscogsCollection from './DiscogsCollection.svelte';
import type { DiscogsRelease } from './types';

export const DISCOGS_VIEW_TYPE = 'discogs-collection';

export class DiscogsCollectionView extends ItemView {
  private component: any;
  private onImportCallback: (release: DiscogsRelease) => void;

  constructor(
    leaf: WorkspaceLeaf,
    onImport: (release: DiscogsRelease) => void,
  ) {
    super(leaf);
    this.onImportCallback = onImport;
  }

  getViewType(): string {
    return DISCOGS_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Discogs Collection';
  }

  getIcon(): string {
    return 'disc';
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('discogs-collection-container');

    this.component = mount(DiscogsCollection, {
      target: contentEl,
      props: {
        app: this.app,
        onImport: this.onImportCallback,
      },
    });
  }

  async onClose() {
    if (this.component) {
      unmount(this.component);
    }
    this.contentEl.empty();
  }
}
```

**Step 2: Verify build**

Run: `cd /Users/joshmedeski/c/ob/main && pnpm --filter obsidian-music-collector build`
Expected: Build succeeds.

**Step 3: Commit**

```
feat: Add DiscogsCollectionView ItemView wrapper
```

---

### Task 7: Wire everything into main.ts

**Files:**
- Modify: `src/main.ts`

**Step 1: Register the view and add command**

Add imports:
```typescript
import { DiscogsCollectionView, DISCOGS_VIEW_TYPE } from './DiscogsCollectionView';
```

In `onload()`, after `initStore(this)`, register the view:

```typescript
this.registerView(DISCOGS_VIEW_TYPE, (leaf) => {
  return new DiscogsCollectionView(leaf, (release) => {
    const query = `${release.artist} - ${release.title}`;
    new MusicSearchModal(this.app, (result) => {
      createAlbumNote(this.app, result, this.settings);
    }, query).open();
  });
});
```

Add a command after the existing `search-musicbrainz` command:

```typescript
this.addCommand({
  id: 'open-discogs-collection',
  name: 'Open Discogs Collection',
  callback: async () => {
    const existing = this.app.workspace.getLeavesOfType(DISCOGS_VIEW_TYPE);
    if (existing.length > 0) {
      this.app.workspace.revealLeaf(existing[0]);
      return;
    }
    const leaf = this.app.workspace.getLeaf(true);
    await leaf.setViewState({ type: DISCOGS_VIEW_TYPE, active: true });
    this.app.workspace.revealLeaf(leaf);
  },
});
```

**Step 2: Verify build**

Run: `cd /Users/joshmedeski/c/ob/main && pnpm --filter obsidian-music-collector build`
Expected: Build succeeds.

**Step 3: Commit**

```
feat: Register Discogs collection view and command
```

---

### Task 8: Add Discogs settings to SettingsTab

**Files:**
- Modify: `src/SettingsTab.svelte`

**Step 1: Add Discogs username and token fields**

Add after the Template Note setting item, before the closing `</div>`:

```svelte
<h2>Discogs</h2>

<div class="setting-item">
  <div class="setting-item-info">
    <div class="setting-item-name">Discogs Username</div>
    <div class="setting-item-description">
      Your Discogs profile username.
    </div>
  </div>
  <div class="setting-item-control">
    <input
      type="text"
      value={$pluginSettings.discogsUsername}
      on:input={(e) => pluginSettings.update((s) => ({ ...s, discogsUsername: (e.target as HTMLInputElement).value }))}
      placeholder="e.g., myusername"
    />
  </div>
</div>

<div class="setting-item">
  <div class="setting-item-info">
    <div class="setting-item-name">Discogs Personal Access Token</div>
    <div class="setting-item-description">
      Generate at <a href="https://www.discogs.com/settings/developers">discogs.com/settings/developers</a>.
    </div>
  </div>
  <div class="setting-item-control">
    <input
      type="password"
      value={$pluginSettings.discogsToken}
      on:input={(e) => pluginSettings.update((s) => ({ ...s, discogsToken: (e.target as HTMLInputElement).value }))}
      placeholder="Token"
    />
  </div>
</div>
```

**Step 2: Verify build**

Run: `cd /Users/joshmedeski/c/ob/main && pnpm --filter obsidian-music-collector build`
Expected: Build succeeds.

**Step 3: Commit**

```
feat: Add Discogs username and token to settings
```

---

### Task 9: Manual integration test

**Step 1: Build and reload**

Run: `cd /Users/joshmedeski/c/ob/main && pnpm --filter obsidian-music-collector build`

Then in Obsidian: Cmd+P → "Reload app without saving" (or toggle the plugin off/on).

**Step 2: Configure settings**

1. Open Music Collector settings
2. Enter Discogs username and personal access token
3. Verify fields save correctly

**Step 3: Test the collection view**

1. Cmd+P → "Open Discogs Collection"
2. Verify grid loads with album covers
3. Test filter tabs (All / In Vault / Not in Vault)
4. Click an unimported record
5. Verify MusicBrainz modal opens with pre-filled "artist - title"
6. Select a result, verify note is created
7. Go back to collection view, verify the record now shows checkmark badge

**Step 4: Test edge cases**

- Empty token/username shows helpful error message
- Refresh button reloads collection
- Large collections paginate correctly
- Records with missing cover art show placeholder
