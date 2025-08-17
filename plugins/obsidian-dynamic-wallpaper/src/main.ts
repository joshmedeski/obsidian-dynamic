import { Plugin, TFile } from "obsidian";

function normalizeAreasFrontmatter(areas: string | string[]): string[] {
  return typeof areas === "string" ? [areas] : areas;
}

function simplifyWikiLink(link: string) {
  return link.replace(/\[\[|\]\]/g, "");
}

export default class DynamicWallpaperPlugin extends Plugin {
  async onload() {
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

  private updateWallpaper() {
    const activeFile = this.app.workspace.getActiveFile();
    if (!activeFile) return;

    const metadata = this.app.metadataCache.getFileCache(activeFile);
    let wallpaper = metadata?.frontmatter?.wallpaper;

    if (!wallpaper && metadata?.frontmatter?.areas) {
      const areasFrontmatter = normalizeAreasFrontmatter(
        metadata.frontmatter.areas,
      );
      if (areasFrontmatter && areasFrontmatter.length > 0) {
        const firstArea = simplifyWikiLink(areasFrontmatter[0]);
        // Find the area file itself (not files that belong to the area)
        const areaFile = this.app.metadataCache.getFirstLinkpathDest(
          firstArea,
          activeFile.path,
        );
        if (areaFile) {
          const areaFileMetadata =
            this.app.metadataCache.getFileCache(areaFile);
          wallpaper = areaFileMetadata?.frontmatter?.wallpaper;
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

      console.log("wallpaperFile", wallpaperFile);
      if (wallpaperFile) {
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
