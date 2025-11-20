<script lang="ts">
  import { TFile } from "obsidian";

  export let wallpapers: { file: TFile; url: string }[] = [];
  export let onSelect: (file: TFile) => void;

  function handleSelect(wallpaper: { file: TFile; url: string }) {
    onSelect(wallpaper.file);
  }
</script>

<div class="wallpaper-grid">
  {#each wallpapers as wallpaper}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div class="wallpaper-item" on:click={() => handleSelect(wallpaper)}>
      <div class="image-container">
        <img src={wallpaper.url} alt={wallpaper.file.basename} />
      </div>
      <div class="wallpaper-name" title={wallpaper.file.basename}>
        {wallpaper.file.basename}
      </div>
    </div>
  {/each}
</div>

<style>
  .wallpaper-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 1rem;
    padding: 1rem;
    max-height: 70vh;
    overflow-y: auto;
  }

  .wallpaper-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    border-radius: 8px;
    padding: 8px;
    transition: background-color 0.2s ease;
  }

  .wallpaper-item:hover {
    background-color: var(--background-modifier-hover);
  }

  .image-container {
    width: 100%;
    aspect-ratio: 16/9;
    overflow: hidden;
    border-radius: 6px;
    margin-bottom: 8px;
    background-color: var(--background-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .wallpaper-name {
    width: 100%;
    text-align: center;
    font-size: 0.9rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--text-normal);
  }
</style>
