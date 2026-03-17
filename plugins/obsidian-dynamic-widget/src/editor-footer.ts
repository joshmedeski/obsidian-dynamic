import {
  type FrontmatterLinkCache,
  type LinkCache,
  MarkdownView,
  type TFile,
} from "obsidian";
import type DynamicWidgetPlugin from "./main";
import { formatDate, isFilePrivate, normalizeAreasFrontmatter, redactText, simplifyWikiLink } from "./utils";

export class EditorFooter {
  private footerEl: HTMLElement | null = null;
  private plugin: DynamicWidgetPlugin | null = null;

  attach(plugin: DynamicWidgetPlugin): void {
    this.plugin = plugin;

    this.footerEl = document.createElement("div");
    this.footerEl.className = "editor-footer";

    plugin.registerEvent(
      plugin.app.workspace.on("active-leaf-change", () => {
        this.update();
      }),
    );

    plugin.registerEvent(
      plugin.app.metadataCache.on("changed", (file: TFile) => {
        const activeFile = plugin.app.workspace.getActiveFile();
        if (activeFile && activeFile.path === file.path) {
          this.update();
        }
      }),
    );

    plugin.registerEvent(
      plugin.app.vault.on("rename", (file) => {
        const activeFile = plugin.app.workspace.getActiveFile();
        if (activeFile && activeFile.path === file.path) {
          this.update();
        }
      }),
    );

    // Initial render
    plugin.app.workspace.onLayoutReady(() => {
      this.update();
    });
  }

  refresh(): void {
    this.update();
  }

  detach(): void {
    this.footerEl?.remove();
    this.footerEl = null;
    this.plugin = null;
  }

  private update(): void {
    if (!this.footerEl || !this.plugin) return;

    const activeView =
      this.plugin.app.workspace.getActiveViewOfType(MarkdownView);

    if (!activeView) {
      this.footerEl.remove();
      return;
    }

    const file = activeView.file;
    if (!file) {
      this.footerEl.remove();
      return;
    }

    this.buildFooterContent(file, activeView);

    const viewContent = activeView.contentEl;
    if (viewContent && this.footerEl.parentElement !== viewContent) {
      viewContent.appendChild(this.footerEl);
    }
  }

  private addSeparator(container: HTMLElement): void {
    const sep = container.createEl("span", {
      text: "|",
      cls: "editor-footer-separator",
    });
    sep.style.opacity = "0.4";
  }

  private buildCoverRow(
    file: TFile,
    metadata: ReturnType<typeof this.plugin!.app.metadataCache.getFileCache>,
  ): void {
    if (!this.footerEl || !this.plugin) return;

    const app = this.plugin.app;
    const seen = new Set<string>();
    const covers: { name: string; resourceUrl: string; path: string }[] = [];

    const resolveCover = (linkPath: string) => {
      if (seen.has(linkPath)) return;
      seen.add(linkPath);

      const targetFile = app.metadataCache.getFirstLinkpathDest(
        linkPath,
        file.path,
      );
      if (!targetFile) return;

      const targetMeta = app.metadataCache.getFileCache(targetFile);
      const cover = targetMeta?.frontmatter?.cover;
      if (!cover) return;

      const coverFile = app.metadataCache.getFirstLinkpathDest(
        simplifyWikiLink(String(cover)),
        targetFile.path,
      );
      if (!coverFile) return;

      covers.push({
        name: targetFile.basename,
        resourceUrl: app.vault.getResourcePath(coverFile),
        path: targetFile.path,
      });
    };

    // Frontmatter property links first
    const fmLinks = metadata?.frontmatterLinks ?? [];
    for (const link of fmLinks) {
      resolveCover(link.link);
    }

    // Then body outgoing links
    const bodyLinks = metadata?.links ?? [];
    for (const link of bodyLinks) {
      resolveCover(link.link);
    }

    if (covers.length === 0) return;

    const row = this.footerEl.createEl("div", {
      cls: "editor-footer-covers",
    });

    for (const { name, resourceUrl, path } of covers) {
      const targetFile = app.vault.getAbstractFileByPath(path);
      const isPrivate =
        this.plugin?.privateMode &&
        targetFile &&
        "stat" in targetFile &&
        (targetFile.path.startsWith("Relationships/") || isFilePrivate(app, targetFile as TFile));

      if (isPrivate) continue; // Don't render private cover cards at all

      const card = row.createEl("div", { cls: "editor-footer-cover-card" });

      card.style.cursor = "pointer";
      card.addEventListener("click", () => {
        if (targetFile) {
          app.workspace.openLinkText(path, "", "tab");
        }
      });

      card.createEl("img", { attr: { src: resourceUrl, alt: name } });
      card.createEl("span", {
        text: name,
        cls: "editor-footer-cover-name",
      });
    }
  }

  private buildFooterContent(file: TFile, activeView: MarkdownView): void {
    if (!this.footerEl || !this.plugin) return;

    this.footerEl.empty();

    const metadata = this.plugin.app.metadataCache.getFileCache(file);
    const fm = metadata?.frontmatter;

    // Metadata row
    const metaRow = this.footerEl.createEl("div", {
      cls: "editor-footer-meta",
    });

    if (this.plugin?.privateMode && (file.path.startsWith("Relationships/") || isFilePrivate(this.plugin.app, file))) {
      metaRow.createEl("span", { text: redactText("Created: Jan 1, 2025") });
      metaRow.classList.add("dynamic-widget-private");
      this.footerEl.appendChild(metaRow);
      return; // Skip cover row and real dates
    }

    // Created
    metaRow.createEl("span", {
      text: `Created: ${formatDate(file.stat.ctime)}`,
    });

    // Modified
    this.addSeparator(metaRow);
    metaRow.createEl("span", {
      text: `Modified: ${formatDate(file.stat.mtime)}`,
    });

    // Outgoing link covers (before metadata row)
    this.buildCoverRow(file, metadata);
    // Move metadata row after covers
    this.footerEl.appendChild(metaRow);
  }
}
