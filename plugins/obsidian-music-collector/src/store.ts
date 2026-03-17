import { writable, get } from 'svelte/store';
import type MusicCollectorPlugin from './main';
import { DEFAULT_SETTINGS, type MusicCollectorSettings } from './types';
import type { DiscogsCache, DiscogsRelease, MBMatchMap } from './types';
import { mbMatches, startScan, mbScanState } from './mbScanner';
import { bulkImportState, startBulkImport, stopBulkImport } from './bulkImporter';

export const pluginSettings = writable<MusicCollectorSettings>(DEFAULT_SETTINGS);
export const discogsCollection = writable<DiscogsRelease[]>([]);
export const discogsLoading = writable<boolean>(false);
export const discogsError = writable<string>('');
export const vaultRevision = writable<number>(0);
export { mbMatches, mbScanState };
export { bulkImportState, stopBulkImport };

export function invalidateVault() {
  vaultRevision.update((n) => n + 1);
}

let plugin: MusicCollectorPlugin;

export function initStore(p: MusicCollectorPlugin) {
  plugin = p;
  pluginSettings.set(p.settings);

  // Hydrate collection from cache on startup
  if (p.discogsCache?.releases?.length) {
    discogsCollection.set(p.discogsCache.releases);
  }

  // Hydrate MB matches from persisted data
  if (p.mbMatches && Object.keys(p.mbMatches).length > 0) {
    mbMatches.set(p.mbMatches);
  }
}

export async function saveDiscogsCache(releases: DiscogsRelease[]) {
  const cache: DiscogsCache = { releases, lastFetched: Date.now() };
  await plugin.saveCache(cache);
}

export function getDiscogsCache(): DiscogsCache | null {
  return plugin?.discogsCache ?? null;
}

export async function saveMBMatches(matches: MBMatchMap) {
  await plugin.saveMBMatches(matches);
}

export async function removeMBMatch(discogsId: number) {
  mbMatches.update((m) => {
    const next = { ...m };
    delete next[discogsId];
    return next;
  });
  await plugin.saveMBMatches(get(mbMatches));
}

export function triggerMBScan() {
  const releases = get(discogsCollection);
  if (releases.length === 0) return;
  startScan(releases, saveMBMatches);
}

export function triggerBulkImport(sortedReleases?: DiscogsRelease[]) {
  const releases = sortedReleases ?? get(discogsCollection);
  if (releases.length === 0 || !plugin) return;
  const matches = get(mbMatches);
  startBulkImport(plugin.app, plugin.settings, releases, matches);
}

pluginSettings.subscribe((value) => {
  if (plugin) {
    plugin.settings = value;
    plugin.saveSettings();
  }
});
