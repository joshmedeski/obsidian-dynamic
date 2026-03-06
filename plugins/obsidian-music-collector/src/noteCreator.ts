import { type App, Notice } from "obsidian";
import type { SearchResult } from "./types";

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, "").trim();
}

export async function createAlbumNote(
  app: App,
  result: SearchResult,
  outputFolder: string,
): Promise<void> {
  const filename = sanitizeFilename(`${result.artist} - ${result.title}.md`);
  const filepath = `${outputFolder}/${filename}`;

  const existing = app.vault.getAbstractFileByPath(filepath);
  if (existing) {
    new Notice(`Note already exists: ${filename}`);
    const leaf = app.workspace.getLeaf(false);
    await leaf.openFile(existing as any);
    return;
  }

  try {
    await app.vault.createFolder(outputFolder);
  } catch {
    // folder already exists
  }

  const frontmatter = [
    "---",
    `areas: 
      - [[Music]]`,
    `artists: 
      - [[${result.artist}]]`,
    `mbid: "${result.mbid}"`,
    `type: "${result.primaryType}"`,
    `released: "${result.firstReleaseDate}"`,
    result.coverArtUrl ? `cover: "${result.coverArtUrl}"` : null,
    `purchased: ${new Date().toISOString().split("T")[0]}`,
    "---",
    "",
  ]
    .filter((line) => line !== null)
    .join("\n");

  const file = await app.vault.create(filepath, frontmatter);
  const leaf = app.workspace.getLeaf(false);
  await leaf.openFile(file);
  new Notice(`Created: ${filename}`);
}
