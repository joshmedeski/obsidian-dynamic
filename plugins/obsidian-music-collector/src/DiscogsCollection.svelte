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
    vaultRevision,
    mbMatches,
    mbScanState,
  } from "./store";
  import { triggerMBScan } from "./store";
  import { stopScan } from "./mbScanner";
  import { fetchDiscogsCollection } from "./discogs";

  export let app: App;
  export let onImport: (release: DiscogsRelease) => void;

  type FilterTab = "all" | "in-vault" | "not-in-vault";
  let activeTab: FilterTab = "all";

  type SortField = "artist" | "releaseDate" | "dateAdded";
  type SortOrder = "asc" | "desc";
  let sortField: SortField = "dateAdded";
  let sortOrder: SortOrder = "desc";

  function getVaultMatches(): { discogsIds: Set<string>; keys: Set<string> } {
    const folder = $pluginSettings.outputFolder;
    const discogsIds = new Set<string>();
    const keys = new Set<string>();
    const files = app.vault
      .getFiles()
      .filter((f) => f.path.startsWith(folder + "/"));
    for (const file of files) {
      const cache = app.metadataCache.getFileCache(file);
      const fm = cache?.frontmatter;
      if (fm?.discogsId) {
        discogsIds.add(String(fm.discogsId));
      }
      if (fm?.title && fm?.artist) {
        keys.add(`${fm.artist.toLowerCase()}|||${fm.title.toLowerCase()}`);
      }
      const name = file.basename;
      if (name.includes(" - ")) {
        keys.add(name.toLowerCase());
      }
    }
    return { discogsIds, keys };
  }

  function isInVault(
    release: DiscogsRelease,
    matches: { discogsIds: Set<string>; keys: Set<string> },
  ): boolean {
    if (matches.discogsIds.has(String(release.id))) return true;
    const fmKey = `${release.artist.toLowerCase()}|||${release.title.toLowerCase()}`;
    if (matches.keys.has(fmKey)) return true;
    const filenameKey = `${release.artist} - ${release.title}`.toLowerCase();
    if (matches.keys.has(filenameKey)) return true;
    return false;
  }

  $: vaultMatches = ($vaultRevision, getVaultMatches());
  $: filteredReleases = $discogsCollection
    .filter((r) => {
      if (activeTab === "in-vault") return isInVault(r, vaultMatches);
      if (activeTab === "not-in-vault") return !isInVault(r, vaultMatches);
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === "artist") {
        cmp = a.artist.localeCompare(b.artist);
      } else if (sortField === "releaseDate") {
        cmp = (a.year || 0) - (b.year || 0);
      } else if (sortField === "dateAdded") {
        cmp = new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
      }
      return sortOrder === "asc" ? cmp : -cmp;
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
      discogsError.set(
        "Configure your Discogs username and token in settings.",
      );
      return;
    }

    if (!force && !isCacheStale() && $discogsCollection.length > 0) {
      return;
    }

    discogsLoading.set(true);
    discogsError.set("");
    try {
      const releases = await fetchDiscogsCollection(
        discogsUsername,
        discogsToken,
      );
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

  // Load on mount if not already loaded
  if ($discogsCollection.length === 0) {
    loadCollection();
  } else if (isCacheStale()) {
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
        In Vault ({$discogsCollection.filter((r) => isInVault(r, vaultMatches))
          .length})
      </button>
      <button
        class="discogs-tab {activeTab === 'not-in-vault' ? 'is-active' : ''}"
        on:click={() => (activeTab = "not-in-vault")}
      >
        Not in Vault ({$discogsCollection.filter(
          (r) => !isInVault(r, vaultMatches),
        ).length})
      </button>
    </div>
    <div class="discogs-controls">
      <select class="discogs-sort-select" bind:value={sortField}>
        <option value="artist">Artist</option>
        <option value="releaseDate">Release Date</option>
        <option value="dateAdded">Date Added</option>
      </select>
      <button
        class="discogs-sort-order clickable-icon"
        on:click={() => (sortOrder = sortOrder === "asc" ? "desc" : "asc")}
        title={sortOrder === "asc" ? "Ascending" : "Descending"}
      >
        {#if sortOrder === "asc"}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 5v14M5 12l7-7 7 7" />
          </svg>
        {:else}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        {/if}
      </button>
      <button
        class="discogs-refresh clickable-icon"
        on:click={() => loadCollection(true)}
        title="Refresh collection"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        >
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path
            d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"
          />
        </svg>
      </button>
      {#if $mbScanState.status === "scanning"}
        <span class="mb-scan-progress"
          >{$mbScanState.processed}/{$mbScanState.total}</span
        >
        <button
          class="discogs-refresh clickable-icon"
          on:click={stopScan}
          title="Stop scan"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="currentColor"
            stroke="none"
          >
            <rect x="6" y="6" width="12" height="12" rx="2" />
          </svg>
        </button>
      {:else}
        <button
          class="discogs-refresh clickable-icon"
          on:click={triggerMBScan}
          title={$mbScanState.status === "stopped"
            ? "Resume MusicBrainz scan"
            : "Scan MusicBrainz matches"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </button>
      {/if}
    </div>
  </div>

  {#if $mbScanState.status === "scanning"}
    <div class="mb-scan-bar">
      <div
        class="mb-scan-bar-fill"
        style="width: {$mbScanState.total > 0
          ? ($mbScanState.processed / $mbScanState.total) * 100
          : 0}%"
      ></div>
    </div>
    <div class="mb-scan-current">{$mbScanState.currentRelease}</div>
  {/if}

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
        <div class="discogs-card" on:click={() => onImport(release)}>
          <div class="cover-container">
            {#if release.coverImageUrl}
              <img
                src={release.coverImageUrl}
                alt={release.title}
                loading="lazy"
                on:error={handleImageError}
              />
              <div class="cover-placeholder" style="display: none;">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
            {:else}
              <div class="cover-placeholder">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="48"
                  height="48"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="1.5"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </div>
            {/if}
            {#if isInVault(release, vaultMatches)}
              <div class="vault-badge" title="In vault">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="3"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            {/if}
            {#if $mbScanState.currentReleaseId === release.id}
              <div class="mb-cover-overlay mb-scanning" title="Scanning...">
                <div class="mb-spinner"></div>
              </div>
            {:else if $mbMatches[release.id]?.coverArtUrl}
              <img
                class="mb-cover-overlay"
                src={$mbMatches[release.id].coverArtUrl}
                alt="MusicBrainz cover"
                title={$mbMatches[release.id].title}
                loading="lazy"
              />
            {:else if !$mbMatches[release.id]}
              <div class="mb-cover-overlay mb-no-match" title="No MusicBrainz match">?</div>
            {/if}
          </div>
          <div class="discogs-info">
            <div class="discogs-title" title={release.title}>
              {release.title}
            </div>
            <div class="discogs-artist" title={release.artist}>
              {release.artist}
            </div>
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

  .discogs-controls {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .discogs-sort-select {
    font-size: 0.8rem;
    padding: 2px 6px;
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px;
    background: var(--background-primary);
    color: var(--text-normal);
  }

  .discogs-sort-order {
    background: none;
    border: none;
    cursor: pointer;
    color: var(--text-muted);
    padding: 4px;
    border-radius: 4px;
  }

  .discogs-sort-order:hover {
    color: var(--text-normal);
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

  .cover-container img:not(.mb-cover-overlay) {
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
    to {
      transform: rotate(360deg);
    }
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

  .mb-scan-progress {
    font-size: 0.75rem;
    color: var(--text-muted);
    white-space: nowrap;
  }

  .mb-scan-bar {
    height: 3px;
    background: var(--background-modifier-border);
    border-radius: 2px;
    margin-bottom: 4px;
    overflow: hidden;
  }

  .mb-scan-bar-fill {
    height: 100%;
    background: var(--interactive-accent);
    transition: width 0.3s ease;
  }

  .mb-scan-current {
    font-size: 0.7rem;
    color: var(--text-faint);
    margin-bottom: 0.5rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .mb-cover-overlay {
    position: absolute;
    bottom: 8px;
    right: 8px;
    width: 22%;
    height: auto;
    aspect-ratio: 1/1;
    border-radius: 6px;
    object-fit: cover;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
  }

  .mb-scanning {
    background: var(--background-modifier-border);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mb-spinner {
    width: 40%;
    height: 40%;
    border: 2px solid transparent;
    border-top-color: var(--text-muted);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .mb-no-match {
    background: var(--background-modifier-border);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text-faint);
    font-size: 0.75rem;
    font-weight: 600;
  }
</style>
