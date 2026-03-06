import { type App, Plugin, PluginSettingTab } from 'obsidian';
import { mount, unmount } from 'svelte';
import { MusicSearchModal } from './MusicSearchModal';
import SettingsTab from './SettingsTab.svelte';
import { DiscogsCollectionView, DISCOGS_VIEW_TYPE } from './DiscogsCollectionView';
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

    this.registerView(DISCOGS_VIEW_TYPE, (leaf) => {
      return new DiscogsCollectionView(leaf, (release) => {
        const query = `${release.artist} - ${release.title}`;
        new MusicSearchModal(this.app, (result) => {
          createAlbumNote(this.app, result, this.settings);
        }, query).open();
      });
    });

    this.addSettingTab(new MusicCollectorSettingTab(this.app, this));

    this.addCommand({
      id: 'search-musicbrainz',
      name: 'Search MusicBrainz',
      callback: () => {
        new MusicSearchModal(this.app, (result) => {
          createAlbumNote(this.app, result, this.settings);
        }).open();
      },
    });

    this.addCommand({
      id: 'open-discogs-collection',
      name: 'Open Discogs Collection',
      callback: async () => {
        const existing = this.app.workspace.getLeavesOfType(DISCOGS_VIEW_TYPE);
        if (existing.length > 0) {
          this.app.workspace.revealLeaf(existing[0]);
          return;
        }
        const leaf = this.app.workspace.getLeaf(true);
        await leaf.setViewState({ type: DISCOGS_VIEW_TYPE, active: true });
        this.app.workspace.revealLeaf(leaf);
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
