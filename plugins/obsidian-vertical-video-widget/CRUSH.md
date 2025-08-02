# CRUSH.md - Obsidian Plugin Development Guide

## Build Commands
- `npm run dev` - Development build with watch mode
- `npm run build` - Production build with TypeScript check
- `npm run version` - Bump version and update manifest

## Linting & Type Checking
- TypeScript check: `tsc -noEmit -skipLibCheck`
- ESLint: `npx eslint main.ts` (no npm script defined)

## Code Style Guidelines

### Imports
- Import from 'obsidian' package for all Obsidian APIs
- Use destructured imports: `import { App, Plugin, Notice } from 'obsidian'`

### Naming Conventions
- Classes: PascalCase (e.g., `MyPlugin`, `SampleModal`)
- Interfaces: PascalCase with descriptive names (e.g., `MyPluginSettings`)
- Variables/functions: camelCase
- Constants: UPPER_SNAKE_CASE (e.g., `DEFAULT_SETTINGS`)

### TypeScript
- Use strict TypeScript settings (noImplicitAny, strictNullChecks enabled)
- Define interfaces for settings and data structures
- Use async/await for asynchronous operations
- Target ES6, use ESNext modules

### Plugin Structure
- Extend `Plugin` class for main plugin
- Implement `onload()` and `onunload()` lifecycle methods
- Use `loadSettings()` and `saveSettings()` for persistence
- Create separate classes for modals and settings tabs

### Error Handling
- Use try/catch for async operations
- Show user-friendly notices with `new Notice()`
- Log errors to console for debugging