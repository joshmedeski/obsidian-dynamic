import { ItemView, type TFile } from "obsidian";

export const VIEW_TYPE_DYNAMIC_WIDGET = "dynamic-widget-view";
const dayFileNameRegex = /^\d{4}-\d{2}-\d{2}$/;

type FolderWithTitle = { folder: string; title: string };

const IS_AREA_FOLDERS = [
  { folder: "Areas", title: "🏠 Areas" },
  { folder: "Inbox", title: "📥 Inbox" },
  { folder: "Goals", title: "🎯 Goals" },
  { folder: "Projects/Active", title: "✅ Active Projects" },
  { folder: "Projects/Waiting For", title: "⏳ Waiting For" },
  { folder: "Relationships", title: "👥 Relationships" },
  { folder: "Resources", title: "📚 Resources" },
  { folder: "Projects/Someday Maybe", title: "🔮 Someday Maybe" },
  { folder: "Archives", title: "🗄️ Archives" },
];

const HAS_AREAS_FOLDERS = [
  { folder: "Areas", title: "🏠 Areas" },
  { folder: "Inbox", title: "📥 Inbox" },
  { folder: "Goals", title: "🎯 Goals" },
  { folder: "Projects/Active", title: "✅ Active Projects" },
  { folder: "Projects/Waiting For", title: "⏳ Waiting For" },
  { folder: "Relationships", title: "👥 Relationships" },
  { folder: "Resources", title: "📚 Resources" },
  { folder: "Projects/Someday Maybe", title: "🔮 Someday Maybe" },
  { folder: "Archives", title: "🗄️ Archives" },
];

const IS_DAILY_FOLDERS = [
  { folder: "Inbox", title: "📥 Inbox" },
  { folder: "Projects/Active", title: "✅ Active Projects" },
  { folder: "Projects/Waiting For", title: "⏳ Waiting For" },
];

const NO_ACTIVE_FILE = [
  { folder: "Inbox", title: "📥 Inbox" },
  { folder: "Projects/Active", title: "✅ Active Projects" }
];

type FilesByFolder = { folder: FolderWithTitle; files: TFile[] }[];

export class DynamicWidgetView extends ItemView {
  contentEl: HTMLElement = document.createElement("div");

  getViewType(): string {
    return VIEW_TYPE_DYNAMIC_WIDGET;
  }

  getDisplayText(): string {
    return "Dynamic Widget";
  }

  getIcon(): string {
    return "activity";
  }

  private makeUlLinkListWithTitle(
    title: string,
    list: TFile[] | undefined,
  ): Element {
    if (!list || list.length === 0) {
      return document.createElement("div");
    }
    const sectionEl = document.createElement("section");
    sectionEl.createEl("h3", { text: title });
    const ulEl = this.makeUlLinkList(list);
    sectionEl.appendChild(ulEl);
    return sectionEl;
  }

  private makeUlLinkList(list: TFile[] | undefined): Element {
    if (!list || list.length === 0) {
      return document.createElement("div");
    }
    const ulEl = document.createElement("ul");
    const activeFile = this.app.workspace.getActiveFile();

    // Add emoji bullet class
    ulEl.classList.add("emoji-bullet-list");

    const liEls = list
      .sort((a, b) => {
        const aMetadata = this.app.metadataCache.getFileCache(a);
        const bMetadata = this.app.metadataCache.getFileCache(b);
        const areaA = aMetadata?.frontmatter?.areas?.[0]; // might not exist
        const areaB = bMetadata?.frontmatter?.areas?.[0]; // might not exist
        if (areaA && areaB) {
          return areaA.localeCompare(areaB);
        }
        if (areaA && !areaB) return -1;
        if (!areaA && areaB) return 1;
        if (!areaA && !areaB) return 0;
      })
      .map((note) => {
        const projectEl = document.createElement("li");

        if (activeFile && activeFile.path === note.path) {
          projectEl.createEl("span", {
            text: `👉 ${note.basename}`,
            cls: "dynamic-widget-active-file",
          });
          return projectEl;
        }

        const metadata = this.app.metadataCache.getFileCache(note);

        projectEl.classList.add("emoji-bullet-item");

        // Extract emoji from the file's path
        const icon = metadata?.frontmatter?.icon;
        if (icon) {
          projectEl.style.setProperty("--emoji-bullet", `"${icon}"`);
        } else {
          projectEl.style.setProperty("--emoji-bullet", "'⏺️'");
        }

        const linkEl = projectEl.createEl("a", {
          text: metadata?.frontmatter?.title || note.basename,
        });

        linkEl.addEventListener("click", (event) => {
          event.preventDefault();
          this.app.workspace.getLeaf("tab").openFile(note);
        });
        return projectEl;
      });
    for (const liEl of liEls) {
      ulEl.appendChild(liEl);
    }
    return ulEl;
  }

  private makeLinkMediaGridWithTitle(
    title: string,
    list: TFile[] | undefined,
  ): Element {
    if (!list || list.length === 0) {
      return document.createElement("div");
    }

    const sectionEl = document.createElement("section");
    // sectionEl.createEl("h3", { text: title });

    const gridEl = document.createElement("div");
    gridEl.style.display = "grid";
    gridEl.style.gridTemplateColumns = "repeat(2, 1fr)";
    gridEl.style.gap = "16px";

    for (const file of list) {
      const metadata = this.app.metadataCache.getFileCache(file);
      const wallpaper = metadata?.frontmatter?.wallpaper;

      if (!wallpaper) continue;

      const itemEl = document.createElement("div");
      itemEl.style.display = "flex";
      itemEl.style.flexDirection = "column";
      itemEl.style.cursor = "pointer";
      itemEl.style.maxWidth = "100%";

      // Get the wallpaper file
      const cleanWallpaper = wallpaper.replace(/\[\[|\]\]/g, "");
      const wallpaperFile = this.app.metadataCache.getFirstLinkpathDest(
        cleanWallpaper,
        file.path,
      );

      if (wallpaperFile) {
        const wallpaperUrl = this.app.vault.getResourcePath(wallpaperFile);
        const fileExtension = wallpaperFile.extension.toLowerCase();

        const imageExtensions = [
          "jpg",
          "jpeg",
          "png",
          "gif",
          "bmp",
          "svg",
          "webp",
        ];
        const videoExtensions = ["mp4", "webm", "ogg", "mov", "avi", "mkv"];

        if (imageExtensions.includes(fileExtension)) {
          const imgEl = itemEl.createEl("img", {
            attr: { src: wallpaperUrl, alt: file.basename },
          });
          imgEl.style.objectFit = "cover";
          imgEl.style.borderRadius = "8px";
          imgEl.style.aspectRatio = "16 / 9";
        } else if (videoExtensions.includes(fileExtension)) {
          const videoEl = itemEl.createEl("video", {
            attr: {
              src: wallpaperUrl,
              autoplay: "",
              muted: "",
              loop: "",
            },
          });
          videoEl.style.width = "100%";
          videoEl.style.height = "150px";
          videoEl.style.objectFit = "cover";
          videoEl.style.borderRadius = "8px";
        }
      }

      const icon = metadata?.frontmatter?.icon;
      const title = file.basename;
      const titleEl = itemEl.createEl("span", {
        text: icon ? `${icon} ${title}` : title,
      });
      titleEl.style.marginTop = "8px";
      // titleEl.style.fontSize = "14px";

      itemEl.addEventListener("click", (event) => {
        event.preventDefault();
        this.app.workspace.getLeaf("tab").openFile(file);
      });

      gridEl.appendChild(itemEl);
    }

    sectionEl.appendChild(gridEl);
    return sectionEl;
  }

  private filesByFolders(
    allFiles: TFile[],
    folders: FolderWithTitle[],
  ): FilesByFolder {
    const notesByFolder: FilesByFolder = [];
    for (const { folder, title } of folders) {
      const files = allFiles
        .filter(
          (file) => file.path.startsWith(folder) && file.extension === "md",
        )
        .sort((a, b) => b.stat.mtime - a.stat.mtime);
      if (files) {
        notesByFolder.push({ folder: { folder, title }, files });
      }
    }
    return notesByFolder;
  }

  private readonly simplifyWikiLink = (link: string) =>
    link.replace(/\[\[|\]\]/g, "");

  private normalizeAreasFrontmatter(areas: string | string[]): string[] {
    return typeof areas === "string" ? [areas] : areas;
  }

  private getFilesByArea(area: string): TFile[] {
    return this.app.vault.getFiles().filter((file) => {
      const metadata = this.app.metadataCache.getFileCache(file);

      const fileAreas: string[] | undefined = this.normalizeAreasFrontmatter(
        metadata?.frontmatter?.areas,
      );
      if (!fileAreas?.length) {
        return false;
      }

      const fileHasArea = fileAreas.map(this.simplifyWikiLink).includes(area);
      return fileHasArea;
    });
  }

  private getFilesByDayCreated(date: Date) {
    const files = this.app.vault
      .getFiles()
      .filter((file) => {
        const fileDate = new Date(file.stat.ctime);
        return (
          file.extension === "md" &&
          fileDate.getFullYear() === date.getFullYear() &&
          fileDate.getMonth() === date.getMonth() &&
          fileDate.getDate() === date.getDate()
        );
      })
      .sort((a, b) => {
        return (
          new Date(b.stat.ctime).getTime() - new Date(a.stat.ctime).getTime()
        );
      });

    const newFiles = this.makeUlLinkListWithTitle("🌱 Created", files);
    this.contentEl.appendChild(newFiles);
  }

  private getFilesByDayModified(date: Date) {
    const files = this.app.vault
      .getFiles()
      .filter((file) => {
        const fileDate = new Date(file.stat.mtime);
        return (
          file.extension === "md" &&
          fileDate.getFullYear() === date.getFullYear() &&
          fileDate.getMonth() === date.getMonth() &&
          fileDate.getDate() === date.getDate()
        );
      })
      .sort((a, b) => {
        return (
          new Date(b.stat.mtime).getTime() - new Date(a.stat.mtime).getTime()
        );
      });

    const newFiles = this.makeUlLinkListWithTitle("🪴 Modified", files);
    this.contentEl.appendChild(newFiles);
  }

  // biome-ignore lint/suspicious/useAwait: Obsidian's API requires this to be async
  async onOpen(): Promise<void> {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("dynamic-widget-container");

    // Create and store reference to content container
    this.contentEl = container.createEl("div", {
      cls: "dynamic-widget-content",
    });

    // Initial content update
    this.updateContent();

    // Listen for active file changes
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", () => {
        this.updateContent();
      }),
    );

    // Listen for file modifications
    this.registerEvent(
      this.app.metadataCache.on("changed", (file: TFile) => {
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile && activeFile.path === file.path) {
          this.updateContent();
        }
      }),
    );

    // Listen for file movements/renames
    this.registerEvent(
      this.app.vault.on("rename", (file: TFile) => {
        const activeFile = this.app.workspace.getActiveFile();

        // If the currently active file was moved, always update
        if (activeFile && activeFile.path === file.path) {
          this.updateContent();
          return;
        }

        // Update when any file with the same area is moved
        if (activeFile) {
          const metadata = this.app.metadataCache.getFileCache(activeFile);
          const currentArea = metadata?.frontmatter?.area;
          if (currentArea) {
            const movedFileMetadata = this.app.metadataCache.getFileCache(file);
            const movedFileArea = movedFileMetadata?.frontmatter?.area;
            // Update if the moved file shares the same area
            if (
              movedFileArea &&
              movedFileArea.replace(/\[\[|\]\]/g, "") ===
                currentArea.replace(/\[\[|\]\]/g, "")
            ) {
              this.updateContent();
            }
          }
        }
      }),
    );

    // Listen for file deletions
    this.registerEvent(
      this.app.vault.on("delete", () => {
        // Update when any file with the same area is deleted
        const activeFile = this.app.workspace.getActiveFile();
        if (activeFile) {
          const metadata = this.app.metadataCache.getFileCache(activeFile);
          const currentArea = metadata?.frontmatter?.area;
          if (currentArea) {
            // Since the file is deleted, we can't check its metadata
            // So we update the widget to reflect the deletion
            this.updateContent();
          }
        }
      }),
    );
  }

  private determineActiveFileType(
    activeFile: TFile | null,
  ): "area" | "areas" | "day" | "other" {
    if (!activeFile) {
      return "other";
    }
    if (activeFile.path.startsWith("Areas/")) {
      return "area";
    }
    const metadata = this.app.metadataCache.getFileCache(activeFile);
    if (metadata?.frontmatter?.areas) {
      return "areas";
    }
    if (activeFile.basename.match(dayFileNameRegex)) {
      return "day";
    }
    return "other";
  }

  private renderImage(coverUrl: string): void {
    const imgEl = this.contentEl.createEl("img", {
      cls: "area-cover-image",
      attr: { src: coverUrl, alt: "Cover image" },
    });
    imgEl.style.maxWidth = "100%";
    imgEl.style.borderRadius = "8px";
    imgEl.style.marginBottom = "10px";
    this.contentEl.appendChild(imgEl);
  }

  private renderVideo(coverUrl: string): void {
    const videoEl = this.contentEl.createEl("video", {
      cls: "area-cover-image",
      attr: {
        src: coverUrl,
        autoplay: "",
        muted: "",
        alt: "Cover video",
      },
    });
    videoEl.style.maxWidth = "100%";
    videoEl.style.borderRadius = "8px";
    videoEl.style.marginBottom = "10px";
    this.contentEl.appendChild(videoEl);
  }

  private renderMedia({
    cover,
    activeFilePath,
  }: {
    cover: string | undefined;
    activeFilePath: string;
  }): void {
    if (!cover) return;
    // Strip wiki link brackets if present
    const cleanCover = cover.replace(/\[\[|\]\]/g, "");

    const coverFile = this.app.metadataCache.getFirstLinkpathDest(
      cleanCover,
      activeFilePath,
    );

    if (!coverFile) return;

    const coverUrl = this.app.vault.getResourcePath(coverFile);
    const fileExtension = coverFile.extension.toLowerCase();

    // Define image and video extensions
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"];
    const videoExtensions = ["mp4", "webm", "ogg", "mov", "avi", "mkv"];

    if (imageExtensions.includes(fileExtension)) {
      this.renderImage(coverUrl);
    } else if (videoExtensions.includes(fileExtension)) {
      this.renderVideo(coverUrl);
    }
  }

  private renderAreaContent(activeFile: TFile): void {
    const metadata = this.app.metadataCache.getFileCache(activeFile);

    this.renderMedia({
      cover: metadata?.frontmatter?.cover,
      activeFilePath: activeFile.path,
    });

    let areas: string[] = [];

    if (activeFile.path.startsWith("Areas/")) {
      areas = [activeFile.basename];
    } else {
      // Use areas frontmatter
      const areasFrontmatter = this.normalizeAreasFrontmatter(
        metadata?.frontmatter?.areas,
      );
      if (areasFrontmatter && areasFrontmatter.length > 0) {
        areas = areasFrontmatter.map(this.simplifyWikiLink);
      }
    }

    if (areas.length > 0) {
      const areasFiles: TFile[] = [];
      const areasHeaderEl = this.contentEl.createEl("div", {
        cls: "areas-header",
      });
      areasHeaderEl.style.display = "flex";
      areasHeaderEl.style.flexWrap = "wrap";
      areasHeaderEl.style.gap = "10px";

      for (const area of areas) {
        const icon = metadata?.frontmatter?.icon;
        areasHeaderEl.createEl("h2", {
          text: `${icon ? `${icon} ` : ""}${area}`,
        });
        const areaFiles = this.getFilesByArea(area);
        areasFiles.push(...areaFiles);
      }
      const uniqueFiles = Array.from(
        new Map(areasFiles.map((file) => [file.path, file])).values(),
      );
      const folders = this.filesByFolders(uniqueFiles, IS_AREA_FOLDERS);
      for (const folder of folders) {
        const areaSection =
          folder.folder.folder === "Areas"
            ? this.makeLinkMediaGridWithTitle(folder.folder.title, folder.files)
            : this.makeUlLinkListWithTitle(folder.folder.title, folder.files);
        if (areaSection) {
          this.contentEl.appendChild(areaSection);
        }
      }
    }
  }

  private renderAreasContent(activeFile: TFile): void {
    const metadata = this.app.metadataCache.getFileCache(activeFile);

    this.renderMedia({
      cover: metadata?.frontmatter?.cover,
      activeFilePath: activeFile.path,
    });

    let areas: string[] = [];

    if (activeFile.path.startsWith("Areas/")) {
      areas = [activeFile.basename];
    } else {
      // Use areas frontmatter
      const areasFrontmatter = this.normalizeAreasFrontmatter(
        metadata?.frontmatter?.areas,
      );
      if (areasFrontmatter && areasFrontmatter.length > 0) {
        areas = areasFrontmatter.map(this.simplifyWikiLink);
      }
    }

    if (areas.length > 0) {
      const areasFiles: TFile[] = [];
      const areasHeaderEl = this.contentEl.createEl("div", {
        cls: "areas-header",
      });
      areasHeaderEl.style.display = "flex";
      areasHeaderEl.style.flexWrap = "wrap";
      areasHeaderEl.style.gap = "10px";

      const areaFiles: TFile[] = [];

      for (const area of areas) {
        const areaFile = this.app.vault.getFiles().find((file) => {
          const fileMetadata = this.app.metadataCache.getFileCache(file);
          const aliases: string[] | undefined =
            fileMetadata?.frontmatter?.aliases;
          if (aliases) {
            const simplifiedAliases = this.normalizeAreasFrontmatter(
              aliases,
            ).map(this.simplifyWikiLink);
            if (simplifiedAliases.includes(area)) {
              return true;
            }
          }
          return file.basename === area;
        });
        if (areaFile) areaFiles.push(areaFile);
        const filesByArea = this.getFilesByArea(area).filter((file) => {
          return !file.path.startsWith("Areas");
        });
        areasFiles.push(...filesByArea);
      }
      if (areaFiles.length > 0) {
        const areaGrid = this.makeLinkMediaGridWithTitle("🏠 Areas", areaFiles);
        this.contentEl.appendChild(areaGrid);
      }
      const uniqueFiles = Array.from(
        new Map(areasFiles.map((file) => [file.path, file])).values(),
      );
      const folders = this.filesByFolders(uniqueFiles, HAS_AREAS_FOLDERS);
      for (const folder of folders) {
        const areaSection =
          folder.folder.folder === "Areas"
            ? this.makeLinkMediaGridWithTitle(folder.folder.title, folder.files)
            : this.makeUlLinkListWithTitle(folder.folder.title, folder.files);
        if (areaSection) {
          this.contentEl.appendChild(areaSection);
        }
      }
    }
  }

  private renderDateContent(): void {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      return;
    }

    const basename = activeFile.basename;
    if (!basename.match(dayFileNameRegex)) {
      return;
    }

    const [year, month, day] = basename.split("-").map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed
    this.contentEl.createEl("h2", {
      text: `🌅 ${date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
      })}`,
    });

    const allFiles = this.app.vault.getFiles();
    const folders = this.filesByFolders(allFiles, IS_DAILY_FOLDERS);
    for (const folder of folders) {
      const areaSection = this.makeUlLinkListWithTitle(
        folder.folder.title,
        folder.files,
      );
      if (areaSection) {
        this.contentEl.appendChild(areaSection);
      }
    }

    this.getFilesByDayCreated(date);
    this.getFilesByDayModified(date);
  }

  private updateContent() {
    if (!this.contentEl) {
      return;
    }
    this.contentEl.empty();

    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) {
      // Show inbox and active projects when no file is active
      const allFiles = this.app.vault.getFiles();
      const folders = this.filesByFolders(allFiles, NO_ACTIVE_FILE);
      for (const folder of folders) {
        const section = this.makeUlLinkListWithTitle(folder.folder.title, folder.files);
        if (section) {
          this.contentEl.appendChild(section);
        }
      }
      return;
    }

    const activeFileType = this.determineActiveFileType(activeFile);
    switch (activeFileType) {
      case "area":
        this.renderAreaContent(activeFile);
        break;
      case "areas":
        this.renderAreasContent(activeFile);
        break;
      case "day":
        this.renderDateContent();
        break;
      default:
        break;
    }
  }

  // biome-ignore lint/suspicious/useAwait: Obsidian's API requires this to be async
  async onClose() {
    this.contentEl = document.createElement("div");
  }
}
