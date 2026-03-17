import { writable } from "svelte/store";
import type { App } from "obsidian";
import type {
  DiscogsRelease,
  MBMatchMap,
  MusicCollectorSettings,
  SearchResult,
} from "./types";
import { getVaultMatches, isInVault } from "./vaultMatcher";
import { createAlbumNote, downloadCoverArtCascade } from "./noteCreator";
import { invalidateVault } from "./store";

export interface BulkImportState {
  status: "idle" | "importing" | "stopped";
  processed: number;
  total: number;
  created: number;
  skipped: number;
  failed: number;
  currentRelease: string;
  currentReleaseId: number | null;
}

export const bulkImportState = writable<BulkImportState>({
  status: "idle",
  processed: 0,
  total: 0,
  created: 0,
  skipped: 0,
  failed: 0,
  currentRelease: "",
  currentReleaseId: null,
});

let abortFlag = false;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function startBulkImport(
  app: App,
  settings: MusicCollectorSettings,
  releases: DiscogsRelease[],
  matches: MBMatchMap,
) {
  abortFlag = false;

  const vaultMatches = getVaultMatches(app, settings.outputFolder);
  const candidates = releases.filter(
    (r) => matches[r.id] && !isInVault(r, vaultMatches, matches[r.id]),
  );

  bulkImportState.set({
    status: "importing",
    processed: 0,
    total: candidates.length,
    created: 0,
    skipped: 0,
    failed: 0,
    currentRelease: "",
    currentReleaseId: null,
  });

  for (const release of candidates) {
    if (abortFlag) {
      bulkImportState.update((s) => ({ ...s, status: "stopped" }));
      return;
    }

    const match = matches[release.id];
    bulkImportState.update((s) => ({
      ...s,
      currentRelease: `${release.artist} - ${release.title}`,
      currentReleaseId: release.id,
    }));

    try {
      const { outputFolder, filenameFormat } = settings;
      const filename =
        (filenameFormat || "{{artist}} - {{title}}")
          .replace(/\{\{\s*artist\s*\}\}/g, match.artist)
          .replace(/\{\{\s*title\s*\}\}/g, match.title)
          .replace(/[\\/:*?"<>|]/g, "")
          .trim() + ".md";
      const filepath = `${outputFolder}/${filename}`;

      const coverArt = await downloadCoverArtCascade(
        app,
        match.mbid,
        match.title,
        filepath,
      );

      if (coverArt === null) {
        bulkImportState.update((s) => ({
          ...s,
          processed: s.processed + 1,
          failed: s.failed + 1,
        }));
        await delay(2000);
        continue;
      }

      const result: SearchResult = {
        mbid: match.mbid,
        title: match.title,
        artist: match.artist,
        primaryType: match.primaryType,
        firstReleaseDate: match.firstReleaseDate,
        coverArtUrl: match.coverArtUrl,
      };

      const file = await createAlbumNote(
        app,
        result,
        settings,
        { discogsId: String(release.id), dateAdded: release.dateAdded.split("T")[0] },
        { openAfterCreate: false, coverArtOverride: coverArt },
      );

      if (file) {
        bulkImportState.update((s) => ({
          ...s,
          processed: s.processed + 1,
          created: s.created + 1,
        }));
        invalidateVault();
      } else {
        bulkImportState.update((s) => ({
          ...s,
          processed: s.processed + 1,
          skipped: s.skipped + 1,
        }));
      }
    } catch (e) {
      console.error(`Bulk import failed for ${release.artist} - ${release.title}:`, e);
      bulkImportState.update((s) => ({
        ...s,
        processed: s.processed + 1,
        failed: s.failed + 1,
      }));
    }

    await delay(2000);
  }

  invalidateVault();
  bulkImportState.set({
    status: "idle",
    processed: 0,
    total: 0,
    created: 0,
    skipped: 0,
    failed: 0,
    currentRelease: "",
    currentReleaseId: null,
  });
}

export function stopBulkImport() {
  abortFlag = true;
}
