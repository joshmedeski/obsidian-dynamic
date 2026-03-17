import type { App, TFile } from "obsidian";

export function normalizeAreasFrontmatter(
  areas: string | string[],
): string[] {
  return typeof areas === "string" ? [areas] : areas;
}

export function isFilePrivate(app: App, file: TFile): boolean {
  const metadata = app.metadataCache.getFileCache(file);
  if (metadata?.frontmatter?.private === true) return true;
  const areas = normalizeAreasFrontmatter(metadata?.frontmatter?.areas);
  if (!areas?.length) return false;
  for (const area of areas) {
    const areaName = simplifyWikiLink(area);
    const areaFile = app.vault
      .getFiles()
      .find((f) => f.path === `Areas/${areaName}.md`);
    if (!areaFile) continue;
    const areaMeta = app.metadataCache.getFileCache(areaFile);
    if (areaMeta?.frontmatter?.private === true) return true;
  }
  return false;
}

export function simplifyWikiLink(link: string): string {
  return link.replace(/\[\[|\]\]/g, "");
}

export function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
