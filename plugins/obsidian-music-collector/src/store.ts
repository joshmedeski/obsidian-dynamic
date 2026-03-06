import { writable } from 'svelte/store';
import type MusicCollectorPlugin from './main';
import { DEFAULT_SETTINGS, type MusicCollectorSettings } from './types';

export const pluginSettings = writable<MusicCollectorSettings>(DEFAULT_SETTINGS);

let plugin: MusicCollectorPlugin;

export function initStore(p: MusicCollectorPlugin) {
  plugin = p;
  pluginSettings.set(p.settings);
}

pluginSettings.subscribe((value) => {
  if (plugin) {
    plugin.settings = value;
    plugin.saveSettings();
  }
});
