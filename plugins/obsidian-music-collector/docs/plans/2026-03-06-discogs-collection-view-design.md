# Discogs Collection View — Design

## Overview

A custom full-tab view showing the user's Discogs record collection as a grid, cross-referenced with Obsidian vault notes. Clicking an unimported record pre-fills the existing MusicBrainz search modal to create a note with accurate metadata.

MusicBrainz remains the sole metadata source. Discogs serves as a collection inventory.

## User Workflow

1. Configure Discogs username and personal access token in settings
2. Open the "Discogs Collection" view via command palette
3. View collection as a grid of album covers with artist/title
4. Filter by: **All** | **In Vault** | **Not in Vault**
5. Click an unimported record — MusicBrainz search modal opens pre-filled with "artist - title"
6. Pick the correct MusicBrainz match, note is created as usual
7. Record now shows a checkmark badge in the grid

## Architecture

### New Files

- `src/discogs.ts` — API client (fetch collection pages, types)
- `src/DiscogsCollectionView.ts` — Obsidian `ItemView` subclass
- `src/DiscogsCollection.svelte` — Grid UI with filter tabs

### Modified Files

- `src/types.ts` — Add `DiscogsRelease` interface, extend `MusicCollectorSettings`
- `src/store.ts` — Add Discogs collection state
- `src/main.ts` — Register view, add command, pass pre-fill to MusicBrainz modal
- `src/MusicSearchModal.ts` — Accept optional initial search query
- `src/SettingsTab.svelte` — Add Discogs token and username fields

### Data Flow

```
Discogs API → discogs.ts → store (cached releases)
                               ↓
                    DiscogsCollection.svelte (grid)
                               ↓
                    Cross-ref with vault note filenames/frontmatter
                               ↓ (click unimported)
                    MusicSearchModal (pre-filled query)
                               ↓
                    noteCreator.ts (existing flow)
```

### Discogs API

- Auth: `Authorization: Discogs token=<personal_access_token>`
- Endpoint: `GET /users/{username}/collection/folders/0/releases?page=1&per_page=100`
- Rate limit: 60 req/min (authenticated)
- Paginate through all pages on initial load, cache in memory
- Response includes: basic_information.title, basic_information.artists, basic_information.cover_image, basic_information.year, basic_information.id

### DiscogsRelease Interface

```typescript
interface DiscogsRelease {
  id: number;
  title: string;
  artist: string;
  year: number;
  coverImageUrl: string;
  discogsUrl: string;
}
```

### Vault Cross-Reference

Match Discogs releases to vault notes by checking existing notes in the output folder. Compare against frontmatter `title` + `artist` fields, falling back to filename pattern matching.

### Settings Additions

- `discogsToken: string` — Personal access token (rendered as password input)
- `discogsUsername: string` — Discogs profile username

### View Registration

- View type ID: `discogs-collection`
- Command: "Open Discogs Collection"
- Opens as a full tab in the main editor area

### Filter Tabs

Three tabs at the top of the grid view:
- **All** — Every release in the Discogs collection
- **In Vault** — Only releases that have matching notes
- **Not in Vault** — Only releases missing from the vault

### Scope Boundaries

- No OAuth flow — personal access token only
- No syncing/auto-import — always manual via MusicBrainz modal
- No editing Discogs data — read-only collection view
- No Discogs search — only fetching the user's existing collection
