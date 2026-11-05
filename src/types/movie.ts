export type StreamingProviderId =
  | 'netflix'
  | 'apple'
  | 'megogo'
  | 'prime'
  | 'disney'
  | 'max';

export interface MovieRatings {
  imdb: {
    score: number;
    votes: string;
    imdbId?: string;
  };
  rottenTomatoes: {
    tomatometer: number;
    audienceScore: number;
    certifiedFresh: boolean;
  };
  letterboxd: {
    score: number;
    fansCount?: string;
  };
  tmdb: {
    score: number;
    voteCount: number;
  };
}

export interface PersonCredit {
  id: number;
  name: string;
  character?: string;
  job?: string;
  profilePath?: string;
}

export interface MovieItem {
  id: string;
  tmdbId: number;
  imdbId: string;
  titleUk: string;
  titleEn: string;
  releaseYear: number;
  runtime: number;
  genresUk: string[];
  genresEn: string[];
  directorUk: string;
  directorEn: string;
  directorPerson?: PersonCredit;
  castUk: string[];
  castEn: string[];
  castPeople?: PersonCredit[];
  overviewUk: string;
  overviewEn: string;
  taglineUk?: string;
  taglineEn?: string;
  posterPath: string; // International English poster (2:3)
  backdropPath: string;
  trailerYoutubeKey: string;
  ratings: MovieRatings;
  streamingProviders: StreamingProviderId[];
  // Personal state in user's movie list
  isChosen?: boolean; // Обраний фільм (Ч/Б у списку фільмів, галочка)
  isWatched?: boolean; // Переглянутий фільм (Ч/Б у списку фільмів, іконка ока)
  excludeFromRoulette?: boolean; // Залишити у списку фільмів, але прибрати з рулетки
  userRating?: number; // Особиста оцінка користувача (0.5–5.0)
  // Legacy fallback fields for already stored items
  title?: string;
  originalTitle?: string;
  genres?: string[];
  director?: string;
  cast?: string[];
  overview?: string;
}

export interface WheelCandidate {
  movie: MovieItem;
}

export type ColorThemeId = 'dark-white' | 'pure-white';

export type AppLanguage = 'uk-UA' | 'en-US';

export interface TmdbConfigState {
  mode: 'builtin' | 'custom';
  customApiKey: string;
  language: AppLanguage;
  lastSyncStatus: 'idle' | 'connected' | 'error';
  lastSyncMessage?: string;
}

export interface SecretOverrideConfig {
  movie: MovieItem | null;
  chancePercent: number;
}

