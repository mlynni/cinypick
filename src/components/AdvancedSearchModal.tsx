import React, { useEffect, useState } from 'react';
import {
  X,
  Search,
  SlidersHorizontal,
  Plus,
  Check,
  Bookmark,
  Film,
  RotateCcw,
  KeyRound,
} from 'lucide-react';
import { AppLanguage, MovieItem } from '../types/movie';
import {
  advancedSearchTmdb,
  TMDB_GENRE_LIST,
} from '../services/tmdbService';
import {
  ImdbIcon,
  LetterboxdIcon,
  RottenTomatoesIcon,
  TmdbIcon,
} from './MultiRatingBar';
import { getMovieTitle, UI_TEXT } from '../utils/i18n';

interface AdvancedSearchModalProps {
  isOpen: boolean;
  language: AppLanguage;
  apiKey: string;
  initialQuery?: string;
  isMovieInPool: (movieId: string) => boolean;
  isMovieInWishlist: (movieId: string) => boolean;
  onClose: () => void;
  onAddToPool: (movie: MovieItem) => void;
  onToggleWishlist: (movie: MovieItem) => void;
  onOpenMovieDetail: (movie: MovieItem) => void;
  onOpenSettings: () => void;
}

type AdvSortMode =
  | 'popularity'
  | 'imdb'
  | 'rt'
  | 'lb'
  | 'tmdb'
  | 'year_desc'
  | 'year_asc';

const MIN_YEAR_BOUND = 1960;
const CURRENT_YEAR = new Date().getFullYear();

export const AdvancedSearchModal: React.FC<AdvancedSearchModalProps> = ({
  isOpen,
  language,
  apiKey,
  initialQuery = '',
  isMovieInPool,
  isMovieInWishlist,
  onClose,
  onAddToPool,
  onToggleWishlist,
  onOpenMovieDetail,
  onOpenSettings,
}) => {
  const [query, setQuery] = useState<string>(initialQuery);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [yearFrom, setYearFrom] = useState<number>(2000);
  const [yearTo, setYearTo] = useState<number>(CURRENT_YEAR);
  const [minRating, setMinRating] = useState<number>(0);
  const [sortMode, setSortMode] = useState<AdvSortMode>('popularity');

  const [results, setResults] = useState<MovieItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [hasApiKey, setHasApiKey] = useState<boolean>(
    Boolean(apiKey && apiKey.trim().length > 5)
  );

  useEffect(() => {
    setHasApiKey(Boolean(apiKey && apiKey.trim().length > 5));
  }, [apiKey]);

  useEffect(() => {
    if (isOpen && initialQuery.trim()) {
      setQuery(initialQuery);
    }
  }, [isOpen, initialQuery]);

  if (!isOpen) return null;

  const t = UI_TEXT[language];

  const isRatingSort =
    sortMode === 'imdb' ||
    sortMode === 'rt' ||
    sortMode === 'lb' ||
    sortMode === 'tmdb';

  const isYearSort = sortMode === 'year_desc' || sortMode === 'year_asc';

  const hasActiveFilters =
    query.trim().length > 0 ||
    selectedGenres.length > 0 ||
    yearFrom !== 2000 ||
    yearTo !== CURRENT_YEAR ||
    minRating > 0 ||
    sortMode !== 'popularity';

  const toggleGenre = (genreId: number) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId)
        ? prev.filter((id) => id !== genreId)
        : [...prev, genreId]
    );
  };

  const handleExecuteSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setHasSearched(true);
    setLoading(true);

    const tmdbSortBy:
      | 'popularity.desc'
      | 'vote_average.desc'
      | 'primary_release_date.desc' =
      sortMode === 'popularity'
        ? 'popularity.desc'
        : isYearSort
        ? 'primary_release_date.desc'
        : 'vote_average.desc';

    const res = await advancedSearchTmdb({
      query,
      genreIds: selectedGenres,
      yearFrom: Math.min(yearFrom, yearTo),
      yearTo: Math.max(yearFrom, yearTo),
      minRating,
      sortBy: tmdbSortBy,
      apiKey,
    });

    setResults(res.results);
    setHasApiKey(res.hasApiKey);
    setLoading(false);
  };

  const handleResetFilters = () => {
    setQuery('');
    setSelectedGenres([]);
    setYearFrom(2000);
    setYearTo(CURRENT_YEAR);
    setMinRating(0);
    setSortMode('popularity');
    setResults([]);
    setHasSearched(false);
  };

  // Client-side sort refinement on the fetched results according to selected platform or year order
  const sortedResults = [...results].sort((a, b) => {
    if (sortMode === 'imdb') {
      return b.ratings.imdb.score - a.ratings.imdb.score;
    }
    if (sortMode === 'rt') {
      return (
        b.ratings.rottenTomatoes.tomatometer -
        a.ratings.rottenTomatoes.tomatometer
      );
    }
    if (sortMode === 'lb') {
      return b.ratings.letterboxd.score - a.ratings.letterboxd.score;
    }
    if (sortMode === 'tmdb') {
      return b.ratings.tmdb.score - a.ratings.tmdb.score;
    }
    if (sortMode === 'year_desc') {
      return b.releaseYear - a.releaseYear;
    }
    if (sortMode === 'year_asc') {
      return a.releaseYear - b.releaseYear;
    }
    return 0;
  });

  const ratingOptions = [
    { label: t.advAnyRating, value: 0 },
    { label: '6.0+', value: 6.0 },
    { label: '7.0+', value: 7.0 },
    { label: '7.5+', value: 7.5 },
    { label: '8.0+', value: 8.0 },
  ];

  const leftPercent =
    ((Math.min(yearFrom, yearTo) - MIN_YEAR_BOUND) /
      (CURRENT_YEAR - MIN_YEAR_BOUND)) *
    100;
  const rightPercent =
    ((Math.max(yearFrom, yearTo) - MIN_YEAR_BOUND) /
      (CURRENT_YEAR - MIN_YEAR_BOUND)) *
    100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="w-full max-w-5xl rounded-[28px] bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Clean Modal Header */}
        <div className="px-6 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal className="w-4.5 h-4.5 text-[var(--text-muted)]" />
            <h2 className="font-display text-lg sm:text-xl font-extrabold uppercase tracking-tight">
              {t.advancedSearchTitle}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-xl bg-[var(--bg-subcard)] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Filter Studio */}
          <div className="space-y-5">
            {/* 1. Search Input + Search Button + Icon-Only Reset */}
            <form
              onSubmit={handleExecuteSearch}
              className="flex flex-col sm:flex-row gap-2.5"
            >
              <div className="relative flex-1">
                <Search className="w-4.5 h-4.5 text-[var(--text-muted)] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t.advQueryPlaceholder}
                  className="w-full h-11 pl-11 pr-9 rounded-2xl bg-[var(--bg-subcard)] border border-[var(--border-subtle)] focus:border-white/30 font-sans text-sm font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none transition-colors"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="submit"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--accent-text)',
                  }}
                  className="flex-1 sm:flex-initial h-11 px-5 rounded-2xl font-sans text-xs font-bold tracking-wider uppercase flex items-center justify-center gap-2 hover:opacity-90 transition-opacity cursor-pointer"
                >
                  <Search className="w-4 h-4" />
                  <span>{t.advSearchActionBtn}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetFilters}
                  aria-label={t.advResetFilters}
                  className={`group/btn relative w-11 h-11 rounded-2xl border border-[var(--border-subtle)] flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                    hasActiveFilters
                      ? 'bg-[var(--bg-subcard)] text-emerald-400 hover:text-emerald-300'
                      : 'bg-[var(--bg-subcard)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                  }`}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span className="pointer-events-none absolute bottom-full right-0 mb-2 px-2.5 py-1 rounded-lg bg-[#18181F] text-white border border-white/15 text-[11px] font-sans font-semibold whitespace-nowrap shadow-xl opacity-0 scale-95 translate-y-1 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:translate-y-0 transition-all duration-150 z-30">
                    {t.advResetFilters}
                  </span>
                </button>
              </div>
            </form>

            {/* 2. Genres Soft Pill Grid */}
            <div className="space-y-2">
              <div className="flex items-center justify-between px-0.5">
                <span className="font-sans text-[11px] font-bold tracking-wider uppercase text-[var(--text-muted)]">
                  {t.advFilterGenres}
                </span>
                {selectedGenres.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedGenres([])}
                    className="font-sans text-[11px] font-semibold text-emerald-400 hover:underline cursor-pointer"
                  >
                    {t.resetFilterBtn} ({selectedGenres.length})
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {TMDB_GENRE_LIST.map((genre) => {
                  const active = selectedGenres.includes(genre.id);
                  const label =
                    language === 'en-US' ? genre.nameEn : genre.nameUk;
                  return (
                    <button
                      key={genre.id}
                      type="button"
                      onClick={() => toggleGenre(genre.id)}
                      style={
                        active
                          ? {
                              backgroundColor: 'var(--accent-primary)',
                              color: 'var(--accent-text)',
                            }
                          : undefined
                      }
                      className={`px-3 py-1.5 rounded-xl font-sans text-xs transition-all cursor-pointer ${
                        active
                          ? 'font-bold shadow-xs'
                          : 'bg-[var(--bg-subcard)]/80 hover:bg-[var(--bg-subcard)] font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. Segmented Controls Row: Years Range + Min Rating + Sort By (with Platform Picker) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4 border-t border-[var(--border-subtle)]">
              {/* Dual-Thumb Release Years Range Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-0.5">
                  <span className="font-sans text-[11px] font-bold tracking-wider uppercase text-[var(--text-muted)]">
                    {t.advFilterYears}
                  </span>
                  <span className="font-sans tabular-nums text-xs font-bold px-2.5 py-0.5 rounded-lg bg-[var(--bg-subcard)] text-[var(--text-main)]">
                    {Math.min(yearFrom, yearTo)} — {Math.max(yearFrom, yearTo)}
                  </span>
                </div>

                <div className="h-9 px-3 rounded-xl bg-[var(--bg-subcard)] flex items-center">
                  <div className="relative w-full h-full flex items-center select-none">
                    <div className="w-full h-1.5 rounded-full bg-[var(--bg-card)]" />

                    <div
                      className="absolute h-1.5 rounded-full"
                      style={{
                        left: `${leftPercent}%`,
                        width: `${Math.max(0, rightPercent - leftPercent)}%`,
                        backgroundColor: 'var(--accent-primary)',
                      }}
                    />

                    <input
                      type="range"
                      min={MIN_YEAR_BOUND}
                      max={CURRENT_YEAR}
                      step={1}
                      value={yearFrom}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setYearFrom(Math.min(val, yearTo));
                      }}
                      className="pointer-events-none absolute inset-0 w-full h-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-black [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-black [&::-moz-range-thumb]:cursor-grab"
                    />

                    <input
                      type="range"
                      min={MIN_YEAR_BOUND}
                      max={CURRENT_YEAR}
                      step={1}
                      value={yearTo}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setYearTo(Math.max(val, yearFrom));
                      }}
                      className="pointer-events-none absolute inset-0 w-full h-full appearance-none bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-black [&::-webkit-slider-thumb]:shadow-md [&::-webkit-slider-thumb]:cursor-grab [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-black [&::-moz-range-thumb]:cursor-grab"
                    />
                  </div>
                </div>
              </div>

              {/* Minimum Rating Segmented Track */}
              <div className="space-y-2">
                <span className="font-sans text-[11px] font-bold tracking-wider uppercase text-[var(--text-muted)] block px-0.5">
                  {t.advFilterMinRating}
                </span>
                <div className="grid grid-cols-5 gap-1 p-1 rounded-xl bg-[var(--bg-subcard)] h-9 items-center">
                  {ratingOptions.map((opt) => {
                    const active = minRating === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setMinRating(opt.value)}
                        style={
                          active
                            ? {
                                backgroundColor: 'var(--accent-primary)',
                                color: 'var(--accent-text)',
                              }
                            : undefined
                        }
                        className={`h-7 rounded-lg font-sans tabular-nums text-[11px] transition-colors cursor-pointer ${
                          active
                            ? 'font-bold'
                            : 'font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sort Order Segmented Track + Sub-Picker */}
              <div className="space-y-2">
                <span className="font-sans text-[11px] font-bold tracking-wider uppercase text-[var(--text-muted)] block px-0.5">
                  {t.advFilterSortBy}
                </span>

                <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--bg-subcard)] h-9 items-center">
                  <button
                    type="button"
                    onClick={() => setSortMode('popularity')}
                    style={
                      sortMode === 'popularity'
                        ? {
                            backgroundColor: 'var(--accent-primary)',
                            color: 'var(--accent-text)',
                          }
                        : undefined
                    }
                    className={`h-7 px-2 rounded-lg font-sans text-[11px] truncate transition-colors cursor-pointer ${
                      sortMode === 'popularity'
                        ? 'font-bold'
                        : 'font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    {t.advSortPopular}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!isRatingSort) setSortMode('imdb');
                    }}
                    style={
                      isRatingSort
                        ? {
                            backgroundColor: 'var(--accent-primary)',
                            color: 'var(--accent-text)',
                          }
                        : undefined
                    }
                    className={`h-7 px-2 rounded-lg font-sans text-[11px] truncate transition-colors cursor-pointer ${
                      isRatingSort
                        ? 'font-bold'
                        : 'font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    {t.sortGroupRating}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (!isYearSort) setSortMode('year_desc');
                    }}
                    style={
                      isYearSort
                        ? {
                            backgroundColor: 'var(--accent-primary)',
                            color: 'var(--accent-text)',
                          }
                        : undefined
                    }
                    className={`h-7 px-2 rounded-lg font-sans text-[11px] truncate transition-colors cursor-pointer ${
                      isYearSort
                        ? 'font-bold'
                        : 'font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]'
                    }`}
                  >
                    {t.sortGroupYear}
                  </button>
                </div>

                {/* Rating Platform Sub-Picker */}
                {isRatingSort && (
                  <div className="grid grid-cols-4 gap-1.5 pt-0.5 animate-in fade-in duration-100">
                    {[
                      {
                        id: 'imdb' as AdvSortMode,
                        label: 'IMDb',
                        icon: <ImdbIcon className="w-3.5 h-3.5" />,
                      },
                      {
                        id: 'rt' as AdvSortMode,
                        label: 'RT',
                        icon: <RottenTomatoesIcon className="w-3.5 h-3.5" />,
                      },
                      {
                        id: 'lb' as AdvSortMode,
                        label: 'LB',
                        icon: <LetterboxdIcon className="w-4 h-3.5" />,
                      },
                      {
                        id: 'tmdb' as AdvSortMode,
                        label: 'TMDb',
                        icon: <TmdbIcon className="w-3.5 h-3.5" />,
                      },
                    ].map((plat) => {
                      const active = sortMode === plat.id;
                      return (
                        <button
                          key={plat.id}
                          type="button"
                          onClick={() => setSortMode(plat.id)}
                          className={`h-8 px-2 rounded-lg border font-sans text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                            active
                              ? 'bg-[var(--bg-subcard)] border-[var(--accent-primary)] font-bold text-[var(--text-main)]'
                              : 'bg-[var(--bg-subcard)]/50 border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                          }`}
                        >
                          {plat.icon}
                          <span>{plat.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Year Direction Sub-Picker */}
                {isYearSort && (
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5 animate-in fade-in duration-100">
                    <button
                      type="button"
                      onClick={() => setSortMode('year_desc')}
                      className={`h-8 px-2.5 rounded-lg border font-sans text-[11px] transition-all cursor-pointer ${
                        sortMode === 'year_desc'
                          ? 'bg-[var(--bg-subcard)] border-[var(--accent-primary)] font-bold text-[var(--text-main)]'
                          : 'bg-[var(--bg-subcard)]/50 border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {t.sortYearNewest}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSortMode('year_asc')}
                      className={`h-8 px-2.5 rounded-lg border font-sans text-[11px] transition-all cursor-pointer ${
                        sortMode === 'year_asc'
                          ? 'bg-[var(--bg-subcard)] border-[var(--accent-primary)] font-bold text-[var(--text-main)]'
                          : 'bg-[var(--bg-subcard)]/50 border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {t.sortYearOldest}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Results Grid: Shown ONLY after clicking Search */}
          {!hasApiKey ? (
            <div className="p-10 rounded-2xl bg-[var(--bg-subcard)] border border-[var(--border-subtle)] text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center mx-auto">
                <KeyRound className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="font-display text-lg font-bold uppercase tracking-wide">
                  {t.advNoApiKeyTitle}
                </h3>
                <p className="font-sans text-sm text-[var(--text-muted)]">
                  {t.advNoApiKeyDesc}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--accent-text)',
                }}
                className="px-5 py-2.5 rounded-xl font-sans text-xs font-bold tracking-wider uppercase cursor-pointer"
              >
                {t.advOpenSettingsBtn}
              </button>
            </div>
          ) : !hasSearched ? null : loading ? (
            <div className="p-12 text-center font-sans text-sm text-[var(--text-muted)]">
              {t.searchingTmdb}
            </div>
          ) : sortedResults.length === 0 ? (
            <div className="p-10 rounded-2xl bg-[var(--bg-subcard)] border border-[var(--border-subtle)] text-center font-sans text-sm text-[var(--text-muted)]">
              {t.advNoResults}
            </div>
          ) : (
            <div className="pt-2 border-t border-[var(--border-subtle)] grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {sortedResults.map((movie) => {
                const primaryTitle = getMovieTitle(movie, language);
                const inPool = isMovieInPool(movie.id);
                const inWishlist = isMovieInWishlist(movie.id);

                return (
                  <article
                    key={movie.id}
                    onClick={() => onOpenMovieDetail(movie)}
                    className="group relative aspect-[2/3] w-full rounded-[24px] overflow-hidden bg-[#121216] border border-[var(--border-subtle)] hover:border-white/25 transition-all cursor-pointer select-none animate-movie-fade-in"
                  >
                    {movie.posterPath ? (
                      <img
                        src={movie.posterPath}
                        alt={primaryTitle}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                        <Film className="w-9 h-9 text-zinc-500 mb-2" />
                        <span className="font-display text-sm text-white uppercase">
                          {primaryTitle}
                        </span>
                      </div>
                    )}

                    {/* Top-Right Hover Action Icons (Add to Pool + Wishlist) */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto transition-opacity duration-200">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!inPool) onAddToPool(movie);
                        }}
                        aria-label={
                          inPool ? t.addedToPoolTooltip : t.moveToRouletteTitle
                        }
                        className={`group/btn relative w-8.5 h-8.5 rounded-xl backdrop-blur-md flex items-center justify-center transition-all cursor-pointer ${
                          inPool
                            ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/25'
                            : 'bg-black/75 hover:bg-white text-white hover:text-black border border-white/10'
                        }`}
                      >
                        {inPool ? (
                          <Check className="w-4 h-4 stroke-[2.5]" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        <span className="pointer-events-none absolute top-full right-0 mt-2 px-2.5 py-1 rounded-lg bg-[#18181F] text-white border border-white/15 text-[11px] font-sans font-semibold whitespace-nowrap shadow-xl opacity-0 scale-95 -translate-y-1 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:translate-y-0 transition-all duration-150">
                          {inPool
                            ? t.addedToPoolTooltip
                            : t.moveToRouletteTitle}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleWishlist(movie);
                        }}
                        aria-label={
                          inWishlist
                            ? t.removeFromWishlistTitle
                            : t.addToWishlistTitle
                        }
                        className={`group/btn relative w-8.5 h-8.5 rounded-xl backdrop-blur-md flex items-center justify-center transition-all cursor-pointer ${
                          inWishlist
                            ? 'bg-white text-black shadow-md'
                            : 'bg-black/75 hover:bg-white text-white/90 hover:text-black border border-white/10'
                        }`}
                      >
                        <Bookmark
                          className={`w-4 h-4 ${
                            inWishlist ? 'fill-current' : ''
                          }`}
                        />
                        <span className="pointer-events-none absolute top-full right-0 mt-2 px-2.5 py-1 rounded-lg bg-[#18181F] text-white border border-white/15 text-[11px] font-sans font-semibold whitespace-nowrap shadow-xl opacity-0 scale-95 -translate-y-1 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:translate-y-0 transition-all duration-150">
                          {inWishlist
                            ? t.removeFromWishlistTitle
                            : t.addToWishlistTitle}
                        </span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
