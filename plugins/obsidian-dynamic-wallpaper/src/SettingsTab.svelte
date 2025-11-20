<script lang="ts">
import { pluginSettings } from './store';

let defaultWallpaper = $pluginSettings.defaultWallpaper;
let overlayOpacityLight = $pluginSettings.overlayOpacityLight;
let overlayOpacityDark = $pluginSettings.overlayOpacityDark;

// Subscribe to store updates to keep local variable in sync if needed
// (though simple binding usually works, let's be explicit for clarity)
$: defaultWallpaper = $pluginSettings.defaultWallpaper;
$: overlayOpacityLight = $pluginSettings.overlayOpacityLight;
$: overlayOpacityDark = $pluginSettings.overlayOpacityDark;

function updateDefaultWallpaper(e: Event) {
  const target = e.target as HTMLInputElement;
  pluginSettings.update((s) => ({ ...s, defaultWallpaper: target.value }));
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
      <div class="setting-item-name">Default Wallpaper</div>
      <div class="setting-item-description">
        The path to the wallpaper to use if no other wallpaper is specified.
      </div>
    </div>
    <div class="setting-item-control">
      <input
        type="text"
        value={defaultWallpaper}
        on:input={updateDefaultWallpaper}
        placeholder="e.g., attachments/wallpaper.jpg"
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
</style>
