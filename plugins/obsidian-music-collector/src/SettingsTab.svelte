<script lang="ts">
  import { type App, TFolder } from "obsidian";
  import { pluginSettings } from "./store";

  export let app: App;

  let outputFolder = $pluginSettings.outputFolder;

  $: outputFolder = $pluginSettings.outputFolder;

  let suggestions: string[] = [];
  let showSuggestions = false;
  let activeSuggestionIndex = -1;

  function updateOutputFolder(e: Event) {
    const target = e.target as HTMLInputElement;
    const value = target.value;
    pluginSettings.update((s) => ({ ...s, outputFolder: value }));

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

  function selectSuggestion(path: string) {
    pluginSettings.update((s) => ({ ...s, outputFolder: path }));
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
</script>

<div class="music-collector-settings">
  <h2>Music Collector Settings</h2>

  <div class="setting-item">
    <div class="setting-item-info">
      <div class="setting-item-name">Output Folder</div>
      <div class="setting-item-description">
        The folder where album notes will be created.
      </div>
    </div>
    <div class="setting-item-control" style="position: relative;">
      <input
        type="text"
        value={outputFolder}
        on:input={updateOutputFolder}
        on:keydown={handleKeydown}
        on:blur={handleBlur}
        placeholder="e.g., Music"
      />
      {#if showSuggestions}
        <div class="suggestion-container">
          <div class="suggestion">
            {#each suggestions as suggestion, i}
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div
                class="suggestion-item {i === activeSuggestionIndex
                  ? 'is-selected'
                  : ''}"
                on:mousedown={() => selectSuggestion(suggestion)}
              >
                {suggestion}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

