import { requestUrl } from 'obsidian';
import type {
  MBReleaseGroup,
  MBReleaseVersion,
  MBSearchResponse,
  SearchResult,
} from './types';

const USER_AGENT = 'ObsidianMusicCollector/1.0.0 (obsidian-music-collector)';
const API_BASE = 'https://musicbrainz.org/ws/2';
const COVER_ART_BASE = 'https://coverartarchive.org/release-group';
const COVER_ART_RELEASE_BASE = 'https://coverartarchive.org/release';
const RATE_LIMIT_MS = 1100;

let lastRequestTime = 0;

async function rateLimitedRequest(url: string): Promise<any> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < RATE_LIMIT_MS) {
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
  }
  lastRequestTime = Date.now();
  return requestUrl({
    url,
    headers: { 'User-Agent': USER_AGENT, Accept: 'application/json' },
  });
}

export async function checkCoverArt(mbid: string): Promise<string | null> {
  const url = `${COVER_ART_BASE}/${mbid}/front-250`;
  try {
    await requestUrl({ url, method: 'HEAD' });
    return url;
  } catch {
    return null;
  }
}

export async function checkReleaseCoverArt(
  releaseId: string
): Promise<string | null> {
  const url = `${COVER_ART_RELEASE_BASE}/${releaseId}/front-250`;
  try {
    await requestUrl({ url, method: 'HEAD' });
    return url;
  } catch {
    return null;
  }
}

export function joinArtistCredits(
  credits: { name: string; joinphrase?: string }[]
): string {
  return credits.map((c) => c.name + (c.joinphrase ?? '')).join('');
}

export async function searchReleaseGroups(
  query: string
): Promise<SearchResult[]> {
  if (!query.trim()) return [];

  const encodedQuery = encodeURIComponent(query);
  const url = `${API_BASE}/release-group/?query=${encodedQuery}&limit=20&fmt=json`;

  const response = await rateLimitedRequest(url);
  const data: MBSearchResponse = response.json;
  const releaseGroups = data['release-groups'] ?? [];

  const results: SearchResult[] = await Promise.all(
    releaseGroups.map(async (rg) => {
      const coverArtUrl = await checkCoverArt(rg.id);
      return {
        mbid: rg.id,
        title: rg.title,
        artist: joinArtistCredits(rg['artist-credit']),
        primaryType: rg['primary-type'] ?? 'Other',
        firstReleaseDate: rg['first-release-date'] ?? '',
        coverArtUrl,
      };
    })
  );

  return results;
}

interface MBRawRelease {
  id: string;
  title?: string;
  date?: string;
  country?: string;
  barcode?: string;
  status?: string;
  disambiguation?: string;
  'label-info'?: {
    'catalog-number'?: string;
    label?: { name?: string };
  }[];
  media?: { format?: string; 'track-count'?: number }[];
}

function toReleaseVersion(release: MBRawRelease): MBReleaseVersion {
  const labelInfo = release['label-info'] ?? [];
  const label = labelInfo.find((li) => li.label?.name)?.label?.name ?? '';
  const catalogNumber =
    labelInfo.find((li) => li['catalog-number'])?.['catalog-number'] ?? '';
  const media = release.media ?? [];
  const formats = [...new Set(media.map((m) => m.format).filter(Boolean))];
  const format = formats.join(' + ');
  const trackCount = media.reduce((sum, m) => sum + (m['track-count'] ?? 0), 0);

  return {
    id: release.id,
    title: release.title ?? '',
    date: release.date ?? '',
    country: release.country ?? '',
    label,
    catalogNumber,
    format,
    barcode: release.barcode ?? '',
    trackCount,
    disambiguation: release.disambiguation ?? '',
    status: release.status ?? '',
  };
}

export async function fetchReleaseVersions(
  releaseGroupMbid: string
): Promise<MBReleaseVersion[]> {
  const url = `${API_BASE}/release?release-group=${releaseGroupMbid}&inc=labels+media&fmt=json&limit=100`;
  const response = await rateLimitedRequest(url);
  const releases: MBRawRelease[] = response.json?.releases ?? [];
  return releases.map(toReleaseVersion);
}

export async function searchReleaseGroupsLight(
  query: string
): Promise<MBReleaseGroup[]> {
  if (!query.trim()) return [];

  const encodedQuery = encodeURIComponent(query);
  const url = `${API_BASE}/release-group/?query=${encodedQuery}&limit=5&fmt=json`;

  const response = await rateLimitedRequest(url);
  const data: MBSearchResponse = response.json;
  return data['release-groups'] ?? [];
}
