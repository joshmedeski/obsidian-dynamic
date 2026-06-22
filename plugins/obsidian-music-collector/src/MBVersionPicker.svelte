<script lang="ts">
  import type { MBMatch, MBReleaseVersion } from "./types";
  import { fetchReleaseVersions } from "./musicbrainz";

  export let match: MBMatch;
  export let onPin: (version: MBReleaseVersion | null) => void;
  export let onClose: () => void;

  let versions: MBReleaseVersion[] = [];
  let loading = true;
  let error = "";
  let truncated = false;
  let filter = "";
  let selectedId: string | null = match.release?.id ?? null;
  let pinning = false;

  const currentReleaseId = match.release?.id ?? null;

  async function load() {
    loading = true;
    error = "";
    try {
      const result = await fetchReleaseVersions(match.mbid);
      versions = result.sort((a, b) => a.date.localeCompare(b.date));
      truncated = result.length >= 100;
    } catch (e) {
      console.error("Failed to fetch MusicBrainz versions:", e);
      error = "Failed to load versions. Check your connection and try again.";
    }
    loading = false;
  }

  load();

  function year(date: string): string {
    return date ? date.slice(0, 4) : "";
  }

  function coverUrl(releaseId: string): string {
    return `https://coverartarchive.org/release/${releaseId}/front-250`;
  }

  function metaLine(v: MBReleaseVersion): string {
    return [v.country, v.format].filter(Boolean).join(" · ");
  }

  // The note title this edition will produce: the release title plus its
  // MusicBrainz disambiguation (e.g. "(Mono)") when present.
  function editionTitle(v: MBReleaseVersion): string {
    const base = v.title?.trim() ? v.title : match.title;
    return v.disambiguation?.trim() ? `${base} (${v.disambiguation})` : base;
  }

  function handleImageError(e: Event) {
    const img = e.target as HTMLImageElement;
    img.style.display = "none";
    const placeholder = img.nextElementSibling as HTMLElement;
    if (placeholder) placeholder.style.display = "flex";
  }

  $: normalizedFilter = filter.trim().toLowerCase();
  $: filteredVersions = normalizedFilter
    ? versions.filter((v) =>
        [
          v.title,
          v.disambiguation,
          year(v.date),
          v.country,
          v.label,
          v.catalogNumber,
          v.format,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedFilter),
      )
    : versions;

  function selectAlbumDefault() {
    selectedId = null;
  }

  function selectVersion(v: MBReleaseVersion) {
    selectedId = v.id;
  }

  async function confirmPin() {
    pinning = true;
    if (selectedId === null) {
      onPin(null);
    } else {
      const version = versions.find((v) => v.id === selectedId);
      if (version) onPin(version);
    }
  }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div class="modal version-modal-backdrop" on:click={onClose}>
  <div class="version-modal" on:click|stopPropagation>
    <div class="version-modal-header">
      <div class="version-modal-title">Choose version</div>
      <div class="version-modal-subtitle">
        {match.artist} – {match.title}
      </div>
    </div>

    {#if loading}
      <div class="version-modal-state">
        <div class="version-spinner"></div>
        <span>Loading versions…</span>
      </div>
    {:else if error}
      <div class="version-modal-state version-modal-error">{error}</div>
    {:else}
      <input
        type="text"
        class="version-filter"
        placeholder="Filter by year, country, label, catalog #, format…"
        bind:value={filter}
      />

      <div class="version-grid">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          class="version-card version-card-default {selectedId === null
            ? 'is-selected'
            : ''}"
          on:click={selectAlbumDefault}
        >
          <div class="version-cover">
            {#if match.coverArtUrl}
              <img
                src={match.coverArtUrl}
                alt="Album cover"
                loading="lazy"
                on:error={handleImageError}
              />
              <div class="version-cover-placeholder" style="display: none;">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
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
              <div class="version-cover-placeholder">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
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
            {#if currentReleaseId === null}
              <span class="version-current-badge">current</span>
            {/if}
          </div>
          <div class="version-card-info">
            <div class="version-card-title">Album default</div>
            <div class="version-card-meta">no specific edition</div>
          </div>
        </div>

        {#each filteredVersions as v (v.id)}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div
            class="version-card {selectedId === v.id ? 'is-selected' : ''}"
            on:click={() => selectVersion(v)}
            title={[v.label, v.catalogNumber, v.disambiguation]
              .filter(Boolean)
              .join(" · ")}
          >
            <div class="version-cover">
              <img
                src={coverUrl(v.id)}
                alt={v.title || match.title}
                loading="lazy"
                on:error={handleImageError}
              />
              <div class="version-cover-placeholder" style="display: none;">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="40"
                  height="40"
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
              {#if v.status && v.status !== "Official"}
                <span class="version-status-badge">{v.status}</span>
              {/if}
              {#if currentReleaseId === v.id}
                <span class="version-current-badge">current</span>
              {/if}
            </div>
            <div class="version-card-info">
              <div
                class="version-card-title"
                title={editionTitle(v)}
                class:version-title-alt={editionTitle(v) !== match.title}
              >
                {editionTitle(v)}
              </div>
              <div class="version-card-meta">
                <span class="version-card-year">{year(v.date) || "—"}</span>
                {#if metaLine(v)}
                  <span class="version-card-sep">·</span>
                  <span class="version-card-detail" title={metaLine(v)}
                    >{metaLine(v)}</span
                  >
                {/if}
              </div>
            </div>
          </div>
        {/each}

        {#if filteredVersions.length === 0}
          <div class="version-empty">No versions match this filter.</div>
        {/if}
      </div>

      {#if truncated}
        <div class="version-truncated">
          Showing the first 100 versions. Refine with the filter if you don't
          see yours.
        </div>
      {/if}
    {/if}

    <div class="version-modal-actions">
      <button class="version-btn" on:click={onClose}>Cancel</button>
      <button
        class="version-btn version-btn-primary"
        disabled={loading || !!error || pinning}
        on:click={confirmPin}
      >
        {pinning ? "Pinning…" : "Pin selected"}
      </button>
    </div>
  </div>
</div>

<style>
  .version-modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
  }

  .version-modal {
    background: var(--background-primary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 8px;
    padding: 1.25rem;
    width: 820px;
    max-width: 92vw;
    max-height: 85vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
  }

  .version-modal-header {
    margin-bottom: 0.75rem;
  }

  .version-modal-title {
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-normal);
  }

  .version-modal-subtitle {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin-top: 2px;
  }

  .version-modal-state {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 2rem;
    color: var(--text-muted);
  }

  .version-modal-error {
    color: var(--text-error);
  }

  .version-spinner {
    width: 18px;
    height: 18px;
    border: 2px solid var(--background-modifier-border);
    border-top-color: var(--text-muted);
    border-radius: 50%;
    animation: version-spin 0.8s linear infinite;
  }

  @keyframes version-spin {
    to {
      transform: rotate(360deg);
    }
  }

  .version-filter {
    width: 100%;
    padding: 0.4rem 0.6rem;
    border: 1px solid var(--background-modifier-border);
    border-radius: 6px;
    background: var(--background-primary);
    color: var(--text-normal);
    font-size: 0.85rem;
    margin-bottom: 0.5rem;
  }

  .version-filter:focus {
    outline: none;
    border-color: var(--interactive-accent);
  }

  .version-grid {
    flex: 1;
    overflow-y: auto;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 0.75rem;
    padding: 0.25rem;
    align-content: start;
  }

  .version-card {
    display: flex;
    flex-direction: column;
    cursor: pointer;
    border-radius: 8px;
    padding: 6px;
    border: 2px solid transparent;
    transition: background-color 0.15s ease;
  }

  .version-card:hover {
    background: var(--background-modifier-hover);
  }

  .version-card.is-selected {
    border-color: var(--interactive-accent);
    background: var(--background-modifier-hover);
  }

  .version-cover {
    position: relative;
    aspect-ratio: 1/1;
    overflow: hidden;
    border-radius: 6px;
    background: var(--background-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 6px;
  }

  .version-cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .version-cover-placeholder {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
    color: var(--text-muted);
  }

  .version-card-default .version-cover-placeholder {
    color: var(--text-faint);
  }

  .version-card-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .version-card-title {
    font-weight: 600;
    font-size: 0.8rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .version-title-alt {
    color: var(--text-accent);
  }

  .version-card-meta {
    display: flex;
    align-items: baseline;
    gap: 0.3rem;
    font-size: 0.72rem;
    color: var(--text-faint);
    white-space: nowrap;
    overflow: hidden;
  }

  .version-card-year {
    color: var(--text-muted);
    font-variant-numeric: tabular-nums;
  }

  .version-card-detail {
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .version-status-badge {
    position: absolute;
    top: 4px;
    left: 4px;
    font-size: 0.6rem;
    font-weight: 600;
    padding: 1px 5px;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.65);
    color: #fff;
  }

  .version-current-badge {
    position: absolute;
    top: 4px;
    right: 4px;
    font-size: 0.6rem;
    font-weight: 600;
    padding: 1px 5px;
    border-radius: 4px;
    background: var(--interactive-accent);
    color: var(--text-on-accent);
  }

  .version-empty {
    grid-column: 1 / -1;
    padding: 1.5rem;
    text-align: center;
    color: var(--text-muted);
    font-size: 0.8rem;
  }

  .version-truncated {
    font-size: 0.7rem;
    color: var(--text-faint);
    margin-top: 0.4rem;
  }

  .version-modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .version-btn {
    padding: 0.4rem 0.8rem;
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px;
    background: var(--background-primary);
    color: var(--text-normal);
    cursor: pointer;
    font-size: 0.85rem;
  }

  .version-btn:hover:not(:disabled) {
    background: var(--background-modifier-hover);
  }

  .version-btn-primary {
    background: var(--interactive-accent);
    color: var(--text-on-accent);
    border-color: var(--interactive-accent);
  }

  .version-btn-primary:hover:not(:disabled) {
    opacity: 0.9;
  }

  .version-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }
</style>
