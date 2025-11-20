import {
  Plugin,
  TFile,
  ItemView,
  WorkspaceLeaf,
  PluginSettingTab,
  App,
  TFolder,
  Notice,
  FileSystemAdapter,
} from "obsidian";
import { exec } from "child_process";
import { copyFileSync, unlinkSync } from "fs";
import { mount, unmount } from "svelte";
import ExampleView from "./ExampleView.svelte";
import SettingsTab from "./SettingsTab.svelte";
import { WallpaperModal } from "./WallpaperModal";
import {
  DEFAULT_SETTINGS,
  type PluginSettings,
  initStore,
  pluginSettings,
} from "./store";

const VIEW_TYPE_EXAMPLE = "example-view";

class ExampleSvelteView extends ItemView {
  component: any;

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
  }

  getViewType() {
    return VIEW_TYPE_EXAMPLE;
  }

  getDisplayText() {
    return "Example Svelte View";
  }

  async onOpen() {
    this.component = mount(ExampleView, {
      target: this.contentEl,
      props: {
        name: "Obsidian User",
      },
    });
  }

  async onClose() {
    if (this.component) {
      unmount(this.component);
    }
  }
}

class DynamicWallpaperSettingTab extends PluginSettingTab {
  component: any;
  plugin: DynamicWallpaperPlugin;

  constructor(app: App, plugin: DynamicWallpaperPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    this.component = mount(SettingsTab, {
      target: containerEl,
      props: {
        app: this.app,
      },
    });
  }

  hide() {
    if (this.component) {
      unmount(this.component);
    }
  }
}

function normalizeAreasFrontmatter(areas: string | string[]): string[] {
  return typeof areas === "string" ? [areas] : areas;
}

function simplifyWikiLink(link: string) {
  return link.replace(/\[\[|\]\]/g, "");
}

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp", "gif", "bmp", "svg"];

function isImageFile(file: TFile): boolean {
  return IMAGE_EXTENSIONS.includes(file.extension.toLowerCase());
}

export default class DynamicWallpaperPlugin extends Plugin {
  settings: PluginSettings = DEFAULT_SETTINGS;
  private opacityNoticeTimeout: NodeJS.Timeout | null = null;
  private currentWallpaper: TFile | null = null;

  async onload() {
    await this.loadSettings();
    initStore(this);

    this.addSettingTab(new DynamicWallpaperSettingTab(this.app, this));

    this.addCommand({
      id: "pick-random-wallpaper",
      name: "Pick Random Wallpaper",
      callback: () => {
        this.pickRandomWallpaper();
      },
    });

    this.addCommand({
      id: "choose-wallpaper",
      name: "Choose Wallpaper",
      callback: () => {
        this.openWallpaperPicker();
      },
    });

    this.addCommand({
      id: "increase-overlay-opacity",
      name: "Increase Overlay Opacity",
      callback: () => {
        this.changeOverlayOpacity(0.05);
      },
    });

    this.addCommand({
      id: "decrease-overlay-opacity",
      name: "Decrease Overlay Opacity",
      callback: () => {
        this.changeOverlayOpacity(-0.05);
      },
    });

    this.addCommand({
      id: "set-current-wallpaper-to-note",
      name: "Set Current Wallpaper to Note",
      callback: async () => {
        const wallpaper = this.currentWallpaper;
        if (!wallpaper) {
          new Notice("No wallpaper currently set.");
          return;
        }
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
          try {
            await this.app.fileManager.processFrontMatter(
              activeFile,
              (frontmatter) => {
                frontmatter["wallpaper"] = `[[${wallpaper.name}]]`;
              },
            );
            new Notice(`Wallpaper updated to [[${wallpaper.name}]]`);
          } catch (err) {
            console.error("Failed to update frontmatter", err);
            new Notice("Failed to update wallpaper in frontmatter.");
          }
        } else {
          new Notice("No active file.");
        }
      },
    });

    this.addCommand({
      id: "refresh-wallpaper",
      name: "Refresh Wallpaper",
      callback: () => {
        this.updateWallpaper();
      },
    });

    this.addCommand({
      id: "flip-current-wallpaper",
      name: "Flip Current Wallpaper (Horizontal)",
      callback: () => {
        if (!this.currentWallpaper) {
          new Notice("No wallpaper currently set.");
          return;
        }

        const adapter = this.app.vault.adapter;
        if (!(adapter instanceof FileSystemAdapter)) {
          new Notice("Cannot determine file path.");
          return;
        }

        const absolutePath = adapter.getFullPath(this.currentWallpaper.path);
        const tempPath = `${absolutePath}.temp.${this.currentWallpaper.extension}`;
        const ffmpegPath = this.settings.ffmpegPath || "ffmpeg";

        const command = `"${ffmpegPath}" -i "${absolutePath}" -vf hflip -y "${tempPath}"`;

        exec(command, (error, stdout, stderr) => {
          if (error) {
            console.error(`exec error: ${error}`);
            new Notice(
              `Error flipping image. Is ffmpeg installed and the path correct? (${ffmpegPath})`,
            );
            return;
          }

          try {
            copyFileSync(tempPath, absolutePath);
            unlinkSync(tempPath);
            new Notice("Image flipped successfully!");
            // Wait a bit for the file system to settle and Obsidian to detect the change
            setTimeout(() => {
              this.updateWallpaper();
            }, 500);
          } catch (err) {
            console.error("Error copying/cleaning up file:", err);
            new Notice("Error updating image file.");
          }
        });
      },
    });

    this.registerView(VIEW_TYPE_EXAMPLE, (leaf) => new ExampleSvelteView(leaf));

    this.addRibbonIcon("dice", "Open Example View", () => {
      this.activateView();
    });

    this.updateWallpaper();

    // Listen for active file changes
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.updateWallpaper();
      }),
    );

    // Listen for file modifications
    this.registerEvent(
      this.app.metadataCache.on("changed", (file: TFile) => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && activeFile.path === file.path) {
          this.updateWallpaper();
        }
      }),
    );
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
    this.updateWallpaper(); // Update wallpaper immediately when settings change
  }

  async activateView() {
    const { workspace } = this.app;

    let leaf: WorkspaceLeaf | null = null;
    const leaves = workspace.getLeavesOfType(VIEW_TYPE_EXAMPLE);

    if (leaves.length > 0) {
      // A leaf with our view already exists, use that
      leaf = leaves[0];
    } else {
      // Our view could not be found in the workspace, create a new leaf
      // in the right sidebar for it
      const rightLeaf = workspace.getRightLeaf(false);
      if (rightLeaf) {
        leaf = rightLeaf;
        await leaf.setViewState({ type: VIEW_TYPE_EXAMPLE, active: true });
      }
    }

    // "Reveal" the leaf in case it is in a collapsed sidebar
    if (leaf) {
      workspace.revealLeaf(leaf);
    }
  }

  changeOverlayOpacity(delta: number) {
    const isDarkMode = document.body.classList.contains("theme-dark");
    pluginSettings.update((settings) => {
      let newOpacity: number;
      if (isDarkMode) {
        newOpacity = settings.overlayOpacityDark + delta;
        newOpacity = Math.max(0, Math.min(1, newOpacity));
        // Round to 2 decimal places
        newOpacity = Math.round(newOpacity * 100) / 100;

        if (this.opacityNoticeTimeout) {
          clearTimeout(this.opacityNoticeTimeout);
        }

        this.opacityNoticeTimeout = setTimeout(() => {
          new Notice(`Dark Mode Opacity: ${newOpacity}`);
        }, 500);

        return { ...settings, overlayOpacityDark: newOpacity };
      } else {
        newOpacity = settings.overlayOpacityLight + delta;
        newOpacity = Math.max(0, Math.min(1, newOpacity));
        // Round to 2 decimal places
        newOpacity = Math.round(newOpacity * 100) / 100;

        if (this.opacityNoticeTimeout) {
          clearTimeout(this.opacityNoticeTimeout);
        }

        this.opacityNoticeTimeout = setTimeout(() => {
          new Notice(`Light Mode Opacity: ${newOpacity}`);
        }, 500);

        return { ...settings, overlayOpacityLight: newOpacity };
      }
    });
  }

  async openWallpaperPicker() {
    const { wallpapersPath } = this.settings;
    const folder = this.app.vault.getAbstractFileByPath(wallpapersPath);

    if (folder instanceof TFolder) {
      const wallpapers = folder.children
        .filter(
          (file): file is TFile => file instanceof TFile && isImageFile(file),
        )
        .map((file) => ({
          file: file as TFile,
          url: this.app.vault.getResourcePath(file as TFile),
        }));

      if (wallpapers.length > 0) {
        new WallpaperModal(this.app, wallpapers, (file) => {
          this.currentWallpaper = file;
          const wallpaperUrl = this.app.vault.getResourcePath(file);
          document.body.style.setProperty(
            "--background-image",
            `url("${wallpaperUrl}")`,
          );
        }).open();
      } else {
        new Notice("No images found in the specified wallpaper directory.");
      }
    } else {
      new Notice("Wallpaper directory not found.");
    }
  }

  async pickRandomWallpaper() {
    const { wallpapersPath } = this.settings;
    const folder = this.app.vault.getAbstractFileByPath(wallpapersPath);

    if (folder instanceof TFolder) {
      const images = folder.children.filter((file) => {
        if (file instanceof TFile) {
          return isImageFile(file);
        }
        return false;
      });

      if (images.length > 0) {
        const randomImage = images[Math.floor(Math.random() * images.length)];
        if (randomImage instanceof TFile) {
          this.currentWallpaper = randomImage;
          const wallpaperUrl = this.app.vault.getResourcePath(randomImage);
          document.body.style.setProperty(
            "--background-image",
            `url("${wallpaperUrl}")`,
          );
        }
      } else {
        new Notice("No images found in the specified wallpaper directory.");
      }
    } else {
      new Notice("Wallpaper directory not found.");
    }
  }

  private updateWallpaper() {
    // Update overlay opacity CSS variables
    document.body.style.setProperty(
      "--background-overlay-opacity-light",
      this.settings.overlayOpacityLight.toString(),
    );
    document.body.style.setProperty(
      "--background-overlay-opacity-dark",
      this.settings.overlayOpacityDark.toString(),
    );

    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return;

    const metadata = this.app.metadataCache.getFileCache(activeFile);
    let wallpaper = metadata?.frontmatter?.wallpaper;

    if (!wallpaper && metadata?.frontmatter?.areas) {
      const areasFrontmatter = normalizeAreasFrontmatter(
        metadata.frontmatter.areas,
      );
      if (areasFrontmatter && areasFrontmatter.length > 0) {
        for (const area of areasFrontmatter) {
          const simplifiedArea = simplifyWikiLink(area);
          // Find the area file itself (not files that belong to the area)
          const areaFile = this.app.metadataCache.getFirstLinkpathDest(
            simplifiedArea,
            activeFile.path,
          );
          if (areaFile) {
            const areaFileMetadata =
              this.app.metadataCache.getFileCache(areaFile);
            if (areaFileMetadata?.frontmatter?.wallpaper) {
              wallpaper = areaFileMetadata.frontmatter.wallpaper;
              break; // Stop searching once we find a wallpaper
            }
          }
        }
      }
    }

    if (wallpaper) {
      // Strip wiki link brackets if present
      const cleanWallpaper = wallpaper.replace(/\[\[|\]\]/g, "");

      // Resolve attachment to get the app:// URL
      const wallpaperFile = this.app.metadataCache.getFirstLinkpathDest(
        cleanWallpaper,
        activeFile.path,
      );

      if (wallpaperFile) {
        this.currentWallpaper = wallpaperFile;
        const wallpaperUrl = this.app.vault.getResourcePath(wallpaperFile);
        document.body.style.setProperty(
          "--background-image",
          `url("${wallpaperUrl}")`,
        );
      } else {
        // Fallback to original value if not found as attachment
        document.body.style.setProperty(
          "--background-image",
          `url("${cleanWallpaper}")`,
        );
      }
    }
  }
}
