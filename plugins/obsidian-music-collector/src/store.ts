import { writable } from 'svelte/store';
import type MusicCollectorPlugin from './main';
import { DEFAULT_SETTINGS, type MusicCollectorSettings } from './types';
import type { DiscogsCache, DiscogsRelease } from './types';

export const pluginSettings = writable<MusicCollectorSettings>(DEFAULT_SETTINGS);
export const discogsCollection = writable<DiscogsRelease[]>([]);
export const discogsLoading = writable<boolean>(false);
export const discogsError = writable<string>('');

let plugin: MusicCollectorPlugin;

export function initStore(p: MusicCollectorPlugin) {
  plugin = p;
  pluginSettings.set(p.settings);

  // Hydrate collection from cache on startup
  if (p.discogsCache?.releases?.length) {
    discogsCollection.set(p.discogsCache.releases);
  }
}

export async function saveDiscogsCache(releases: DiscogsRelease[]) {
  const cache: DiscogsCache = { releases, lastFetched: Date.now() };
  await plugin.saveCache(cache);
}

export function getDiscogsCache(): DiscogsCache | null {
  return plugin?.discogsCache ?? null;
}

pluginSettings.subscribe((value) => {
  if (plugin) {
    plugin.settings = value;
    plugin.saveSettings();
  }
});
