import { App, Modal, TFile } from 'obsidian';
import { mount, unmount } from 'svelte';
import WallpaperSelect from './WallpaperSelect.svelte';

interface WallpaperItem {
  file: TFile;
  url: string;
}

export class WallpaperModal extends Modal {
  private component: any;
  private wallpapers: WallpaperItem[];
  private onSelect: (file: TFile) => void;

  constructor(
    app: App,
    wallpapers: WallpaperItem[],
    onSelect: (file: TFile) => void
  ) {
    super(app);
    this.wallpapers = wallpapers;
    this.onSelect = onSelect;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    this.titleEl.setText('Select Wallpaper');

    this.component = mount(WallpaperSelect, {
      target: contentEl,
      props: {
        wallpapers: this.wallpapers,
        onSelect: (file: TFile) => {
          this.onSelect(file);
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
