import { requestUrl } from 'obsidian';
import type {
  DiscogsCollectionItem,
  DiscogsCollectionResponse,
  DiscogsRelease,
} from './types';

const API_BASE = 'https://api.discogs.com';

function joinArtists(artists: { name: string; join: string }[]): string {
  return artists
    .map((a) => a.name.replace(/ \(\d+\)$/, '') + (a.join ? ` ${a.join} ` : ''))
    .join('')
    .trim();
}

function toDiscogsRelease(item: DiscogsCollectionItem): DiscogsRelease {
  const info = item.basic_information;
  return {
    id: info.id,
    title: info.title,
    artist: joinArtists(info.artists),
    year: info.year,
    coverImageUrl: info.cover_image,
    discogsUrl: `https://www.discogs.com/release/${info.id}`,
  };
}

export async function fetchDiscogsCollection(
  username: string,
  token: string,
): Promise<DiscogsRelease[]> {
  const releases: DiscogsRelease[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const url = `${API_BASE}/users/${encodeURIComponent(username)}/collection/folders/0/releases?page=${page}&per_page=100&sort=artist&sort_order=asc`;
    const response = await requestUrl({
      url,
      headers: {
        Authorization: `Discogs token=${token}`,
        'User-Agent': 'ObsidianMusicCollector/1.0.0',
      },
    });
    const data: DiscogsCollectionResponse = response.json;
    totalPages = data.pagination.pages;
    releases.push(...data.releases.map(toDiscogsRelease));
    page++;
  }

  return releases;
}
