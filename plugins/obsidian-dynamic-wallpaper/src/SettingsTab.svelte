<script lang="ts">
import { App, TFolder } from 'obsidian';
import { pluginSettings } from './store';

export let app: App;

let wallpapersPath = $pluginSettings.wallpapersPath;
let ffmpegPath = $pluginSettings.ffmpegPath;
let overlayOpacityLight = $pluginSettings.overlayOpacityLight;
let overlayOpacityDark = $pluginSettings.overlayOpacityDark;

// Subscribe to store updates to keep local variable in sync
$: wallpapersPath = $pluginSettings.wallpapersPath;
$: ffmpegPath = $pluginSettings.ffmpegPath;
$: overlayOpacityLight = $pluginSettings.overlayOpacityLight;
$: overlayOpacityDark = $pluginSettings.overlayOpacityDark;

let suggestions: string[] = [];
let showSuggestions = false;
let activeSuggestionIndex = -1;

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

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeSuggestionIndex = (activeSuggestionIndex + 1) % suggestions.length;
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeSuggestionIndex =
      (activeSuggestionIndex - 1 + suggestions.length) % suggestions.length;
  } else if (e.key === 'Enter') {
    e.preventDefault();
    if (
      activeSuggestionIndex >= 0 &&
      activeSuggestionIndex < suggestions.length
    ) {
      selectSuggestion(suggestions[activeSuggestionIndex]);
    }
  } else if (e.key === 'Escape') {
    showSuggestions = false;
  }
}

function handleBlur() {
  setTimeout(() => {
    showSuggestions = false;
  }, 200);
}

function updateOverlayOpacityLight(e: Event) {
  const target = e.target as HTMLInputElement;
  pluginSettings.update((s) => ({
    ...s,
    overlayOpacityLight: parseFloat(target.value),
  }));
}

function updateOverlayOpacityDark(e: Event) {
  const target = e.target as HTMLInputElement;
  pluginSettings.update((s) => ({
    ...s,
    overlayOpacityDark: parseFloat(target.value),
  }));
}
</script>

<div class="dynamic-wallpaper-settings">
  <h2>Dynamic Wallpaper Settings</h2>

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
              class="suggestion-item {i === activeSuggestionIndex ? 'active' : ''}"
              on:mousedown={() => selectSuggestion(suggestion)}
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
      <div class="setting-item-name">FFmpeg Binary Path</div>
      <div class="setting-item-description">
        Absolute path to the ffmpeg executable (e.g., /opt/homebrew/bin/ffmpeg or /usr/local/bin/ffmpeg).
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

  <div class="setting-item">
    <div class="setting-item-info">
      <div class="setting-item-name">Overlay Opacity (Light Mode)</div>
      <div class="setting-item-description">
        The opacity of the overlay on top of the wallpaper in light mode (0-1).
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
        The opacity of the overlay on top of the wallpaper in dark mode (0-1).
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

<style>
  .dynamic-wallpaper-settings {
    padding: 10px;
  }
  /* Re-using Obsidian's native setting classes/structure where possible */
  .setting-item {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    padding: 18px 0 18px 0;
    border-bottom: 1px solid var(--background-modifier-border);
  }
  .setting-item-info {
    flex: 1 1 auto;
    margin-right: 20px;
  }
  .setting-item-name {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 4px;
  }
  .setting-item-description {
    color: var(--text-muted);
    font-size: 13px;
  }
  .setting-item-control {
    flex: 0 0 auto;
  }
  input[type="text"] {
    width: 200px;
  }
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
  .suggestion-item:hover, .suggestion-item.active {
    background-color: var(--background-modifier-hover);
  }
</style>