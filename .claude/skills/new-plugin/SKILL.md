---
name: new-plugin
description: Use when creating a new Obsidian plugin in the monorepo. Scaffolds all required files with Vite build, installs dependencies, and symlinks to vault for development.
---

# New Obsidian Plugin

Scaffold a new Obsidian plugin in the monorepo at `plugins/<name>/` with all required files, dependencies, and vault symlink.

## Workflow

### Step 1: Gather Inputs

Use AskUserQuestion to collect:
- **Plugin name** (kebab-case, prefix with `obsidian-` if not already)
- **Short description** (one sentence for manifest.json)

### Step 2: Create Files

Create all files under `plugins/<name>/`:

```
plugins/<name>/
  src/
    main.ts
  public/
    manifest.json
    styles.css
  package.json
  tsconfig.json
  vite.config.ts
```

### Step 3: File Templates

**Derive these values from the plugin name:**
- `<name>`: the kebab-case plugin name (e.g. `obsidian-my-plugin`)
- `<ClassName>`: PascalCase without "obsidian" prefix + "Plugin" suffix (e.g. `obsidian-my-plugin` -> `MyPlugin`)
- `<Display Name>`: Title case without "obsidian-" prefix (e.g. `obsidian-my-plugin` -> `My Plugin`)

#### `package.json`

```json
{
  "name": "<name>",
  "private": true,
  "scripts": {
    "build": "vite build --mode production",
    "dev": "vite build --watch --mode development"
  },
  "devDependencies": {
    "@types/node": "catalog:",
    "obsidian": "catalog:",
    "obsidian-vite-config": "workspace:*",
    "tslib": "catalog:",
    "typescript": "catalog:",
    "vite": "catalog:"
  }
}
```

#### `vite.config.ts`

```ts
import { createObsidianViteConfig } from 'obsidian-vite-config';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) =>
  createObsidianViteConfig({ prod: mode === 'production' })
);
```

#### `tsconfig.json`

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "inlineSourceMap": true,
    "inlineSources": true,
    "module": "ESNext",
    "target": "ES6",
    "allowJs": true,
    "noImplicitAny": true,
    "moduleResolution": "node",
    "importHelpers": true,
    "isolatedModules": true,
    "strictNullChecks": true,
    "lib": ["DOM", "ES5", "ES6", "ES7"]
  },
  "include": ["**/*.ts"],
  "types": ["obsidian-typings"]
}
```

#### `src/main.ts`

```ts
import { Plugin } from 'obsidian';

export default class <ClassName> extends Plugin {
  async onload() {
    // Plugin loaded
  }

  onunload() {
    // Cleanup
  }
}
```

#### `public/manifest.json`

```json
{
  "id": "<name>",
  "name": "<Display Name>",
  "version": "1.0.0",
  "minAppVersion": "0.15.0",
  "description": "<description>",
  "author": "Josh Medeski",
  "authorUrl": "https://www.joshmedeski.com",
  "fundingUrl": "https://www.joshmedeski.com",
  "isDesktopOnly": false
}
```

#### `public/styles.css`

```css
/* <Display Name> Styles */
```

### Step 4: Create Vault Folder and Symlink

Create the vault plugin folder (the real directory), then symlink the plugin's `build/` to it so vite writes output directly into the vault:

```bash
mkdir -p ~/c/second-brain/.obsidian/plugins/<name>
ln -s ~/c/second-brain/.obsidian/plugins/<name> /Users/joshmedeski/c/ob/main/plugins/<name>/build
```

### Step 5: Install and Build

Run from the monorepo root (`/Users/joshmedeski/c/ob/main/`):

```bash
pnpm install
pnpm --filter <name> build
```

### Step 6: Confirm

Report to the user:
- Files created
- Build succeeded
- Symlink created
- Next steps: run `pnpm --filter <name> dev` to start development
