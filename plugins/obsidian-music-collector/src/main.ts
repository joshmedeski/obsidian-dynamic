import { type App, Plugin, PluginSettingTab } from 'obsidian';
import { mount, unmount } from 'svelte';
import { MusicSearchModal } from './MusicSearchModal';
import SettingsTab from './SettingsTab.svelte';
import { DiscogsCollectionView, DISCOGS_VIEW_TYPE } from './DiscogsCollectionView';
import { createAlbumNote } from './noteCreator';
import { initStore, invalidateVault, triggerMBScan } from './store';
import { DEFAULT_SETTINGS, type DiscogsCache, type MBMatchMap, type MusicCollectorSettings } from './types';

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
  discogsCache: DiscogsCache | null = null;
  mbMatches: MBMatchMap = {};

  async onload() {
    await this.loadSettings();
    initStore(this);

    this.registerView(DISCOGS_VIEW_TYPE, (leaf) => {
      return new DiscogsCollectionView(leaf, (release) => {
        const query = `${release.artist} - ${release.title}`;
        const purchased = release.dateAdded
          ? new Date(release.dateAdded).toISOString().split('T')[0]
          : '';
        const discogsId = String(release.id);
        new MusicSearchModal(this.app, async (result) => {
          await createAlbumNote(this.app, result, this.settings, { purchased, discogsId });
          invalidateVault();
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

    this.addCommand({
      id: 'scan-musicbrainz-matches',
      name: 'Scan MusicBrainz Matches',
      callback: () => triggerMBScan(),
    });
  }

  async loadSettings() {
    const data = await this.loadData();
    if (data) {
      const { discogsCache, mbMatches, ...rest } = data;
      this.settings = { ...DEFAULT_SETTINGS, ...rest };
      this.discogsCache = discogsCache ?? null;
      this.mbMatches = mbMatches ?? {};
    }
  }

  private async persistAll() {
    await this.saveData({
      ...this.settings,
      discogsCache: this.discogsCache,
      mbMatches: this.mbMatches,
    });
  }

  async saveSettings() {
    await this.persistAll();
  }

  async saveCache(cache: DiscogsCache) {
    this.discogsCache = cache;
    await this.persistAll();
  }

  async saveMBMatches(matches: MBMatchMap) {
    this.mbMatches = matches;
    await this.persistAll();
  }

  onunload() {}
}
