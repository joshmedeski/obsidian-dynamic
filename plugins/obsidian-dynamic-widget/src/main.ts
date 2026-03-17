import { Plugin } from 'obsidian';

import {
  DynamicWidgetView,
  VIEW_TYPE_DYNAMIC_WIDGET,
} from './dynamic-widget-view';
import { EditorFooter } from './editor-footer';

interface PluginData {
  privateMode: boolean;
}

const DEFAULT_DATA: PluginData = { privateMode: false };

export default class DynamicWidgetPlugin extends Plugin {
  private editorFooter = new EditorFooter();
  privateMode = false;
  private statusBarEl: HTMLElement | null = null;

  async onload() {
    const data = (await this.loadData()) as PluginData | null;
    this.privateMode = data?.privateMode ?? DEFAULT_DATA.privateMode;

    this.editorFooter.attach(this);
    // Register the dynamic widget view
    this.registerView(
      VIEW_TYPE_DYNAMIC_WIDGET,
      (leaf) => new DynamicWidgetView(leaf, this)
    );

    // Add command to toggle the dynamic widget
    this.addCommand({
      id: 'open-dynamic-widget',
      name: 'Open Dynamic Widget',
      callback: () => {
        this.activateView();
      },
    });

    // Private mode toggle command
    this.addCommand({
      id: 'toggle-private-mode',
      name: 'Toggle Private Mode',
      callback: () => {
        this.togglePrivateMode();
      },
    });

    // Status bar indicator
    this.statusBarEl = this.addStatusBarItem();
    this.updateStatusBar();
  }

  private async togglePrivateMode(): Promise<void> {
    this.privateMode = !this.privateMode;
    await this.saveData({ privateMode: this.privateMode } satisfies PluginData);
    this.updateStatusBar();

    // Re-render widget view
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_DYNAMIC_WIDGET);
    for (const leaf of leaves) {
      const view = leaf.view as DynamicWidgetView;
      view.refreshContent();
    }

    // Re-render editor footer
    this.editorFooter.refresh();
  }

  private updateStatusBar(): void {
    if (!this.statusBarEl) return;
    this.statusBarEl.setText(this.privateMode ? '🔒' : '');
  }

  async activateView() {
    // Remove any existing instances
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_DYNAMIC_WIDGET);

    // Create and activate the view in right sidebar
    const leaf = this.app.workspace.getLeftLeaf(false);
    if (!leaf) {
      return;
    }

    await leaf.setViewState({
      type: VIEW_TYPE_DYNAMIC_WIDGET,
      active: true,
    });

    // Ensure the view is visible
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_DYNAMIC_WIDGET);
    if (leaves.length > 0) {
      this.app.workspace.revealLeaf(leaves[0]);
    }
  }

  onunload() {
    this.editorFooter.detach();
    // Clean up the view when plugin is disabled
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_DYNAMIC_WIDGET);
  }
}
