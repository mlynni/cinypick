import { MovieItem, StreamingProviderId } from '../types/movie';
import {
  resolveCrossPlatformRatings,
  TMDB_IMAGE_BASE_BACKDROP,
  TMDB_IMAGE_BASE_POSTER,
} from '../services/tmdbService';

/**
 * Compact tuple representation of a MovieItem for Session Hash serialization:
 * [
 *   0: id (string),
 *   1: tmdbId (number),
 *   2: titleUk (string),
 *   3: titleEn (string),
 *   4: releaseYear (number),
 *   5: posterSlug (string),
 *   6: backdropSlug (string),
 *   7: tmdbScore (number),
 *   8: tmdbVoteCount (number),
 *   9: statusFlag (0 = active, 1 = chosen, 2 = watched),
 *   10: userRating (number | 0),
 *   11: genresUk (string[]),
 *   12: genresEn (string[]),
 *   13: runtime (number),
 *   14: trailerYoutubeKey (string)
 * ]
 */
type CompactMovieTuple = [
  string,
  number,
  string,
  string,
  number,
  string,
  string,
  number,
  number,
  number,
  number,
  string[],
  string[],
  number,
  string,
];

interface CompactSessionPayload {
  v: 1;
  p: CompactMovieTuple[]; // Pool (myMovies)
  w: CompactMovieTuple[]; // Wishlist (wishlistMovies)
}

const HASH_PREFIX_COMPRESSED = 'KR1.';
const HASH_PREFIX_RAW = 'KR0.';

function stripImagePrefix(url: string | undefined, prefix: string): string {
  if (!url) return '';
  if (url.startsWith(prefix)) {
    return url.slice(prefix.length);
  }
  return url;
}

function restoreImagePrefix(slug: string, prefix: string): string {
  if (!slug) return '';
  if (slug.startsWith('http://') || slug.startsWith('https://')) {
    return slug;
  }
  return `${prefix}${slug.startsWith('/') ? slug : `/${slug}`}`;
}

function inferProviders(tmdbId: number): StreamingProviderId[] {
  const all: StreamingProviderId[] = [
    'netflix',
    'apple',
    'megogo',
    'prime',
    'disney',
    'max',
  ];
  const p1 = all[Math.abs(tmdbId) % all.length];
  const p2 = all[(Math.abs(tmdbId) * 3 + 1) % all.length];
  return Array.from(new Set([p1, p2, 'megogo' as StreamingProviderId]));
}

function movieToTuple(movie: MovieItem): CompactMovieTuple {
  const statusFlag = movie.isChosen ? 1 : movie.isWatched ? 2 : 0;
  return [
    movie.id,
    movie.tmdbId || 0,
    movie.titleUk || movie.title || movie.titleEn || '',
    movie.titleEn || movie.originalTitle || movie.titleUk || '',
    movie.releaseYear || 2024,
    stripImagePrefix(movie.posterPath, TMDB_IMAGE_BASE_POSTER),
    stripImagePrefix(movie.backdropPath, TMDB_IMAGE_BASE_BACKDROP),
    Number((movie.ratings?.tmdb?.score || 7.2).toFixed(1)),
    movie.ratings?.tmdb?.voteCount || 500,
    statusFlag,
    typeof movie.userRating === 'number' && movie.userRating > 0
      ? movie.userRating
      : 0,
    Array.isArray(movie.genresUk) ? movie.genresUk.slice(0, 3) : ['Кіно'],
    Array.isArray(movie.genresEn) ? movie.genresEn.slice(0, 3) : ['Movie'],
    movie.runtime || 120,
    movie.trailerYoutubeKey || '',
  ];
}

function tupleToMovie(tuple: CompactMovieTuple): MovieItem {
  const [
    id,
    tmdbId,
    titleUk,
    titleEn,
    releaseYear,
    posterSlug,
    backdropSlug,
    tmdbScore,
    tmdbVoteCount,
    statusFlag,
    userRating,
    genresUk,
    genresEn,
    runtime,
    trailerYoutubeKey,
  ] = tuple;

  const ratings = resolveCrossPlatformRatings(
    tmdbId || 1000,
    tmdbScore || 7.2,
    tmdbVoteCount || 500
  );

  const isChosen = statusFlag === 1;
  const isWatched = statusFlag === 2;

  return {
    id: id || `tmdb-${tmdbId}`,
    tmdbId: tmdbId || 0,
    imdbId: ratings.imdb.imdbId || `tt${tmdbId}`,
    titleUk: titleUk || titleEn || 'Без назви',
    titleEn: titleEn || titleUk || 'Untitled',
    originalTitle: titleEn || titleUk,
    releaseYear: releaseYear || 2024,
    runtime: runtime || 120,
    genresUk: Array.isArray(genresUk) && genresUk.length > 0 ? genresUk : ['Кіно'],
    genresEn:
      Array.isArray(genresEn) && genresEn.length > 0 ? genresEn : ['Movie'],
    directorUk: 'TMDb',
    directorEn: 'TMDb',
    castUk: [],
    castEn: [],
    overviewUk: 'Опис із бази The Movie Database (TMDb).',
    overviewEn: 'Overview from The Movie Database (TMDb).',
    posterPath: restoreImagePrefix(posterSlug, TMDB_IMAGE_BASE_POSTER),
    backdropPath: restoreImagePrefix(backdropSlug, TMDB_IMAGE_BASE_BACKDROP),
    trailerYoutubeKey: trailerYoutubeKey || '',
    ratings,
    streamingProviders: inferProviders(tmdbId || 1000),
    isChosen,
    isWatched,
    excludeFromRoulette: isChosen || isWatched,
    userRating: userRating && userRating > 0 ? userRating : undefined,
  };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64UrlToBytes(b64url: string): Uint8Array<ArrayBuffer> {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = b64.length % 4 === 0 ? '' : '='.repeat(4 - (b64.length % 4));
  const binary = atob(b64 + pad);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function encodeSessionHash(
  myMovies: MovieItem[],
  wishlistMovies: MovieItem[]
): Promise<string> {
  const payload: CompactSessionPayload = {
    v: 1,
    p: myMovies.map(movieToTuple),
    w: wishlistMovies.map(movieToTuple),
  };

  const jsonBytes = new TextEncoder().encode(JSON.stringify(payload));

  if (typeof CompressionStream !== 'undefined') {
    try {
      const cs = new CompressionStream('deflate-raw');
      const writer = cs.writable.getWriter();
      writer.write(jsonBytes);
      writer.close();
      const compressedBuffer = await new Response(cs.readable).arrayBuffer();
      return (
        HASH_PREFIX_COMPRESSED +
        bytesToBase64Url(new Uint8Array(compressedBuffer))
      );
    } catch {
      // Fallback to uncompressed Base64URL if CompressionStream fails
    }
  }

  return HASH_PREFIX_RAW + bytesToBase64Url(jsonBytes);
}

export async function decodeSessionHash(rawInput: string): Promise<{
  myMovies: MovieItem[];
  wishlistMovies: MovieItem[];
}> {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error('Empty session code');
  }

  let jsonString = '';

  if (trimmed.startsWith(HASH_PREFIX_COMPRESSED)) {
    const body = trimmed.slice(HASH_PREFIX_COMPRESSED.length);
    const compressedBytes = base64UrlToBytes(body);
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('DecompressionStream not supported');
    }
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(compressedBytes);
    writer.close();
    const decompressedBuffer = await new Response(ds.readable).arrayBuffer();
    jsonString = new TextDecoder().decode(decompressedBuffer);
  } else if (trimmed.startsWith(HASH_PREFIX_RAW)) {
    const body = trimmed.slice(HASH_PREFIX_RAW.length);
    const bytes = base64UrlToBytes(body);
    jsonString = new TextDecoder().decode(bytes);
  } else {
    throw new Error('Invalid prefix');
  }

  const parsed = JSON.parse(jsonString) as CompactSessionPayload;
  if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.p) || !Array.isArray(parsed.w)) {
    throw new Error('Invalid session payload');
  }

  return {
    myMovies: parsed.p.map(tupleToMovie),
    wishlistMovies: parsed.w.map(tupleToMovie),
  };
}
