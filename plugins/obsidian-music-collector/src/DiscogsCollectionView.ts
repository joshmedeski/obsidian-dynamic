import { type App, ItemView, type WorkspaceLeaf } from 'obsidian';
import { mount, unmount } from 'svelte';
import DiscogsCollection from './DiscogsCollection.svelte';
import type { DiscogsRelease } from './types';

export const DISCOGS_VIEW_TYPE = 'discogs-collection';

export class DiscogsCollectionView extends ItemView {
  private component: any;
  private onImportCallback: (release: DiscogsRelease) => void;

  constructor(
    leaf: WorkspaceLeaf,
    onImport: (release: DiscogsRelease) => void,
  ) {
    super(leaf);
    this.onImportCallback = onImport;
  }

  getViewType(): string {
    return DISCOGS_VIEW_TYPE;
  }

  getDisplayText(): string {
    return 'Discogs Collection';
  }

  getIcon(): string {
    return 'disc';
  }

  async onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('discogs-collection-container');

    this.component = mount(DiscogsCollection, {
      target: contentEl,
      props: {
        app: this.app,
        onImport: this.onImportCallback,
      },
    });
  }

  async onClose() {
    if (this.component) {
      unmount(this.component);
    }
    this.contentEl.empty();
  }
}
