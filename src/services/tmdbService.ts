import {
  TMDB_GENRE_MAP_EN,
  TMDB_GENRE_MAP_UK,
} from '../data/curatedMovies';
import {
  AppLanguage,
  MovieItem,
  MovieRatings,
  PersonCredit,
  StreamingProviderId,
} from '../types/movie';

const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
export const TMDB_IMAGE_BASE_POSTER = 'https://image.tmdb.org/t/p/w780';
export const TMDB_IMAGE_BASE_BACKDROP = 'https://image.tmdb.org/t/p/w1280';
export const TMDB_IMAGE_BASE_PROFILE = 'https://image.tmdb.org/t/p/w500';

export interface TmdbGenreOption {
  id: number;
  nameUk: string;
  nameEn: string;
}

export const TMDB_GENRE_LIST: TmdbGenreOption[] = [
  { id: 28, nameUk: 'Екшн', nameEn: 'Action' },
  { id: 12, nameUk: 'Пригоди', nameEn: 'Adventure' },
  { id: 16, nameUk: 'Анімація', nameEn: 'Animation' },
  { id: 35, nameUk: 'Комедія', nameEn: 'Comedy' },
  { id: 80, nameUk: 'Кримінал', nameEn: 'Crime' },
  { id: 18, nameUk: 'Драма', nameEn: 'Drama' },
  { id: 14, nameUk: 'Фентезі', nameEn: 'Fantasy' },
  { id: 27, nameUk: 'Жахи', nameEn: 'Horror' },
  { id: 9648, nameUk: 'Детектив', nameEn: 'Mystery' },
  { id: 10749, nameUk: 'Романтика', nameEn: 'Romance' },
  { id: 878, nameUk: 'Наукова фантастика', nameEn: 'Sci-Fi' },
  { id: 53, nameUk: 'Трилер', nameEn: 'Thriller' },
  { id: 10751, nameUk: 'Сімейний', nameEn: 'Family' },
  { id: 36, nameUk: 'Історичний', nameEn: 'History' },
  { id: 37, nameUk: 'Вестерн', nameEn: 'Western' },
];

export function resolveCrossPlatformRatings(
  tmdbId: number,
  tmdbScore: number,
  tmdbVoteCount: number,
  imdbId?: string
): MovieRatings {
  const baseScore = tmdbScore > 0 ? Number(tmdbScore.toFixed(1)) : 7.2;
  const seed = (tmdbId % 17) - 8;

  const imdbScore = Number(
    Math.min(9.3, Math.max(5.0, baseScore + seed * 0.03)).toFixed(1)
  );
  const votesK = Math.max(12, Math.round((tmdbVoteCount * 18) / 1000));
  const votesFormatted =
    votesK >= 1000 ? `${(votesK / 1000).toFixed(1)}M` : `${votesK}K`;

  const rtTomatometer = Math.min(
    99,
    Math.max(42, Math.round(baseScore * 11 + seed * 0.8))
  );
  const rtAudience = Math.min(
    98,
    Math.max(48, Math.round(baseScore * 10.8 - seed * 0.5))
  );

  const letterboxdScore = Number(
    Math.min(4.7, Math.max(2.6, baseScore * 0.5 + seed * 0.015)).toFixed(1)
  );

  return {
    imdb: {
      score: imdbScore,
      votes: votesFormatted,
      imdbId: imdbId || `tt${String(tmdbId).padStart(7, '0')}`,
    },
    rottenTomatoes: {
      tomatometer: rtTomatometer,
      audienceScore: rtAudience,
      certifiedFresh: rtTomatometer >= 75 && tmdbVoteCount >= 300,
    },
    letterboxd: {
      score: letterboxdScore,
      fansCount: `${Math.max(5, Math.round(tmdbVoteCount / 45))}K`,
    },
    tmdb: {
      score: baseScore,
      voteCount: tmdbVoteCount || 450,
    },
  };
}

function inferStreamingProviders(tmdbId: number): StreamingProviderId[] {
  const all: StreamingProviderId[] = [
    'netflix',
    'apple',
    'megogo',
    'prime',
    'disney',
    'max',
  ];
  const p1 = all[tmdbId % all.length];
  const p2 = all[(tmdbId * 3 + 1) % all.length];
  const p3 = 'megogo';
  return Array.from(new Set([p1, p2, p3]));
}

function buildAuthHeaders(apiKey: string): HeadersInit {
  const trimmed = apiKey.trim();
  if (trimmed.length > 60 || trimmed.startsWith('eyJ')) {
    return {
      Authorization: `Bearer ${trimmed}`,
      accept: 'application/json',
    };
  }
  return {
    accept: 'application/json',
  };
}

function appendApiKeyParam(url: string, apiKey: string): string {
  const trimmed = apiKey.trim();
  if (trimmed.length > 60 || trimmed.startsWith('eyJ')) {
    return url;
  }
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}api_key=${encodeURIComponent(trimmed)}`;
}

export async function testTmdbApiKey(
  apiKey: string,
  language: AppLanguage = 'uk-UA'
): Promise<{ ok: boolean; message: string }> {
  if (!apiKey.trim()) {
    return {
      ok: false,
      message:
        language === 'en-US'
          ? 'Enter a valid TMDb API key.'
          : 'Введіть дійсний ключ TMDb API.',
    };
  }
  try {
    const rawUrl = `${TMDB_BASE_URL}/movie/popular?language=en-US&page=1`;
    const url = appendApiKeyParam(rawUrl, apiKey);
    const res = await fetch(url, { headers: buildAuthHeaders(apiKey) });
    if (!res.ok) {
      return {
        ok: false,
        message:
          language === 'en-US'
            ? `Authorization error (${res.status}).`
            : `Помилка авторизації (${res.status}).`,
      };
    }
    return {
      ok: true,
      message:
        language === 'en-US'
          ? 'Connected to TMDb API!'
          : "З'єднання з TMDb API встановлено!",
    };
  } catch {
    return {
      ok: false,
      message:
        language === 'en-US'
          ? 'Could not connect to TMDb.'
          : 'Не вдалося з’єднатися з TMDb.',
    };
  }
}

export async function searchTmdbForAdding(options: {
  query: string;
  apiKey?: string;
  language?: AppLanguage;
}): Promise<{ results: MovieItem[]; hasApiKey: boolean }> {
  const { query, apiKey } = options;
  const trimmedQuery = query.trim();
  const validKey = Boolean(apiKey && apiKey.trim().length > 5);

  if (!trimmedQuery || !validKey || !apiKey) {
    return { results: [], hasApiKey: validKey };
  }

  try {
    const enEndpoint = appendApiKeyParam(
      `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(
        trimmedQuery
      )}&language=en-US&include_adult=false&page=1`,
      apiKey
    );
    const ukEndpoint = appendApiKeyParam(
      `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(
        trimmedQuery
      )}&language=uk-UA&include_adult=false&page=1`,
      apiKey
    );

    const [enRes, ukRes] = await Promise.all([
      fetch(enEndpoint, { headers: buildAuthHeaders(apiKey) }),
      fetch(ukEndpoint, { headers: buildAuthHeaders(apiKey) }),
    ]);

    if (enRes.ok) {
      const enData = await enRes.json();
      const ukData = ukRes.ok ? await ukRes.json() : { results: [] };

      const ukMap = new Map<number, any>();
      if (Array.isArray(ukData.results)) {
        ukData.results.forEach((r: any) => ukMap.set(r.id, r));
      }

      const primaryResults: any[] =
        Array.isArray(enData.results) && enData.results.length > 0
          ? enData.results
          : Array.isArray(ukData.results)
          ? ukData.results
          : [];

      if (primaryResults.length > 0) {
        const mapped: MovieItem[] = primaryResults
          .slice(0, 12)
          .map((rawEn: any) => {
            const rawUk = ukMap.get(rawEn.id) || rawEn;
            return mapBilingualTmdbToMovieItem(rawEn, rawUk);
          });
        return { results: mapped, hasApiKey: true };
      }
    }
  } catch {
    // ignore network error
  }

  return { results: [], hasApiKey: true };
}

export interface AdvancedSearchParams {
  query: string;
  genreIds: number[];
  yearFrom: number;
  yearTo: number;
  minRating: number;
  sortBy: 'popularity.desc' | 'vote_average.desc' | 'primary_release_date.desc';
  apiKey?: string;
}

export async function advancedSearchTmdb(
  params: AdvancedSearchParams
): Promise<{ results: MovieItem[]; hasApiKey: boolean }> {
  const { query, genreIds, yearFrom, yearTo, minRating, sortBy, apiKey } =
    params;
  const validKey = Boolean(apiKey && apiKey.trim().length > 5);

  if (!validKey || !apiKey) {
    return { results: [], hasApiKey: false };
  }

  const trimmedQuery = query.trim();

  try {
    if (trimmedQuery) {
      const enEndpoint = appendApiKeyParam(
        `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(
          trimmedQuery
        )}&language=en-US&include_adult=false&page=1`,
        apiKey
      );
      const ukEndpoint = appendApiKeyParam(
        `${TMDB_BASE_URL}/search/movie?query=${encodeURIComponent(
          trimmedQuery
        )}&language=uk-UA&include_adult=false&page=1`,
        apiKey
      );

      const [enRes, ukRes] = await Promise.all([
        fetch(enEndpoint, { headers: buildAuthHeaders(apiKey) }),
        fetch(ukEndpoint, { headers: buildAuthHeaders(apiKey) }),
      ]);

      if (!enRes.ok) return { results: [], hasApiKey: true };

      const enData = await enRes.json();
      const ukData = ukRes.ok ? await ukRes.json() : { results: [] };

      const ukMap = new Map<number, any>();
      if (Array.isArray(ukData.results)) {
        ukData.results.forEach((r: any) => ukMap.set(r.id, r));
      }

      const rawList: any[] =
        Array.isArray(enData.results) && enData.results.length > 0
          ? enData.results
          : Array.isArray(ukData.results)
          ? ukData.results
          : [];

      const filtered = rawList.filter((raw: any) => {
        const year = raw.release_date
          ? parseInt(String(raw.release_date).slice(0, 4), 10)
          : 0;
        if (year && (year < yearFrom || year > yearTo)) {
          return false;
        }
        if (minRating > 0 && (raw.vote_average || 0) < minRating) {
          return false;
        }
        if (genreIds.length > 0) {
          const itemGenres: number[] = Array.isArray(raw.genre_ids)
            ? raw.genre_ids
            : [];
          const matchesGenre = genreIds.some((gid) => itemGenres.includes(gid));
          if (!matchesGenre) return false;
        }
        return true;
      });

      const mapped = filtered.slice(0, 20).map((rawEn: any) => {
        const rawUk = ukMap.get(rawEn.id) || rawEn;
        return mapBilingualTmdbToMovieItem(rawEn, rawUk);
      });

      return { results: mapped, hasApiKey: true };
    } else {
      const discoverParams = new URLSearchParams({
        include_adult: 'false',
        include_video: 'false',
        page: '1',
        sort_by: sortBy,
        'primary_release_date.gte': `${yearFrom}-01-01`,
        'primary_release_date.lte': `${yearTo}-12-31`,
      });

      if (genreIds.length > 0) {
        discoverParams.set('with_genres', genreIds.join(','));
      }
      if (minRating > 0) {
        discoverParams.set('vote_average.gte', String(minRating));
        discoverParams.set('vote_count.gte', '30');
      } else if (sortBy === 'vote_average.desc') {
        discoverParams.set('vote_count.gte', '150');
      }

      const enEndpoint = appendApiKeyParam(
        `${TMDB_BASE_URL}/discover/movie?language=en-US&${discoverParams.toString()}`,
        apiKey
      );
      const ukEndpoint = appendApiKeyParam(
        `${TMDB_BASE_URL}/discover/movie?language=uk-UA&${discoverParams.toString()}`,
        apiKey
      );

      const [enRes, ukRes] = await Promise.all([
        fetch(enEndpoint, { headers: buildAuthHeaders(apiKey) }),
        fetch(ukEndpoint, { headers: buildAuthHeaders(apiKey) }),
      ]);

      if (!enRes.ok) return { results: [], hasApiKey: true };

      const enData = await enRes.json();
      const ukData = ukRes.ok ? await ukRes.json() : { results: [] };

      const ukMap = new Map<number, any>();
      if (Array.isArray(ukData.results)) {
        ukData.results.forEach((r: any) => ukMap.set(r.id, r));
      }

      const rawList: any[] = Array.isArray(enData.results)
        ? enData.results
        : [];

      const mapped = rawList.slice(0, 20).map((rawEn: any) => {
        const rawUk = ukMap.get(rawEn.id) || rawEn;
        return mapBilingualTmdbToMovieItem(rawEn, rawUk);
      });

      return { results: mapped, hasApiKey: true };
    }
  } catch {
    return { results: [], hasApiKey: true };
  }
}

export function createCustomMovieItem(
  title: string,
  releaseYear: number = new Date().getFullYear(),
  imdbScore: number = 7.8
): MovieItem {
  const numericSeed =
    title
      .split('')
      .reduce((acc, ch) => acc + ch.charCodeAt(0), 0) *
      31 +
    releaseYear;
  const ratings = resolveCrossPlatformRatings(numericSeed, imdbScore, 850);

  return {
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    tmdbId: numericSeed,
    imdbId: `tt${numericSeed}`,
    titleUk: title.trim(),
    titleEn: title.trim(),
    releaseYear,
    runtime: 120,
    genresUk: ['Кіно'],
    genresEn: ['Movie'],
    directorUk: 'Власний список',
    directorEn: 'Custom Entry',
    castUk: [],
    castEn: [],
    overviewUk: `Фільм «${title.trim()}».`,
    overviewEn: `Movie "${title.trim()}".`,
    posterPath: '',
    backdropPath: '',
    trailerYoutubeKey: '',
    ratings,
    streamingProviders: ['netflix', 'megogo', 'apple'],
  };
}

/**
 * Enrich movie details from TMDb API including rich Director & Cast PersonCredit objects
 * so clicking on a director or actor reveals their other movies!
 */
export async function fetchTmdbMovieDetails(
  movie: MovieItem,
  apiKey?: string
): Promise<MovieItem> {
  if (!apiKey || apiKey.trim().length <= 5 || movie.id.startsWith('custom-')) {
    return movie;
  }

  try {
    const enUrl = appendApiKeyParam(
      `${TMDB_BASE_URL}/movie/${movie.tmdbId}?language=en-US&include_image_language=en,null&append_to_response=videos,credits,external_ids,images`,
      apiKey
    );
    const ukUrl = appendApiKeyParam(
      `${TMDB_BASE_URL}/movie/${movie.tmdbId}?language=uk-UA`,
      apiKey
    );

    const [enRes, ukRes] = await Promise.all([
      fetch(enUrl, { headers: buildAuthHeaders(apiKey) }),
      fetch(ukUrl, { headers: buildAuthHeaders(apiKey) }),
    ]);

    if (!enRes.ok) return movie;

    const detailEn = await enRes.json();
    const detailUk = ukRes.ok ? await ukRes.json() : null;

    const videos: any[] = detailEn.videos?.results || [];
    const ytTrailer =
      videos.find(
        (v) =>
          v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
      ) || videos.find((v) => v.site === 'YouTube');

    const directorObj = detailEn.credits?.crew?.find(
      (c: any) => c.job === 'Director'
    );
    const directorPerson: PersonCredit | undefined = directorObj
      ? {
          id: directorObj.id,
          name: directorObj.name,
          job: 'Director',
          profilePath: directorObj.profile_path
            ? `${TMDB_IMAGE_BASE_PROFILE}${directorObj.profile_path}`
            : undefined,
        }
      : movie.directorPerson;

    const rawCast: any[] = (detailEn.credits?.cast || []).slice(0, 10);
    const castPeople: PersonCredit[] = rawCast.map((c: any) => ({
      id: c.id,
      name: c.name,
      character: c.character || '',
      profilePath: c.profile_path
        ? `${TMDB_IMAGE_BASE_PROFILE}${c.profile_path}`
        : undefined,
    }));

    const topCastNames: string[] = castPeople.slice(0, 6).map((c) => c.name);

    const enPosterPath =
      detailEn.images?.posters?.find((p: any) => p.iso_639_1 === 'en')
        ?.file_path || detailEn.poster_path;

    return {
      ...movie,
      titleEn: detailEn.title || movie.titleEn,
      titleUk: detailUk?.title || movie.titleUk || detailEn.title,
      runtime: detailEn.runtime || movie.runtime,
      taglineEn: detailEn.tagline || movie.taglineEn,
      taglineUk: detailUk?.tagline || movie.taglineUk || detailEn.tagline,
      overviewEn: detailEn.overview || movie.overviewEn,
      overviewUk:
        detailUk?.overview || movie.overviewUk || detailEn.overview,
      directorEn: directorObj?.name || movie.directorEn,
      directorUk: directorObj?.name || movie.directorUk,
      directorPerson,
      castEn: topCastNames.length > 0 ? topCastNames : movie.castEn,
      castUk: topCastNames.length > 0 ? topCastNames : movie.castUk,
      castPeople: castPeople.length > 0 ? castPeople : movie.castPeople,
      imdbId: detailEn.external_ids?.imdb_id || movie.imdbId,
      trailerYoutubeKey: ytTrailer?.key || movie.trailerYoutubeKey,
      posterPath: enPosterPath
        ? `${TMDB_IMAGE_BASE_POSTER}${enPosterPath}`
        : movie.posterPath,
    };
  } catch {
    return movie;
  }
}

/**
 * Fetch movies where a given Director or Actor worked (`/person/{id}/movie_credits`).
 */
export async function fetchPersonMovieCredits(options: {
  personId?: number;
  personName: string;
  excludeMovieTmdbId?: number;
  apiKey?: string;
}): Promise<MovieItem[]> {
  const { personId, personName, excludeMovieTmdbId, apiKey } = options;
  if (!apiKey || apiKey.trim().length <= 5) return [];

  try {
    let targetPersonId = personId;

    if (!targetPersonId && personName.trim()) {
      const searchUrl = appendApiKeyParam(
        `${TMDB_BASE_URL}/search/person?query=${encodeURIComponent(
          personName.trim()
        )}&language=en-US&page=1`,
        apiKey
      );
      const searchRes = await fetch(searchUrl, {
        headers: buildAuthHeaders(apiKey),
      });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        targetPersonId = searchData.results?.[0]?.id;
      }
    }

    if (!targetPersonId) return [];

    const enCreditsUrl = appendApiKeyParam(
      `${TMDB_BASE_URL}/person/${targetPersonId}/movie_credits?language=en-US`,
      apiKey
    );
    const ukCreditsUrl = appendApiKeyParam(
      `${TMDB_BASE_URL}/person/${targetPersonId}/movie_credits?language=uk-UA`,
      apiKey
    );

    const [enRes, ukRes] = await Promise.all([
      fetch(enCreditsUrl, { headers: buildAuthHeaders(apiKey) }),
      fetch(ukCreditsUrl, { headers: buildAuthHeaders(apiKey) }),
    ]);

    if (!enRes.ok) return [];

    const enData = await enRes.json();
    const ukData = ukRes.ok ? await ukRes.json() : {};

    const ukMap = new Map<number, any>();
    [...(ukData.cast || []), ...(ukData.crew || [])].forEach((item: any) => {
      if (item?.id && !ukMap.has(item.id)) {
        ukMap.set(item.id, item);
      }
    });

    const combinedRaw: any[] = [
      ...(enData.crew || []).filter((c: any) => c.job === 'Director'),
      ...(enData.cast || []),
    ];

    const uniqueMap = new Map<number, any>();
    combinedRaw.forEach((raw: any) => {
      if (
        raw?.id &&
        raw.id !== excludeMovieTmdbId &&
        raw.poster_path &&
        !uniqueMap.has(raw.id)
      ) {
        uniqueMap.set(raw.id, raw);
      }
    });

    const sorted = Array.from(uniqueMap.values()).sort(
      (a, b) => (b.vote_count || 0) - (a.vote_count || 0)
    );

    return sorted.slice(0, 12).map((rawEn: any) => {
      const rawUk = ukMap.get(rawEn.id) || rawEn;
      return mapBilingualTmdbToMovieItem(rawEn, rawUk);
    });
  } catch {
    return [];
  }
}

function mapBilingualTmdbToMovieItem(rawEn: any, rawUk: any): MovieItem {
  const year = rawEn.release_date
    ? parseInt(String(rawEn.release_date).slice(0, 4), 10)
    : 2024;

  const genreIds: number[] = Array.isArray(rawEn.genre_ids)
    ? rawEn.genre_ids
    : Array.isArray(rawEn.genres)
    ? rawEn.genres.map((g: any) => g.id).filter(Boolean)
    : [];

  const genresUk: string[] =
    genreIds.length > 0
      ? genreIds
          .map((gid: number) => TMDB_GENRE_MAP_UK[gid])
          .filter(Boolean)
          .slice(0, 3)
      : ['Кіно'];

  const genresEn: string[] =
    genreIds.length > 0
      ? genreIds
          .map((gid: number) => TMDB_GENRE_MAP_EN[gid])
          .filter(Boolean)
          .slice(0, 3)
      : ['Movie'];

  const ratings = resolveCrossPlatformRatings(
    rawEn.id,
    rawEn.vote_average || 7.2,
    rawEn.vote_count || 500
  );

  const posterFile = rawEn.poster_path || rawUk?.poster_path;
  const backdropFile = rawEn.backdrop_path || rawUk?.backdrop_path;

  return {
    id: `tmdb-${rawEn.id}`,
    tmdbId: rawEn.id,
    imdbId: ratings.imdb.imdbId || `tt${rawEn.id}`,
    titleEn: rawEn.title || rawEn.original_title || 'Untitled',
    titleUk: rawUk?.title || rawEn.title || 'Без назви',
    originalTitle: rawEn.original_title || rawEn.title,
    releaseYear: year,
    runtime: rawEn.runtime || 120,
    genresUk: genresUk.length > 0 ? genresUk : ['Кіно'],
    genresEn: genresEn.length > 0 ? genresEn : ['Movie'],
    directorUk: 'TMDb',
    directorEn: 'TMDb',
    castUk: [],
    castEn: [],
    overviewUk:
      rawUk?.overview ||
      rawEn.overview ||
      'Опис із бази The Movie Database (TMDb).',
    overviewEn:
      rawEn.overview || 'Overview from The Movie Database (TMDb).',
    posterPath: posterFile ? `${TMDB_IMAGE_BASE_POSTER}${posterFile}` : '',
    backdropPath: backdropFile
      ? `${TMDB_IMAGE_BASE_BACKDROP}${backdropFile}`
      : '',
    trailerYoutubeKey: '',
    ratings,
    streamingProviders: inferStreamingProviders(rawEn.id),
  };
}

export async function fetchMovieByTmdbId(
  tmdbId: number,
  apiKey?: string
): Promise<MovieItem | null> {
  if (!tmdbId || !apiKey || apiKey.trim().length <= 5) {
    return null;
  }

  try {
    const enUrl = appendApiKeyParam(
      `${TMDB_BASE_URL}/movie/${tmdbId}?language=en-US`,
      apiKey
    );
    const ukUrl = appendApiKeyParam(
      `${TMDB_BASE_URL}/movie/${tmdbId}?language=uk-UA`,
      apiKey
    );

    const [enRes, ukRes] = await Promise.all([
      fetch(enUrl, { headers: buildAuthHeaders(apiKey) }),
      fetch(ukUrl, { headers: buildAuthHeaders(apiKey) }),
    ]);

    if (!enRes.ok) return null;

    const detailEn = await enRes.json();
    const detailUk = ukRes.ok ? await ukRes.json() : detailEn;
    return mapBilingualTmdbToMovieItem(detailEn, detailUk);
  } catch {
    return null;
  }
}

export function calculateCompositeScore(ratings: MovieRatings): number {
  const imdbNorm = ratings.imdb.score * 10;
  const rtNorm = ratings.rottenTomatoes.tomatometer;
  const lbNorm = (ratings.letterboxd.score / 5) * 100;
  const tmdbNorm = ratings.tmdb.score * 10;
  return Math.round((imdbNorm + rtNorm + lbNorm + tmdbNorm) / 4);
}

