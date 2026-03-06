import { type App, Plugin, PluginSettingTab } from 'obsidian';
import { mount, unmount } from 'svelte';
import { MusicSearchModal } from './MusicSearchModal';
import SettingsTab from './SettingsTab.svelte';
import { createAlbumNote } from './noteCreator';
import { initStore } from './store';
import { DEFAULT_SETTINGS, type MusicCollectorSettings } from './types';

class MusicCollectorSettingTab extends PluginSettingTab {
  component: any;
  plugin: MusicCollectorPlugin;

  constructor(app: App, plugin: MusicCollectorPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    this.component = mount(SettingsTab, {
      target: containerEl,
      props: { app: this.app },
    });
  }

  hide() {
    if (this.component) {
      unmount(this.component);
    }
  }
}

export default class MusicCollectorPlugin extends Plugin {
  settings: MusicCollectorSettings = DEFAULT_SETTINGS;

  async onload() {
    await this.loadSettings();
    initStore(this);

    this.addSettingTab(new MusicCollectorSettingTab(this.app, this));

    this.addCommand({
      id: 'search-musicbrainz',
      name: 'Search MusicBrainz',
      callback: () => {
        new MusicSearchModal(this.app, (result) => {
          createAlbumNote(this.app, result, this.settings.outputFolder);
        }).open();
      },
    });
  }

  async loadSettings() {
    this.settings = { ...DEFAULT_SETTINGS, ...(await this.loadData()) };
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }

  onunload() {}
}
