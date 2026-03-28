# obsidian-dispatch - Design Spec

## Problem

There's no way to send commands from Obsidian to the terminal. Common workflows like "send this file to Claude Code" or "open this note's folder in a terminal" require manual copy-paste of paths and context switching. The user wants a recipe-based system to define reusable terminal command templates that can be dispatched from Obsidian's command palette.

## Solution

An Obsidian plugin called `obsidian-dispatch` that:

1. Provides a **recipe system** for defining reusable command templates with template variables
2. Supports **multiple dispatch methods**: sesh (tmux session manager), direct exec, and AppleScript
3. Optionally **focuses a terminal app** after dispatching (per-recipe)
4. Registers each recipe as an **Obsidian command** for command palette access

**Platform:** Desktop-only (macOS primary). AppleScript dispatch and terminal focus are macOS-only. The `isDesktopOnly` flag is set to `true` in manifest.

## Data Model

### Recipe

```typescript
interface Recipe {
  id: string;              // Unique slug (kebab-case, e.g. "claude-code")
  name: string;            // Display name (shown in command palette as "Dispatch: <name>")
  command: string;          // Template string with {{variables}}
  dispatchMethod: "sesh" | "exec" | "applescript";
  seshPath?: string;       // For sesh dispatch: the session path to connect to
  terminalApp?: string;    // Optional: app to focus (free-form string, e.g. "Ghostty")
  focusTerminal: boolean;  // Whether to activate the terminal app after dispatch
  inputPrompt?: string;    // Custom prompt text for {{input}} modal (default: "Enter input")
}
```

### Plugin Settings

```typescript
interface DispatchSettings {
  recipes: Recipe[];
}
```

### Default Settings

Ships with one pre-configured recipe:

```typescript
const DEFAULT_SETTINGS: DispatchSettings = {
  recipes: [
    {
      id: "claude-code",
      name: "Send to Claude Code",
      command: "@'{{filePath}}' {{input}}",
      dispatchMethod: "sesh",
      seshPath: "~/c/second-brain",
      focusTerminal: false,
      inputPrompt: "Message for Claude Code",
    },
  ],
};
```

## Template Variables

Available in recipe `command` strings:

| Variable | Description | Source |
|---|---|---|
| `{{vaultPath}}` | Absolute path to vault root | `app.vault.adapter.getBasePath()` |
| `{{filePath}}` | Absolute path to active file | `adapter.getFullPath(file.path)` |
| `{{fileName}}` | Active file name (with extension) | `file.name` |
| `{{folder}}` | Parent folder absolute path | Derived from filePath |
| `{{title}}` | Note title from frontmatter, falls back to fileName without extension | `metadataCache.getFileCache()` |
| `{{selection}}` | Currently selected text in editor | `editor.getSelection()` |
| `{{input}}` | User-provided text via modal prompt | InputModal at dispatch time |

**Edge cases:**
- If no file is active and the command uses file-dependent variables (`filePath`, `fileName`, `folder`, `title`), abort dispatch and show a warning Notice: "No active file - cannot dispatch."
- If `{{selection}}` is used but no editor is active or nothing is selected, resolve to empty string.
- If `{{input}}` is in the template, show InputModal. If the user cancels the modal, abort dispatch.

## Dispatch Methods

All dispatch methods use `child_process.exec()` with a 30-second timeout. On error, show an Obsidian `Notice` with the error message.

### sesh

Executes: `sesh connect <seshPath> --command "<rendered command>"`

If `sesh` is not found on PATH, show Notice: "sesh not found. Install it or use a different dispatch method."

### exec

Executes the rendered command directly. stdout/stderr shown as Notice.

### applescript

Sends the rendered command to a terminal app via `osascript`. Uses `do script` approach (not keystroke) for reliability:

```applescript
tell application "<terminalApp>"
  activate
  do script "<escaped command>"
end tell
```

Command strings are escaped for AppleScript (double quotes and backslashes). Falls back to a clipboard-paste approach if `do script` is not supported by the target app.

**Note:** AppleScript `do script` is natively supported by Terminal.app. For Ghostty/Kitty/Wezterm, the applescript method will activate the app and use `System Events` to paste from clipboard as a fallback.

## Terminal Focus

When `focusTerminal` is true and `terminalApp` is set, after dispatching:

```bash
osascript -e 'tell application "<terminalApp>" to activate'
```

## File Structure

```
plugins/obsidian-dispatch/
  src/
    main.ts          # Plugin class, command registration, settings lifecycle
    recipes.ts       # Recipe types, template variable resolution, rendering
    dispatch.ts      # Dispatch method implementations (sesh, exec, applescript)
    input-modal.ts   # Modal for {{input}} variable prompting
    settings-tab.ts  # PluginSettingTab (plain Obsidian Setting API) for managing recipes
  public/
    manifest.json
    styles.css
  package.json
  tsconfig.json
  vite.config.ts
```

## Plugin Lifecycle

### onload()

1. Load settings (recipes)
2. Register settings tab
3. Call `registerRecipeCommands()` to register one Obsidian command per recipe

### onunload()

No explicit cleanup needed - Obsidian automatically unregisters commands registered via `this.addCommand()`.

### registerRecipeCommands()

Iterates `settings.recipes` and calls `this.addCommand()` for each:
- ID: `dispatch:${recipe.id}`
- Name: `Dispatch: ${recipe.name}`

### Command Execution Flow

1. User triggers command from palette
2. Find matching recipe by ID
3. Check if file-dependent variables are needed - if so, verify active file exists (abort with Notice if not)
4. Resolve all template variables from current context
5. If `{{input}}` is in the template, show InputModal (abort if cancelled)
6. Render the command string (replace all `{{variables}}`)
7. Execute via the recipe's dispatch method
8. If `focusTerminal` is true, activate the terminal app
9. Show success/error Notice

### Settings Changes

Recipe changes require plugin reload to update command palette. Show a Notice after saving: "Reload plugin to update commands." This is the simplest correct approach - avoids relying on undocumented Obsidian internals.

## Verification

1. `pnpm --filter obsidian-dispatch build` succeeds
2. Symlink to vault, enable plugin in Obsidian
3. Open a note, trigger "Dispatch: Send to Claude Code" from command palette
4. Verify modal appears for `{{input}}`
5. Verify sesh connect command executes with correct file path
6. Add a new recipe in settings, verify it appears after reload
7. Test exec and applescript dispatch methods
8. Test terminal focus activation
9. Test with no active file - verify warning Notice
