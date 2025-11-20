import { writable } from 'svelte/store';
import type DynamicWallpaperPlugin from './main';

export interface PluginSettings {
  defaultWallpaper: string;
  overlayOpacityLight: number;
  overlayOpacityDark: number;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  defaultWallpaper: 'default.jpg',
  overlayOpacityLight: 0.8,
  overlayOpacityDark: 0.6,
};

export const pluginSettings = writable<PluginSettings>(DEFAULT_SETTINGS);

let plugin: DynamicWallpaperPlugin;

export function initStore(p: DynamicWallpaperPlugin) {
  plugin = p;
  pluginSettings.set(plugin.settings);
}

pluginSettings.subscribe((value) => {
  if (plugin) {
    plugin.settings = value;
    plugin.saveSettings();
  }
});
