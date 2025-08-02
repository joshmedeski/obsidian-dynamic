import { Plugin } from 'obsidian';
import {
  VerticalVideoWidgetView,
  VIEW_TYPE_VERTICAL_VIDEO_WIDGET,
} from './widgetView';

export default class VerticalVideoPlugin extends Plugin {
  async onload() {
    // Register the dynamic widget view
    this.registerView(
      VIEW_TYPE_VERTICAL_VIDEO_WIDGET,
      (leaf) => new VerticalVideoWidgetView(leaf)
    );

    // Auto-activate the widget in the right sidebar
    // this.app.workspace.onLayoutReady(async () => {
    // 	const leaf = this.app.workspace.getLeftLeaf(false);
    // 	if (leaf) {
    // 		await this.activateView();
    // 	}
    // });

    // Add command to toggle the dynamic widget
    this.addCommand({
      id: 'open-dynamic-widget',
      name: 'Open Dynamic Widget',
      callback: () => {
        this.activateView();
      },
    });
  }

  async activateView() {
    // Remove any existing instances
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_VERTICAL_VIDEO_WIDGET);

    // Create and activate the view in right sidebar
    const leaf = this.app.workspace.getRightLeaf(false);
    if (!leaf) return;

    await leaf.setViewState({
      type: VIEW_TYPE_VERTICAL_VIDEO_WIDGET,
      active: true,
    });

    // Ensure the view is visible
    const leaves = this.app.workspace.getLeavesOfType(
      VIEW_TYPE_VERTICAL_VIDEO_WIDGET
    );
    if (leaves.length > 0) {
      this.app.workspace.revealLeaf(leaves[0]);
    }
  }

  onunload() {
    // Clean up the view when plugin is disabled
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_VERTICAL_VIDEO_WIDGET);
  }
}
