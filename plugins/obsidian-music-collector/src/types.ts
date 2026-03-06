export interface MBArtistCredit {
  name: string;
  joinphrase?: string;
  artist: { id: string; name: string };
}

export interface MBReleaseGroup {
  id: string;
  title: string;
  'primary-type': string;
  'first-release-date': string;
  'artist-credit': MBArtistCredit[];
}

export interface MBSearchResponse {
  'release-groups': MBReleaseGroup[];
  'release-group-count': number;
}

export interface SearchResult {
  mbid: string;
  title: string;
  artist: string;
  primaryType: string;
  firstReleaseDate: string;
  coverArtUrl: string | null;
}

export interface MusicCollectorSettings {
  outputFolder: string;
}

export const DEFAULT_SETTINGS: MusicCollectorSettings = {
  outputFolder: 'Music',
};
