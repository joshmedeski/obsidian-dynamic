import { requestUrl } from 'obsidian';
import type { MBSearchResponse, SearchResult } from './types';

const USER_AGENT = 'ObsidianMusicCollector/1.0.0 (obsidian-music-collector)';
const API_BASE = 'https://musicbrainz.org/ws/2';
const COVER_ART_BASE = 'https://coverartarchive.org/release-group';
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

async function checkCoverArt(mbid: string): Promise<string | null> {
  const url = `${COVER_ART_BASE}/${mbid}/front-250`;
  try {
    await requestUrl({ url, method: 'HEAD' });
    return url;
  } catch {
    return null;
  }
}

function joinArtistCredits(
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
