<script lang="ts">
  import type { SearchResult } from "./types";
  import { searchReleaseGroups } from "./musicbrainz";

  export let onSelect: (result: SearchResult) => void;

  let searchTerm = "";
  let results: SearchResult[] = [];
  let loading = false;
  let searched = false;
  let timer: NodeJS.Timeout;

  $: {
    clearTimeout(timer);
    const query = searchTerm;
    if (query.trim()) {
      timer = setTimeout(async () => {
        loading = true;
        searched = true;
        try {
          results = await searchReleaseGroups(query);
        } catch (e) {
          console.error("MusicBrainz search error:", e);
          results = [];
        }
        loading = false;
      }, 400);
    } else {
      results = [];
      searched = false;
      loading = false;
    }
  }

  function handleImageError(e: Event) {
    const img = e.target as HTMLImageElement;
    img.style.display = "none";
    const placeholder = img.nextElementSibling as HTMLElement;
    if (placeholder) placeholder.style.display = "flex";
  }
</script>

<div class="search-container">
  <input
    type="text"
    placeholder="Search albums, artists..."
    bind:value={searchTerm}
    class="search-input"
  />
</div>

{#if loading}
  <div class="loading-container">
    <div class="loading-spinner"></div>
    <span class="loading-text">Searching MusicBrainz...</span>
  </div>
{:else if searched && results.length === 0}
  <div class="empty-state">No results found</div>
{:else}
  <div class="music-grid">
    {#each results as result}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="music-card" on:click={() => onSelect(result)}>
        <div class="cover-container">
          {#if result.coverArtUrl}
            <img
              src={result.coverArtUrl}
              alt={result.title}
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
        </div>
        <div class="music-info">
          <div class="music-title" title={result.title}>{result.title}</div>
          <div class="music-artist" title={result.artist}>{result.artist}</div>
          {#if result.primaryType}
            <span class="type-badge">{result.primaryType}</span>
          {/if}
        </div>
      </div>
    {/each}
  </div>
{/if}

<style>
  .search-container {
    padding: 0 0 1rem 0;
  }

  .search-input {
    width: 100%;
  }

  .music-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1rem;
    max-height: 60vh;
    overflow-y: auto;
  }

  .music-card {
    display: flex;
    flex-direction: column;
    cursor: pointer;
    border-radius: 8px;
    padding: 8px;
    transition: background-color 0.2s ease;
  }

  .music-card:hover {
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

  .music-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .music-title {
    font-weight: 600;
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .music-artist {
    font-size: 0.8rem;
    color: var(--text-muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .type-badge {
    display: inline-block;
    font-size: 0.7rem;
    padding: 1px 6px;
    border-radius: 10px;
    background-color: var(--background-secondary);
    color: var(--text-muted);
    width: fit-content;
    margin-top: 2px;
  }

  .loading-container {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 2rem;
    color: var(--text-muted);
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

  .loading-text {
    font-size: 0.9rem;
  }

  .empty-state {
    text-align: center;
    padding: 2rem;
    color: var(--text-muted);
    font-size: 0.9rem;
  }
</style>
