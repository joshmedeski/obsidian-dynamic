<script lang="ts">
  import { type App, TFolder } from "obsidian";
  import { pluginSettings } from "./store";

  export let app: App;

  let wallpaperProperty = $pluginSettings.wallpaperProperty;
  let wallpapersPath = $pluginSettings.wallpapersPath;
  let ffmpegPath = $pluginSettings.ffmpegPath;
  let overlayOpacityLight = $pluginSettings.overlayOpacityLight;
  let overlayOpacityDark = $pluginSettings.overlayOpacityDark;

  // Subscribe to store updates to keep local variable in sync
  $: wallpaperProperty = $pluginSettings.wallpaperProperty;
  $: wallpapersPath = $pluginSettings.wallpapersPath;
  $: ffmpegPath = $pluginSettings.ffmpegPath;
  $: overlayOpacityLight = $pluginSettings.overlayOpacityLight;
  $: overlayOpacityDark = $pluginSettings.overlayOpacityDark;

  let suggestions: string[] = [];
  let showSuggestions = false;
  let activeSuggestionIndex = -1;

  let propertySuggestions: string[] = [];
  let showPropertySuggestions = false;
  let activePropertySuggestionIndex = -1;

  function updateWallpapersPath(e: Event) {
    const target = e.target as HTMLInputElement;
    const value = target.value;
    pluginSettings.update((s) => ({ ...s, wallpapersPath: value }));

    if (value) {
      const folders = app.vault
        .getAllLoadedFiles()
        .filter((f): f is TFolder => f instanceof TFolder)
        .map((f) => f.path);

      suggestions = folders
        .filter((path) => path.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 10);

      showSuggestions = suggestions.length > 0;
      activeSuggestionIndex = -1;
    } else {
      showSuggestions = false;
    }
  }

  function updateFfmpegPath(e: Event) {
    const target = e.target as HTMLInputElement;
    const value = target.value;
    pluginSettings.update((s) => ({ ...s, ffmpegPath: value }));
  }

  function selectSuggestion(path: string) {
    pluginSettings.update((s) => ({ ...s, wallpapersPath: path }));
    showSuggestions = false;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (!showSuggestions) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeSuggestionIndex = (activeSuggestionIndex + 1) % suggestions.length;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeSuggestionIndex =
        (activeSuggestionIndex - 1 + suggestions.length) % suggestions.length;
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (
        activeSuggestionIndex >= 0 &&
        activeSuggestionIndex < suggestions.length
      ) {
        selectSuggestion(suggestions[activeSuggestionIndex]);
      }
    } else if (e.key === "Escape") {
      showSuggestions = false;
    }
  }

  function handleBlur() {
    setTimeout(() => {
      showSuggestions = false;
    }, 200);
  }

  function getAllFrontmatterKeys(): string[] {
    const keys = new Set<string>();
    for (const file of app.vault.getMarkdownFiles()) {
      const cache = app.metadataCache.getFileCache(file);
      if (cache?.frontmatter) {
        for (const key of Object.keys(cache.frontmatter)) {
          if (key !== "position") keys.add(key);
        }
      }
    }
    return [...keys].sort();
  }

  function updateWallpaperProperty(e: Event) {
    const target = e.target as HTMLInputElement;
    const value = target.value;
    pluginSettings.update((s) => ({ ...s, wallpaperProperty: value }));

    if (value) {
      const allKeys = getAllFrontmatterKeys();
      propertySuggestions = allKeys
        .filter((key) => key.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 10);
      showPropertySuggestions = propertySuggestions.length > 0;
      activePropertySuggestionIndex = -1;
    } else {
      showPropertySuggestions = false;
    }
  }

  function selectPropertySuggestion(key: string) {
    pluginSettings.update((s) => ({ ...s, wallpaperProperty: key }));
    showPropertySuggestions = false;
  }

  function handlePropertyKeydown(e: KeyboardEvent) {
    if (!showPropertySuggestions) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      activePropertySuggestionIndex =
        (activePropertySuggestionIndex + 1) % propertySuggestions.length;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activePropertySuggestionIndex =
        (activePropertySuggestionIndex - 1 + propertySuggestions.length) %
        propertySuggestions.length;
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (
        activePropertySuggestionIndex >= 0 &&
        activePropertySuggestionIndex < propertySuggestions.length
      ) {
        selectPropertySuggestion(
          propertySuggestions[activePropertySuggestionIndex],
        );
      }
    } else if (e.key === "Escape") {
      showPropertySuggestions = false;
    }
  }

  function handlePropertyBlur() {
    setTimeout(() => {
      showPropertySuggestions = false;
    }, 200);
  }

  function updateOverlayOpacityLight(e: Event) {
    const target = e.target as HTMLInputElement;
    pluginSettings.update((s) => ({
      ...s,
      overlayOpacityLight: Number.parseFloat(target.value),
    }));
  }

  function updateOverlayOpacityDark(e: Event) {
    const target = e.target as HTMLInputElement;
    pluginSettings.update((s) => ({
      ...s,
      overlayOpacityDark: Number.parseFloat(target.value),
    }));
  }
</script>

<div>
  <div class="setting-group">
    <div class="setting-items">
      <div class="setting-item">
        <div class="setting-item-info">
          <div class="setting-item-name">Wallpaper Property</div>
          <div class="setting-item-description">
            The frontmatter property name used to set a note's wallpaper.
          </div>
        </div>
        <div class="setting-item-control" style="position: relative;">
          <input
            type="text"
            value={wallpaperProperty}
            on:input={updateWallpaperProperty}
            on:keydown={handlePropertyKeydown}
            on:blur={handlePropertyBlur}
            placeholder="e.g., wallpaper"
          />
          {#if showPropertySuggestions}
            <div class="suggestions-dropdown">
              {#each propertySuggestions as suggestion, i}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div
                  class="suggestion-item {i === activePropertySuggestionIndex
                    ? 'active'
                    : ''}"
                  on:mousedown={() => selectPropertySuggestion(suggestion)}
                >
                  {suggestion}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-item-info">
          <div class="setting-item-name">Wallpapers Directory</div>
          <div class="setting-item-description">
            The folder containing your wallpapers.
          </div>
        </div>
        <div class="setting-item-control" style="position: relative;">
          <input
            type="text"
            value={wallpapersPath}
            on:input={updateWallpapersPath}
            on:keydown={handleKeydown}
            on:blur={handleBlur}
            placeholder="e.g., Extras/Wallpapers"
          />
          {#if showSuggestions}
            <div class="suggestions-dropdown">
              {#each suggestions as suggestion, i}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <!-- svelte-ignore a11y-no-static-element-interactions -->
                <div
                  class="suggestion-item {i === activeSuggestionIndex
                    ? 'active'
                    : ''}"
                  on:mousedown={() => selectSuggestion(suggestion)}
                >
                  {suggestion}
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <div class="setting-group">
    <div class="setting-item setting-item-heading">
      <div class="setting-item-name">Overlay</div>
      <div class="setting-item-control"></div>
    </div>
    <div class="setting-items">
      <div class="setting-item">
        <div class="setting-item-info">
          <div class="setting-item-name">Overlay Opacity (Light Mode)</div>
          <div class="setting-item-description">
            The opacity of the overlay on top of the wallpaper in light mode
            (0-1).
          </div>
        </div>
        <div class="setting-item-control">
          <div class="slider-container">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={overlayOpacityLight}
              on:input={updateOverlayOpacityLight}
            />
            <span class="slider-value">{overlayOpacityLight}</span>
          </div>
        </div>
      </div>

      <div class="setting-item">
        <div class="setting-item-info">
          <div class="setting-item-name">Overlay Opacity (Dark Mode)</div>
          <div class="setting-item-description">
            The opacity of the overlay on top of the wallpaper in dark mode
            (0-1).
          </div>
        </div>
        <div class="setting-item-control">
          <div class="slider-container">
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={overlayOpacityDark}
              on:input={updateOverlayOpacityDark}
            />
            <span class="slider-value">{overlayOpacityDark}</span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div class="setting-group">
    <div class="setting-item setting-item-heading">
      <div class="setting-item-name">Thumbnails</div>
      <div class="setting-item-control"></div>
    </div>

    <div class="setting-items">
      <div class="setting-item">
        <div class="setting-item-info">
          <div class="setting-item-name">FFmpeg Binary Path</div>
          <div class="setting-item-description">
            Absolute path to the ffmpeg executable (e.g.,
            /opt/homebrew/bin/ffmpeg or /usr/local/bin/ffmpeg).
          </div>
        </div>
        <div class="setting-item-control">
          <input
            type="text"
            value={ffmpegPath}
            on:input={updateFfmpegPath}
            placeholder="ffmpeg"
          />
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .slider-container {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .slider-value {
    width: 50px;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .suggestions-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    width: 200px;
    max-height: 200px;
    overflow-y: auto;
    background-color: var(--background-secondary);
    border: 1px solid var(--background-modifier-border);
    border-radius: 4px;
    z-index: 1000;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  .suggestion-item {
    padding: 8px 12px;
    cursor: pointer;
    font-size: 13px;
  }
  .suggestion-item:hover,
  .suggestion-item.active {
    background-color: var(--background-modifier-hover);
  }
</style>
