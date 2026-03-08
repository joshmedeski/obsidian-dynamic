import { writable, get } from 'svelte/store';
import type { DiscogsRelease, MBMatch, MBMatchMap, MBReleaseGroup } from './types';
import { searchReleaseGroupsLight, checkCoverArt, joinArtistCredits } from './musicbrainz';

export interface MBScanState {
  status: 'idle' | 'scanning' | 'stopped';
  processed: number;
  total: number;
  currentRelease: string;
  currentReleaseId: number | null;
}

export const mbMatches = writable<MBMatchMap>({});
export const mbScanState = writable<MBScanState>({
  status: 'idle',
  processed: 0,
  total: 0,
  currentRelease: '',
  currentReleaseId: null,
});

let abortFlag = false;

function normalize(s: string): string {
  return s.toLowerCase().replace(/^the\s+/, '').trim();
}

function scoreString(candidate: string, target: string): number {
  const a = normalize(candidate);
  const b = normalize(target);
  if (a === b) return 1.0;
  if (a.includes(b) || b.includes(a)) return 0.5;
  return 0;
}

function scoreCandidates(
  candidates: MBReleaseGroup[],
  targetArtist: string,
  targetTitle: string
): { group: MBReleaseGroup; score: number } | null {
  const validTypes = new Set(['Album', 'EP']);
  let best: { group: MBReleaseGroup; score: number } | null = null;

  for (const rg of candidates) {
    const primaryType = rg['primary-type'] ?? '';
    if (primaryType && !validTypes.has(primaryType)) continue;

    const artist = joinArtistCredits(rg['artist-credit']);
    const artistScore = scoreString(artist, targetArtist);
    const titleScore = scoreString(rg.title, targetTitle);
    const total = artistScore + titleScore;

    if (total >= 1.0 && (!best || total > best.score)) {
      best = { group: rg, score: total };
    }
  }

  return best;
}

export async function startScan(
  releases: DiscogsRelease[],
  saveFn: (matches: MBMatchMap) => Promise<void>
) {
  abortFlag = false;
  const currentMatches = get(mbMatches);
  const unmatched = releases
    .filter((r) => !currentMatches[r.id])
    .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime());

  mbScanState.set({
    status: 'scanning',
    processed: 0,
    total: unmatched.length,
    currentRelease: '',
  });

  let saveCounter = 0;

  for (const release of unmatched) {
    if (abortFlag) {
      mbScanState.update((s) => ({ ...s, status: 'stopped' }));
      return;
    }

    mbScanState.update((s) => ({
      ...s,
      currentRelease: `${release.artist} - ${release.title}`,
      currentReleaseId: release.id,
    }));

    try {
      const query = `${release.artist} ${release.title}`;
      const candidates = await searchReleaseGroupsLight(query);
      const best = scoreCandidates(candidates, release.artist, release.title);

      if (best) {
        const coverArtUrl = await checkCoverArt(best.group.id);
        const match: MBMatch = {
          mbid: best.group.id,
          title: best.group.title,
          artist: joinArtistCredits(best.group['artist-credit']),
          primaryType: best.group['primary-type'] ?? 'Other',
          firstReleaseDate: best.group['first-release-date'] ?? '',
          coverArtUrl,
          matchedAt: Date.now(),
        };
        mbMatches.update((m) => ({ ...m, [release.id]: match }));
        saveCounter++;
      }
    } catch {
      // Skip failures silently, continue scanning
    }

    mbScanState.update((s) => ({ ...s, processed: s.processed + 1 }));

    if (saveCounter >= 5) {
      await saveFn(get(mbMatches));
      saveCounter = 0;
    }
  }

  // Final save
  await saveFn(get(mbMatches));
  mbScanState.update((s) => ({ ...s, status: 'idle', currentRelease: '', currentReleaseId: null }));
}

export function stopScan() {
  abortFlag = true;
}
