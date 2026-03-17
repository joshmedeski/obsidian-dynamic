import { type App, TFile } from "obsidian";
import type { MBMatch } from "./types";

export interface VaultMatches {
  discogsIds: Set<string>;
  mbids: Set<string>;
  keys: Set<string>;
}

export function getVaultMatches(
  app: App,
  outputFolder: string,
): VaultMatches {
  const discogsIds = new Set<string>();
  const mbids = new Set<string>();
  const keys = new Set<string>();
  const files = app.vault
    .getFiles()
    .filter((f) => f.path.startsWith(outputFolder + "/"));
  for (const file of files) {
    const cache = app.metadataCache.getFileCache(file);
    const fm = cache?.frontmatter;
    if (fm?.discogsId) {
      discogsIds.add(String(fm.discogsId));
    }
    if (fm?.mbid) {
      mbids.add(String(fm.mbid));
    }
    if (fm?.title && fm?.artist) {
      keys.add(`${fm.artist.toLowerCase()}|||${fm.title.toLowerCase()}`);
    }
    const name = file.basename;
    if (name.includes(" - ")) {
      keys.add(name.toLowerCase());
    }
  }
  return { discogsIds, mbids, keys };
}

function matchesKeys(
  artist: string,
  title: string,
  keys: Set<string>,
): boolean {
  const fmKey = `${artist.toLowerCase()}|||${title.toLowerCase()}`;
  if (keys.has(fmKey)) return true;
  const filenameKey = `${artist} - ${title}`.toLowerCase();
  if (keys.has(filenameKey)) return true;
  return false;
}

export function findVaultFile(
  app: App,
  outputFolder: string,
  release: { id: number; artist: string; title: string },
  mbMatch?: MBMatch,
): TFile | null {
  const files = app.vault
    .getFiles()
    .filter((f) => f.path.startsWith(outputFolder + "/"));
  for (const file of files) {
    const cache = app.metadataCache.getFileCache(file);
    const fm = cache?.frontmatter;
    if (fm?.discogsId && String(fm.discogsId) === String(release.id))
      return file;
    if (mbMatch && fm?.mbid && String(fm.mbid) === mbMatch.mbid) return file;
    if (fm?.title && fm?.artist) {
      const fmKey = `${fm.artist.toLowerCase()}|||${fm.title.toLowerCase()}`;
      const releaseKey = `${release.artist.toLowerCase()}|||${release.title.toLowerCase()}`;
      if (fmKey === releaseKey) return file;
      if (mbMatch) {
        const mbKey = `${mbMatch.artist.toLowerCase()}|||${mbMatch.title.toLowerCase()}`;
        if (fmKey === mbKey) return file;
      }
    }
    const name = file.basename.toLowerCase();
    if (name.includes(" - ")) {
      const releaseFilename =
        `${release.artist} - ${release.title}`.toLowerCase();
      if (name === releaseFilename) return file;
      if (mbMatch) {
        const mbFilename =
          `${mbMatch.artist} - ${mbMatch.title}`.toLowerCase();
        if (name === mbFilename) return file;
      }
    }
  }
  return null;
}

export function isInVault(
  release: { id: number; artist: string; title: string },
  matches: VaultMatches,
  mbMatch?: MBMatch,
): boolean {
  if (matches.discogsIds.has(String(release.id))) return true;
  if (mbMatch && matches.mbids.has(mbMatch.mbid)) return true;
  if (matchesKeys(release.artist, release.title, matches.keys)) return true;
  if (mbMatch && matchesKeys(mbMatch.artist, mbMatch.title, matches.keys))
    return true;
  return false;
}
