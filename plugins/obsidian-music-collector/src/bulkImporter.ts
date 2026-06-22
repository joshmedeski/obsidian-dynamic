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
      const version = match.release;
      // A pinned version becomes a separate vault entry, so the note title and
      // filename use the release's own title (plus its MusicBrainz
      // disambiguation, e.g. "(Mono)", which is what distinguishes editions
      // that otherwise share the album title).
      const baseTitle =
        version?.title && version.title.trim() ? version.title : match.title;
      const effectiveTitle =
        version?.disambiguation && version.disambiguation.trim()
          ? `${baseTitle} (${version.disambiguation})`
          : baseTitle;
      const filename =
        (filenameFormat || "{{artist}} - {{title}}")
          .replace(/\{\{\s*artist\s*\}\}/g, match.artist)
          .replace(/\{\{\s*title\s*\}\}/g, effectiveTitle)
          .replace(/[\\/:*?"<>|]/g, "")
          .trim() + ".md";
      const filepath = `${outputFolder}/${filename}`;

      // Pinned version: pull cover from the release; fall back to the
      // release-group cover when the specific release has no art.
      let coverArt: string | null = null;
      if (version) {
        coverArt = await downloadCoverArtCascade(
          app,
          version.id,
          effectiveTitle,
          filepath,
          "release",
        );
      }
      if (coverArt === null) {
        coverArt = await downloadCoverArtCascade(
          app,
          match.mbid,
          effectiveTitle,
          filepath,
        );
      }

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
        title: effectiveTitle,
        artist: match.artist,
        primaryType: match.primaryType,
        firstReleaseDate: match.firstReleaseDate,
        coverArtUrl: match.coverArtUrl,
      };

      const extra: Record<string, string> = {
        discogsId: String(release.id),
        dateAdded: release.dateAdded.split("T")[0],
        format: release.format ?? "",
      };
      if (version) {
        extra.releaseId = version.id;
        extra.country = version.country;
        extra.label = version.label;
        extra.catalogNumber = version.catalogNumber;
        extra.barcode = version.barcode;
        extra.trackCount = version.trackCount ? String(version.trackCount) : "";
        if (version.format) extra.format = version.format;
        if (version.date) extra.released = version.date;
      }

      const file = await createAlbumNote(
        app,
        result,
        settings,
        extra,
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
