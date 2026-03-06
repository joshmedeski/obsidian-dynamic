import { type App, Modal } from 'obsidian';
import { mount, unmount } from 'svelte';
import MusicSearch from './MusicSearch.svelte';
import type { SearchResult } from './types';

export class MusicSearchModal extends Modal {
  private component: any;
  private onSelectCallback: (result: SearchResult) => void;

  constructor(app: App, onSelect: (result: SearchResult) => void) {
    super(app);
    this.onSelectCallback = onSelect;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    this.modalEl.addClass('music-collector-modal');
    this.modalEl.style.setProperty('--dialog-width', '700px');

    this.titleEl.setText('Search MusicBrainz');

    this.component = mount(MusicSearch, {
      target: contentEl,
      props: {
        onSelect: (result: SearchResult) => {
          this.onSelectCallback(result);
          this.close();
        },
      },
    });
  }

  onClose() {
    if (this.component) {
      unmount(this.component);
    }
    this.contentEl.empty();
  }
}
