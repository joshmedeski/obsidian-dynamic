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

export interface DiscogsArtist {
  name: string;
  id: number;
  join: string;
}

export interface DiscogsBasicInformation {
  id: number;
  title: string;
  year: number;
  thumb: string;
  cover_image: string;
  artists: DiscogsArtist[];
  formats: { name: string; qty: string; descriptions?: string[] }[];
  labels: { name: string; catno: string }[];
  genres: string[];
  styles: string[];
  resource_url: string;
}

export interface DiscogsCollectionItem {
  id: number;
  instance_id: number;
  date_added: string;
  rating: number;
  basic_information: DiscogsBasicInformation;
}

export interface DiscogsCollectionResponse {
  pagination: {
    page: number;
    pages: number;
    per_page: number;
    items: number;
  };
  releases: DiscogsCollectionItem[];
}

export interface DiscogsRelease {
  id: number;
  title: string;
  artist: string;
  year: number;
  coverImageUrl: string;
  discogsUrl: string;
}

export interface DiscogsCache {
  releases: DiscogsRelease[];
  lastFetched: number; // Unix timestamp ms
}

export interface MusicCollectorSettings {
  outputFolder: string;
  templatePath: string;
  filenameFormat: string;
  discogsToken: string;
  discogsUsername: string;
  cacheTTLMinutes: number;
}

export const DEFAULT_SETTINGS: MusicCollectorSettings = {
  outputFolder: 'Music',
  templatePath: '',
  filenameFormat: '{{artist}} - {{title}}',
  discogsToken: '',
  discogsUsername: '',
  cacheTTLMinutes: 60,
};
