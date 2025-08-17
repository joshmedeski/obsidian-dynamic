import { View } from 'obsidian';

export const VIEW_TYPE_VERTICAL_VIDEO_WIDGET = 'vertical-video-widget';

const endOfUrlRegex = /\/([^/]+)$/;

export class VerticalVideoWidgetView extends View {
  getViewType() {
    return VIEW_TYPE_VERTICAL_VIDEO_WIDGET;
  }

  getDisplayText() {
    return 'Vertical Video Widget';
  }

  getIcon() {
    return 'video';
  }

  // biome-ignore lint/suspicious/useAwait: Obsidian's API requires this to be async
  async onOpen() {
    this.updateContent();
  }

  // biome-ignore lint/suspicious/useAwait: Obsidian's API requires this to be async
  async onClose() {
    this.containerEl.empty();
  }

  private updateContent() {
    if (!this.containerEl) {
      return;
    }
    this.containerEl.empty();

    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      this.containerEl.createEl('p', {
        text: 'No file is currently active',
      });
      return;
    }

    const metadata = this.app.metadataCache.getFileCache(activeFile);
    const tiktok: string = metadata?.frontmatter?.tiktok;

    // TODO: extract everything after the last slash
    const tikTokId = tiktok.match(endOfUrlRegex)?.[1];

    if (!tiktok) {
      this.containerEl.createEl('p', {
        text: 'No TikTok link found in frontmatter',
      });
      return;
    }

    const videoContainer = this.containerEl.createDiv({
      cls: 'vertical-video-container',
    });

    videoContainer.createEl('iframe', {
      cls: 'vertical-video',
      attr: {
        src: `https://www.tiktok.com/player/v1/${tikTokId}`,
        frameborder: '0',
        allow: 'autoplay; encrypted-media',
        allowfullscreen: 'true',
      },
    });
  }
}
