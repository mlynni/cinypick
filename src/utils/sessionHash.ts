import { MovieItem, StreamingProviderId } from '../types/movie';
import {
  createCustomMovieItem,
  fetchMovieByTmdbId,
  resolveCrossPlatformRatings,
  TMDB_IMAGE_BASE_BACKDROP,
  TMDB_IMAGE_BASE_POSTER,
} from '../services/tmdbService';

/**
 * Ultra-short Binary Session Code (`K2.` / `K2Z.`):
 * - Header byte:
 *   bits 0..1 = API Key Mode:
 *     0 = no key
 *     1 = 16-byte raw binary key (32-char lowercase hex TMDb v3 key)
 *     2 = length-prefixed UTF-8 key (for Bearer Read Token or non-hex keys)
 * - API Key bytes (0 bytes, 16 bytes, or [varint len, ...utf8Bytes])
 * - varint(poolCount)
 * - varint(wishlistCount)
 * - For each movie in pool, then wishlist:
 *   - metaByte (1 byte):
 *     bits 0..1 = status (0 = active in roulette, 1 = chosen, 2 = watched)
 *     bits 2..5 = starRating * 2 (0..10, representing 0..5.0 in 0.5 steps)
 *     bit 6     = isCustom (0 = TMDb movie by ID, 1 = custom movie title)
 *   - If isCustom === 0:
 *     varint(tmdbId)  (only 2–4 bytes per movie!)
 *   - If isCustom === 1:
 *     varint(titleBytes.length) + titleBytes + varint(releaseYear)
 */

const PREFIX_K2_RAW = 'K2.';
const PREFIX_K2_DEFLATE = 'K2Z.';
const LEGACY_PREFIX_COMPRESSED = 'KR1.';
const LEGACY_PREFIX_RAW = 'KR0.';

function writeVarint(out: number[], value: number): void {
  let v = Math.max(0, Math.floor(value)) >>> 0;
  while (v >= 0x80) {
    out.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  out.push(v);
}

function readVarint(
  bytes: Uint8Array,
  offset: number
): { value: number; nextOffset: number } {
  let result = 0;
  let shift = 0;
  let pos = offset;
  while (pos < bytes.length) {
    const byte = bytes[pos++];
    result |= (byte & 0x7f) << shift;
    if ((byte & 0x80) === 0) {
      return { value: result >>> 0, nextOffset: pos };
    }
    shift += 7;
    if (shift > 35) {
      throw new Error('Malformed varint');
    }
  }
  throw new Error('Unexpected end of buffer while reading varint');
}

function isHex32(str: string): boolean {
  return /^[0-9a-fA-F]{32}$/.test(str);
}

function hex32ToBytes(hex: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < 32; i += 2) {
    out.push(parseInt(hex.slice(i, i + 2), 16));
  }
  return out;
}

function bytesToHex32(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toLowerCase();
}

function encodeMovieBinary(out: number[], movie: MovieItem): void {
  const statusBits = movie.isChosen ? 1 : movie.isWatched ? 2 : 0;
  const ratingHalfSteps =
    typeof movie.userRating === 'number' && movie.userRating > 0
      ? Math.min(10, Math.max(0, Math.round(movie.userRating * 2)))
      : 0;
  const isCustom =
    movie.id.startsWith('custom-') || !movie.tmdbId || movie.tmdbId <= 0;

  const metaByte =
    (statusBits & 0x03) |
    ((ratingHalfSteps & 0x0f) << 2) |
    (isCustom ? 0x40 : 0);

  out.push(metaByte);

  if (!isCustom) {
    writeVarint(out, movie.tmdbId);
  } else {
    const title = (movie.titleUk || movie.titleEn || movie.title || 'Movie').trim();
    const titleBytes = new TextEncoder().encode(title);
    writeVarint(out, titleBytes.length);
    for (let i = 0; i < titleBytes.length; i++) {
      out.push(titleBytes[i]);
    }
    writeVarint(out, movie.releaseYear || 2024);
  }
}

interface DecodedCompactItem {
  isCustom: boolean;
  tmdbId: number;
  customTitle?: string;
  customYear?: number;
  statusFlag: number; // 0 = active, 1 = chosen, 2 = watched
  userRating?: number;
}

function decodeMovieBinary(
  bytes: Uint8Array,
  offset: number
): { item: DecodedCompactItem; nextOffset: number } {
  if (offset >= bytes.length) {
    throw new Error('Unexpected end of movie buffer');
  }
  const metaByte = bytes[offset++];
  const statusFlag = metaByte & 0x03;
  const ratingHalfSteps = (metaByte >>> 2) & 0x0f;
  const isCustom = (metaByte & 0x40) !== 0;
  const userRating = ratingHalfSteps > 0 ? ratingHalfSteps / 2 : undefined;

  if (!isCustom) {
    const { value: tmdbId, nextOffset } = readVarint(bytes, offset);
    return {
      item: {
        isCustom: false,
        tmdbId,
        statusFlag,
        userRating,
      },
      nextOffset,
    };
  } else {
    const { value: titleLen, nextOffset: afterLen } = readVarint(bytes, offset);
    const titleSlice = bytes.slice(afterLen, afterLen + titleLen);
    const customTitle = new TextDecoder().decode(titleSlice);
    const { value: customYear, nextOffset } = readVarint(
      bytes,
      afterLen + titleLen
    );
    return {
      item: {
        isCustom: true,
        tmdbId: 0,
        customTitle,
        customYear,
        statusFlag,
        userRating,
      },
      nextOffset,
    };
  }
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
  wishlistMovies: MovieItem[],
  apiKey?: string
): Promise<string> {
  const out: number[] = [];
  const trimmedKey = (apiKey || '').trim();

  if (!trimmedKey) {
    out.push(0); // Mode 0: no API key
  } else if (isHex32(trimmedKey)) {
    out.push(1); // Mode 1: 16-byte raw binary hex key
    out.push(...hex32ToBytes(trimmedKey));
  } else {
    out.push(2); // Mode 2: length-prefixed UTF-8 key
    const keyBytes = new TextEncoder().encode(trimmedKey);
    writeVarint(out, keyBytes.length);
    for (let i = 0; i < keyBytes.length; i++) {
      out.push(keyBytes[i]);
    }
  }

  writeVarint(out, myMovies.length);
  writeVarint(out, wishlistMovies.length);

  for (const movie of myMovies) {
    encodeMovieBinary(out, movie);
  }
  for (const movie of wishlistMovies) {
    encodeMovieBinary(out, movie);
  }

  const rawBuffer = new ArrayBuffer(out.length);
  const rawBytes = new Uint8Array(rawBuffer);
  rawBytes.set(out);

  // Pick deflate-raw only if it actually produces a shorter string than raw binary
  if (typeof CompressionStream !== 'undefined' && rawBytes.length > 48) {
    try {
      const cs = new CompressionStream('deflate-raw');
      const writer = cs.writable.getWriter();
      writer.write(rawBytes);
      writer.close();
      const compressedAb = await new Response(cs.readable).arrayBuffer();
      const compressedBytes = new Uint8Array(compressedAb);
      if (compressedBytes.length + 1 < rawBytes.length) {
        return PREFIX_K2_DEFLATE + bytesToBase64Url(compressedBytes);
      }
    } catch {
      // Fallback to raw binary K2.
    }
  }

  return PREFIX_K2_RAW + bytesToBase64Url(rawBytes);
}

async function hydrateCompactItems(
  items: DecodedCompactItem[],
  effectiveApiKey: string
): Promise<MovieItem[]> {
  return Promise.all(
    items.map(async (entry): Promise<MovieItem> => {
      const isChosen = entry.statusFlag === 1;
      const isWatched = entry.statusFlag === 2;
      const excludeFromRoulette = isChosen || isWatched;

      if (entry.isCustom) {
        const custom = createCustomMovieItem(
          entry.customTitle || 'Movie',
          entry.customYear || 2024
        );
        return {
          ...custom,
          isChosen,
          isWatched,
          excludeFromRoulette,
          userRating: entry.userRating,
        };
      }

      const fetched = await fetchMovieByTmdbId(entry.tmdbId, effectiveApiKey);
      if (fetched) {
        return {
          ...fetched,
          isChosen,
          isWatched,
          excludeFromRoulette,
          userRating: entry.userRating,
        };
      }

      // Fallback if offline or no API key available
      const ratings = resolveCrossPlatformRatings(entry.tmdbId, 7.2, 500);
      return {
        id: `tmdb-${entry.tmdbId}`,
        tmdbId: entry.tmdbId,
        imdbId: ratings.imdb.imdbId || `tt${entry.tmdbId}`,
        titleUk: `TMDb #${entry.tmdbId}`,
        titleEn: `TMDb #${entry.tmdbId}`,
        releaseYear: 2024,
        runtime: 120,
        genresUk: ['Кіно'],
        genresEn: ['Movie'],
        directorUk: 'TMDb',
        directorEn: 'TMDb',
        castUk: [],
        castEn: [],
        overviewUk: 'Опис із бази The Movie Database (TMDb).',
        overviewEn: 'Overview from The Movie Database (TMDb).',
        posterPath: '',
        backdropPath: '',
        trailerYoutubeKey: '',
        ratings,
        streamingProviders: ['netflix', 'megogo', 'apple'],
        isChosen,
        isWatched,
        excludeFromRoulette,
        userRating: entry.userRating,
      };
    })
  );
}

export async function decodeSessionHash(
  rawInput: string,
  fallbackApiKey?: string
): Promise<{
  myMovies: MovieItem[];
  wishlistMovies: MovieItem[];
  apiKey?: string;
}> {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    throw new Error('Empty session code');
  }

  // New ultra-short binary format: K2. or K2Z.
  if (
    trimmed.startsWith(PREFIX_K2_RAW) ||
    trimmed.startsWith(PREFIX_K2_DEFLATE)
  ) {
    let bytes: Uint8Array;
    if (trimmed.startsWith(PREFIX_K2_DEFLATE)) {
      const compressedBytes = base64UrlToBytes(
        trimmed.slice(PREFIX_K2_DEFLATE.length)
      );
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(compressedBytes);
      writer.close();
      const decompressedBuffer = await new Response(ds.readable).arrayBuffer();
      bytes = new Uint8Array(decompressedBuffer);
    } else {
      bytes = base64UrlToBytes(trimmed.slice(PREFIX_K2_RAW.length));
    }

    let offset = 0;
    const header = bytes[offset++];
    const keyMode = header & 0x03;

    let embeddedKey = '';
    if (keyMode === 1) {
      const keySlice = bytes.slice(offset, offset + 16);
      offset += 16;
      embeddedKey = bytesToHex32(keySlice);
    } else if (keyMode === 2) {
      const { value: keyLen, nextOffset } = readVarint(bytes, offset);
      const keySlice = bytes.slice(nextOffset, nextOffset + keyLen);
      offset = nextOffset + keyLen;
      embeddedKey = new TextDecoder().decode(keySlice);
    }

    const { value: poolCount, nextOffset: afterPoolCount } = readVarint(
      bytes,
      offset
    );
    offset = afterPoolCount;

    const { value: wishlistCount, nextOffset: afterWishCount } = readVarint(
      bytes,
      offset
    );
    offset = afterWishCount;

    const poolItems: DecodedCompactItem[] = [];
    for (let i = 0; i < poolCount; i++) {
      const { item, nextOffset } = decodeMovieBinary(bytes, offset);
      poolItems.push(item);
      offset = nextOffset;
    }

    const wishlistItems: DecodedCompactItem[] = [];
    for (let i = 0; i < wishlistCount; i++) {
      const { item, nextOffset } = decodeMovieBinary(bytes, offset);
      wishlistItems.push(item);
      offset = nextOffset;
    }

    const effectiveApiKey = (embeddedKey || fallbackApiKey || '').trim();
    const [myMovies, wishlistMovies] = await Promise.all([
      hydrateCompactItems(poolItems, effectiveApiKey),
      hydrateCompactItems(wishlistItems, effectiveApiKey),
    ]);

    return {
      myMovies,
      wishlistMovies,
      apiKey: embeddedKey || undefined,
    };
  }

  // Backward compatibility for legacy KR1. / KR0. codes
  let jsonString = '';
  if (trimmed.startsWith(LEGACY_PREFIX_COMPRESSED)) {
    const body = trimmed.slice(LEGACY_PREFIX_COMPRESSED.length);
    const compressedBytes = base64UrlToBytes(body);
    const ds = new DecompressionStream('deflate-raw');
    const writer = ds.writable.getWriter();
    writer.write(compressedBytes);
    writer.close();
    const decompressedBuffer = await new Response(ds.readable).arrayBuffer();
    jsonString = new TextDecoder().decode(decompressedBuffer);
  } else if (trimmed.startsWith(LEGACY_PREFIX_RAW)) {
    const body = trimmed.slice(LEGACY_PREFIX_RAW.length);
    const bytes = base64UrlToBytes(body);
    jsonString = new TextDecoder().decode(bytes);
  } else {
    throw new Error('Invalid prefix');
  }

  const parsed = JSON.parse(jsonString);
  if (
    !parsed ||
    parsed.v !== 1 ||
    !Array.isArray(parsed.p) ||
    !Array.isArray(parsed.w)
  ) {
    throw new Error('Invalid session payload');
  }

  const mapLegacyTuple = (tuple: any[]): MovieItem => {
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
    const restorePrefix = (slug: string, prefix: string) =>
      !slug
        ? ''
        : slug.startsWith('http')
        ? slug
        : `${prefix}${slug.startsWith('/') ? slug : `/${slug}`}`;

    return {
      id: id || `tmdb-${tmdbId}`,
      tmdbId: tmdbId || 0,
      imdbId: ratings.imdb.imdbId || `tt${tmdbId}`,
      titleUk: titleUk || titleEn || 'Без назви',
      titleEn: titleEn || titleUk || 'Untitled',
      originalTitle: titleEn || titleUk,
      releaseYear: releaseYear || 2024,
      runtime: runtime || 120,
      genresUk:
        Array.isArray(genresUk) && genresUk.length > 0 ? genresUk : ['Кіно'],
      genresEn:
        Array.isArray(genresEn) && genresEn.length > 0 ? genresEn : ['Movie'],
      directorUk: 'TMDb',
      directorEn: 'TMDb',
      castUk: [],
      castEn: [],
      overviewUk: 'Опис із бази The Movie Database (TMDb).',
      overviewEn: 'Overview from The Movie Database (TMDb).',
      posterPath: restorePrefix(posterSlug, TMDB_IMAGE_BASE_POSTER),
      backdropPath: restorePrefix(backdropSlug, TMDB_IMAGE_BASE_BACKDROP),
      trailerYoutubeKey: trailerYoutubeKey || '',
      ratings,
      streamingProviders: ['netflix', 'megogo', 'apple'] as StreamingProviderId[],
      isChosen,
      isWatched,
      excludeFromRoulette: isChosen || isWatched,
      userRating: userRating && userRating > 0 ? userRating : undefined,
    };
  };

  return {
    myMovies: parsed.p.map(mapLegacyTuple),
    wishlistMovies: parsed.w.map(mapLegacyTuple),
  };
}
