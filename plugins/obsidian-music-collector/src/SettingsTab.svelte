<script lang="ts">
  import { type App, TFile, TFolder } from "obsidian";
  import { pluginSettings } from "./store";

  export let app: App;

  let outputFolder = $pluginSettings.outputFolder;
  let filenameFormat = $pluginSettings.filenameFormat;
  let templatePath = $pluginSettings.templatePath;

  $: outputFolder = $pluginSettings.outputFolder;
  $: filenameFormat = $pluginSettings.filenameFormat;
  $: templatePath = $pluginSettings.templatePath;

  // Folder autocomplete state
  let folderSuggestions: string[] = [];
  let showFolderSuggestions = false;
  let activeFolderIndex = -1;

  // Template autocomplete state
  let templateSuggestions: string[] = [];
  let showTemplateSuggestions = false;
  let activeTemplateIndex = -1;

  function updateOutputFolder(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    pluginSettings.update((s) => ({ ...s, outputFolder: value }));

    if (value) {
      folderSuggestions = app.vault
        .getAllLoadedFiles()
        .filter((f): f is TFolder => f instanceof TFolder)
        .map((f) => f.path)
        .filter((path) => path.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 10);
      showFolderSuggestions = folderSuggestions.length > 0;
      activeFolderIndex = -1;
    } else {
      showFolderSuggestions = false;
    }
  }

  function selectFolderSuggestion(path: string) {
    pluginSettings.update((s) => ({ ...s, outputFolder: path }));
    showFolderSuggestions = false;
  }

  function handleFolderKeydown(e: KeyboardEvent) {
    if (!showFolderSuggestions) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeFolderIndex = (activeFolderIndex + 1) % folderSuggestions.length;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeFolderIndex = (activeFolderIndex - 1 + folderSuggestions.length) % folderSuggestions.length;
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeFolderIndex >= 0) selectFolderSuggestion(folderSuggestions[activeFolderIndex]);
    } else if (e.key === "Escape") {
      showFolderSuggestions = false;
    }
  }

  function handleFolderBlur() {
    setTimeout(() => { showFolderSuggestions = false; }, 200);
  }

  function updateTemplatePath(e: Event) {
    const value = (e.target as HTMLInputElement).value;
    pluginSettings.update((s) => ({ ...s, templatePath: value }));

    if (value) {
      templateSuggestions = app.vault
        .getAllLoadedFiles()
        .filter((f): f is TFile => f instanceof TFile && f.extension === "md")
        .map((f) => f.path)
        .filter((path) => path.toLowerCase().includes(value.toLowerCase()))
        .slice(0, 10);
      showTemplateSuggestions = templateSuggestions.length > 0;
      activeTemplateIndex = -1;
    } else {
      showTemplateSuggestions = false;
    }
  }

  function selectTemplateSuggestion(path: string) {
    pluginSettings.update((s) => ({ ...s, templatePath: path }));
    showTemplateSuggestions = false;
  }

  function handleTemplateKeydown(e: KeyboardEvent) {
    if (!showTemplateSuggestions) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      activeTemplateIndex = (activeTemplateIndex + 1) % templateSuggestions.length;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      activeTemplateIndex = (activeTemplateIndex - 1 + templateSuggestions.length) % templateSuggestions.length;
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeTemplateIndex >= 0) selectTemplateSuggestion(templateSuggestions[activeTemplateIndex]);
    } else if (e.key === "Escape") {
      showTemplateSuggestions = false;
    }
  }

  function handleTemplateBlur() {
    setTimeout(() => { showTemplateSuggestions = false; }, 200);
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
        on:keydown={handleFolderKeydown}
        on:blur={handleFolderBlur}
        placeholder="e.g., Music"
      />
      {#if showFolderSuggestions}
        <div class="suggestion-container">
          <div class="suggestion">
            {#each folderSuggestions as suggestion, i}
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div
                class="suggestion-item {i === activeFolderIndex ? 'is-selected' : ''}"
                on:mousedown={() => selectFolderSuggestion(suggestion)}
              >
                {suggestion}
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>

  <div class="setting-item">
    <div class="setting-item-info">
      <div class="setting-item-name">Filename Format</div>
      <div class="setting-item-description">
        Format for the note filename. Uses the same placeholders: <code>{"{{title}}"}</code>, <code>{"{{artist}}"}</code>,
        <code>{"{{type}}"}</code>, <code>{"{{released}}"}</code>.
      </div>
    </div>
    <div class="setting-item-control">
      <input
        type="text"
        value={filenameFormat}
        on:input={(e) => pluginSettings.update((s) => ({ ...s, filenameFormat: (e.target as HTMLInputElement).value }))}
        placeholder={"{{artist}} - {{title}}"}
      />
    </div>
  </div>

  <div class="setting-item">
    <div class="setting-item-info">
      <div class="setting-item-name">Template Note</div>
      <div class="setting-item-description">
        Path to a template note. Music placeholders: <code>{"{{title}}"}</code>, <code>{"{{artist}}"}</code>,
        <code>{"{{mbid}}"}</code>, <code>{"{{type}}"}</code>, <code>{"{{released}}"}</code>,
        <code>{"{{cover}}"}</code>, <code>{"{{date}}"}</code>.
        If Templater is installed, <code>{"<% tp.* %>"}</code> syntax is also supported.
      </div>
    </div>
    <div class="setting-item-control" style="position: relative;">
      <input
        type="text"
        value={templatePath}
        on:input={updateTemplatePath}
        on:keydown={handleTemplateKeydown}
        on:blur={handleTemplateBlur}
        placeholder="e.g., Templates/Record.md"
      />
      {#if showTemplateSuggestions}
        <div class="suggestion-container">
          <div class="suggestion">
            {#each templateSuggestions as suggestion, i}
              <!-- svelte-ignore a11y-click-events-have-key-events -->
              <!-- svelte-ignore a11y-no-static-element-interactions -->
              <div
                class="suggestion-item {i === activeTemplateIndex ? 'is-selected' : ''}"
                on:mousedown={() => selectTemplateSuggestion(suggestion)}
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

