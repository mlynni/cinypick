import React, { useEffect, useRef, useState } from 'react';
import {
  PiArrowCounterClockwiseBold,
  PiBookmarkSimpleBold,
  PiBookmarkSimpleFill,
  PiCaretDownBold,
  PiCheckBold,
  PiEyeBold,
  PiEyeFill,
  PiFilmSlateBold,
  PiKeyBold,
  PiMagnifyingGlassBold,
  PiPlusBold,
  PiXBold,
} from 'react-icons/pi';
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
  isMovieInWatched?: (movieId: string) => boolean;
  isMovieInWishlist: (movieId: string) => boolean;
  onClose: () => void;
  onAddToPool: (movie: MovieItem) => void;
  onToggleWatched?: (movie: MovieItem) => void;
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

type OpenDropdownId = 'genres' | 'years' | 'rating' | 'sort' | null;

const MIN_YEAR_BOUND = 1920;
const CURRENT_YEAR = new Date().getFullYear();

const DECADE_PRESETS: Array<{
  id: string;
  labelUk: string;
  labelEn: string;
  from: number;
  to: number;
}> = [
  {
    id: 'all',
    labelUk: 'Усі роки',
    labelEn: 'All years',
    from: 1950,
    to: CURRENT_YEAR,
  },
  {
    id: '2020s',
    labelUk: '2020-ті',
    labelEn: '2020s',
    from: 2020,
    to: CURRENT_YEAR,
  },
  {
    id: '2010s',
    labelUk: '2010-ті',
    labelEn: '2010s',
    from: 2010,
    to: 2019,
  },
  {
    id: '2000s',
    labelUk: '2000-ні',
    labelEn: '2000s',
    from: 2000,
    to: 2009,
  },
  {
    id: '1990s',
    labelUk: '1990-ті',
    labelEn: '1990s',
    from: 1990,
    to: 1999,
  },
  {
    id: '1980s',
    labelUk: '1980-ті',
    labelEn: '1980s',
    from: 1980,
    to: 1989,
  },
  {
    id: 'classic',
    labelUk: 'До 1980',
    labelEn: 'Pre-1980',
    from: 1920,
    to: 1979,
  },
];

export const AdvancedSearchModal: React.FC<AdvancedSearchModalProps> = ({
  isOpen,
  language,
  apiKey,
  initialQuery = '',
  isMovieInPool,
  isMovieInWatched,
  isMovieInWishlist,
  onClose,
  onAddToPool,
  onToggleWatched,
  onToggleWishlist,
  onOpenMovieDetail,
  onOpenSettings,
}) => {
  const [query, setQuery] = useState<string>(initialQuery);
  const [selectedGenres, setSelectedGenres] = useState<number[]>([]);
  const [yearFrom, setYearFrom] = useState<number>(1950);
  const [yearTo, setYearTo] = useState<number>(CURRENT_YEAR);
  const [yearFromText, setYearFromText] = useState<string>('1950');
  const [yearToText, setYearToText] = useState<string>(String(CURRENT_YEAR));
  const [minRating, setMinRating] = useState<number>(0);
  const [sortMode, setSortMode] = useState<AdvSortMode>('popularity');

  const [openDropdown, setOpenDropdown] = useState<OpenDropdownId>(null);
  const toolbarRef = useRef<HTMLDivElement | null>(null);

  const [results, setResults] = useState<MovieItem[]>([]);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const [hasApiKey, setHasApiKey] = useState<boolean>(
    Boolean(apiKey && apiKey.trim().length > 5)
  );

  useEffect(() => {
    setHasApiKey(Boolean(apiKey && apiKey.trim().length > 5));
  }, [apiKey]);

  useEffect(() => {
    if (isOpen) {
      setOpenDropdown(null);
      if (initialQuery.trim()) {
        setQuery(initialQuery);
      }
    }
  }, [isOpen, initialQuery]);

  // Close active dropdown when clicking outside the toolbar
  useEffect(() => {
    if (!openDropdown) return;
    const handleOutside = (e: MouseEvent) => {
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(e.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [openDropdown]);

  const isRatingSort =
    sortMode === 'imdb' ||
    sortMode === 'rt' ||
    sortMode === 'lb' ||
    sortMode === 'tmdb';

  const isYearSort = sortMode === 'year_desc' || sortMode === 'year_asc';

  const resolveTmdbSortBy = (
    mode: AdvSortMode
  ):
    | 'popularity.desc'
    | 'vote_average.desc'
    | 'primary_release_date.desc' => {
    if (mode === 'popularity') return 'popularity.desc';
    if (mode === 'year_desc' || mode === 'year_asc') {
      return 'primary_release_date.desc';
    }
    return 'vote_average.desc';
  };

  // Live auto-fetch whenever modal opens or filters change
  useEffect(() => {
    if (!isOpen) return;
    let isCancelled = false;

    const timer = window.setTimeout(async () => {
      setLoading(true);
      setPage(1);

      const res = await advancedSearchTmdb({
        query,
        genreIds: selectedGenres,
        yearFrom: Math.min(yearFrom, yearTo),
        yearTo: Math.max(yearFrom, yearTo),
        minRating,
        page: 1,
        sortBy: resolveTmdbSortBy(sortMode),
        apiKey,
      });

      if (!isCancelled) {
        setResults(res.results);
        setHasApiKey(res.hasApiKey);
        setHasMore(res.hasMore);
        setLoading(false);
      }
    }, 220);

    return () => {
      isCancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    isOpen,
    query,
    selectedGenres,
    yearFrom,
    yearTo,
    minRating,
    sortMode,
    apiKey,
  ]);

  if (!isOpen) return null;

  const t = UI_TEXT[language];

  const handleLoadMore = async () => {
    if (loadingMore || loading || !hasMore) return;
    const nextPage = page + 1;
    setLoadingMore(true);

    const res = await advancedSearchTmdb({
      query,
      genreIds: selectedGenres,
      yearFrom: Math.min(yearFrom, yearTo),
      yearTo: Math.max(yearFrom, yearTo),
      minRating,
      page: nextPage,
      sortBy: resolveTmdbSortBy(sortMode),
      apiKey,
    });

    setResults((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const uniqueNew = res.results.filter((m) => !existingIds.has(m.id));
      return [...prev, ...uniqueNew];
    });
    setPage(nextPage);
    setHasMore(res.hasMore);
    setLoadingMore(false);
  };

  const isYearFiltered = yearFrom !== 1950 || yearTo !== CURRENT_YEAR;

  const hasActiveFilters =
    query.trim().length > 0 ||
    selectedGenres.length > 0 ||
    isYearFiltered ||
    minRating > 0 ||
    sortMode !== 'popularity';

  const toggleGenre = (genreId: number) => {
    setSelectedGenres((prev) =>
      prev.includes(genreId)
        ? prev.filter((id) => id !== genreId)
        : [...prev, genreId]
    );
  };

  const handleResetFilters = () => {
    setQuery('');
    setSelectedGenres([]);
    setYearFrom(1950);
    setYearTo(CURRENT_YEAR);
    setYearFromText('1950');
    setYearToText(String(CURRENT_YEAR));
    setMinRating(0);
    setSortMode('popularity');
    setOpenDropdown(null);
  };

  const handleSelectDecade = (from: number, to: number) => {
    setYearFrom(from);
    setYearTo(to);
    setYearFromText(String(from));
    setYearToText(String(to));
  };

  const commitYearFrom = (raw: string) => {
    const parsed = parseInt(raw, 10);
    const clamped = Number.isNaN(parsed)
      ? 1950
      : Math.max(MIN_YEAR_BOUND, Math.min(CURRENT_YEAR, parsed));
    setYearFrom(clamped);
    setYearFromText(String(clamped));
  };

  const commitYearTo = (raw: string) => {
    const parsed = parseInt(raw, 10);
    const clamped = Number.isNaN(parsed)
      ? CURRENT_YEAR
      : Math.max(MIN_YEAR_BOUND, Math.min(CURRENT_YEAR, parsed));
    setYearTo(clamped);
    setYearToText(String(clamped));
  };

  // Client-side sort refinement
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

  // Dynamic button labels for the 4 compact Letterboxd-style dropdown triggers
  const genresButtonLabel =
    selectedGenres.length === 0
      ? t.advFilterGenres
      : selectedGenres.length === 1
      ? (() => {
          const found = TMDB_GENRE_LIST.find((g) => g.id === selectedGenres[0]);
          return found
            ? language === 'en-US'
              ? found.nameEn
              : found.nameUk
            : `${t.advFilterGenres} (1)`;
        })()
      : `${t.advFilterGenres} (${selectedGenres.length})`;

  const yearsButtonLabel = !isYearFiltered
    ? t.advFilterYears
    : (() => {
        const preset = DECADE_PRESETS.find(
          (d) => d.from === yearFrom && d.to === yearTo && d.id !== 'all'
        );
        if (preset) {
          return language === 'en-US' ? preset.labelEn : preset.labelUk;
        }
        return yearFrom === yearTo
          ? `${yearFrom}`
          : `${Math.min(yearFrom, yearTo)}–${Math.max(yearFrom, yearTo)}`;
      })();

  const ratingButtonLabel =
    minRating > 0 ? `${minRating.toFixed(1).replace(/\.0$/, '')}+` : t.advFilterMinRating;

  const sortButtonLabel =
    sortMode === 'popularity'
      ? t.advSortPopular
      : sortMode === 'imdb'
      ? 'IMDb ↓'
      : sortMode === 'rt'
      ? 'RT ↓'
      : sortMode === 'lb'
      ? 'Letterboxd ↓'
      : sortMode === 'tmdb'
      ? 'TMDb ↓'
      : sortMode === 'year_desc'
      ? t.sortYearNewest
      : t.sortYearOldest;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-xs overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="w-full max-w-6xl rounded-[28px] bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-subtle)] shadow-2xl overflow-hidden my-auto h-[88vh] flex flex-col animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Single Letterboxd-Style Top Bar: Search + [Genres ▾] [Years ▾] [Rating ▾] [Sort ▾] + Reset + Close */}
        <div
          ref={toolbarRef}
          className="px-4 sm:px-6 py-3.5 border-b border-[var(--border-subtle)] flex flex-wrap items-center gap-2 shrink-0 bg-[var(--bg-card)] z-30"
        >
          {/* Compact Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <PiMagnifyingGlassBold className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.advQueryPlaceholder}
              className="w-full h-10 pl-10 pr-8 rounded-xl bg-[var(--bg-subcard)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] font-sans text-xs sm:text-sm font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
              >
                <PiXBold className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* 4 Compact Dropdown Triggers */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* 1. GENRES DROPDOWN */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setOpenDropdown((prev) =>
                    prev === 'genres' ? null : 'genres'
                  )
                }
                style={
                  selectedGenres.length > 0 || openDropdown === 'genres'
                    ? {
                        backgroundColor: 'var(--accent-primary)',
                        color: 'var(--accent-text)',
                      }
                    : undefined
                }
                className={`h-10 px-3.5 rounded-xl border border-[var(--border-subtle)] font-sans text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  selectedGenres.length > 0 || openDropdown === 'genres'
                    ? 'font-bold'
                    : 'bg-[var(--bg-subcard)] text-[var(--text-muted)] hover:text-[var(--text-main)] font-semibold'
                }`}
              >
                <span className="uppercase tracking-wider">
                  {genresButtonLabel}
                </span>
                <PiCaretDownBold
                  className={`w-3 h-3 transition-transform duration-150 ${
                    openDropdown === 'genres' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openDropdown === 'genres' && (
                <div className="absolute left-0 top-full mt-2 w-72 sm:w-80 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl p-3.5 space-y-2.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="font-sans text-[10px] font-bold tracking-wider uppercase text-[var(--text-muted)]">
                      {t.advFilterGenres}
                    </span>
                    {selectedGenres.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setSelectedGenres([])}
                        className="text-[10px] font-sans font-semibold text-emerald-400 hover:underline cursor-pointer"
                      >
                        {t.resetFilterBtn}
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    {TMDB_GENRE_LIST.map((genre) => {
                      const active = selectedGenres.includes(genre.id);
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
                          className={`px-2.5 py-1.5 rounded-xl font-sans text-xs flex items-center justify-between gap-1.5 transition-colors cursor-pointer ${
                            active
                              ? 'font-bold'
                              : 'bg-[var(--bg-subcard)]/70 hover:bg-[var(--bg-subcard)] text-[var(--text-main)] font-medium'
                          }`}
                        >
                          <span className="truncate">
                            {language === 'en-US' ? genre.nameEn : genre.nameUk}
                          </span>
                          {active && <PiCheckBold className="w-3 h-3 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 2. YEARS / DECADES DROPDOWN */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setOpenDropdown((prev) => (prev === 'years' ? null : 'years'))
                }
                style={
                  isYearFiltered || openDropdown === 'years'
                    ? {
                        backgroundColor: 'var(--accent-primary)',
                        color: 'var(--accent-text)',
                      }
                    : undefined
                }
                className={`h-10 px-3.5 rounded-xl border border-[var(--border-subtle)] font-sans text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  isYearFiltered || openDropdown === 'years'
                    ? 'font-bold'
                    : 'bg-[var(--bg-subcard)] text-[var(--text-muted)] hover:text-[var(--text-main)] font-semibold'
                }`}
              >
                <span className="uppercase tracking-wider tabular-nums">
                  {yearsButtonLabel}
                </span>
                <PiCaretDownBold
                  className={`w-3 h-3 transition-transform duration-150 ${
                    openDropdown === 'years' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openDropdown === 'years' && (
                <div className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-64 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl p-3.5 space-y-3 z-40 animate-in fade-in zoom-in-95 duration-150">
                  <div className="flex items-center justify-between px-0.5">
                    <span className="font-sans text-[10px] font-bold tracking-wider uppercase text-[var(--text-muted)]">
                      {t.advFilterYears}
                    </span>
                    {isYearFiltered && (
                      <button
                        type="button"
                        onClick={() => handleSelectDecade(1950, CURRENT_YEAR)}
                        className="text-[10px] font-sans font-semibold text-emerald-400 hover:underline cursor-pointer"
                      >
                        {t.resetFilterBtn}
                      </button>
                    )}
                  </div>

                  {/* Quick Decade Pills */}
                  <div className="grid grid-cols-2 gap-1.5">
                    {DECADE_PRESETS.map((dec, idx) => {
                      const active =
                        yearFrom === dec.from && yearTo === dec.to;
                      const isFirst = idx === 0;
                      return (
                        <button
                          key={dec.id}
                          type="button"
                          onClick={() => handleSelectDecade(dec.from, dec.to)}
                          style={
                            active
                              ? {
                                  backgroundColor: 'var(--accent-primary)',
                                  color: 'var(--accent-text)',
                                }
                              : undefined
                          }
                          className={`px-2.5 py-1.5 rounded-xl font-sans text-xs flex items-center justify-between transition-colors cursor-pointer ${
                            isFirst ? 'col-span-2' : ''
                          } ${
                            active
                              ? 'font-bold'
                              : 'bg-[var(--bg-subcard)]/70 hover:bg-[var(--bg-subcard)] text-[var(--text-main)] font-medium'
                          }`}
                        >
                          <span>
                            {language === 'en-US' ? dec.labelEn : dec.labelUk}
                          </span>
                          {active && <PiCheckBold className="w-3 h-3 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {/* Exact Year Range Inputs */}
                  <div className="pt-2.5 border-t border-[var(--border-subtle)] flex items-center justify-between gap-2">
                    <input
                      type="text"
                      inputMode="numeric"
                      value={yearFromText}
                      onChange={(e) =>
                        setYearFromText(
                          e.target.value.replace(/[^\d]/g, '').slice(0, 4)
                        )
                      }
                      onBlur={() => commitYearFrom(yearFromText)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitYearFrom(yearFromText);
                      }}
                      className="flex-1 min-w-0 h-8 px-2 rounded-xl bg-[var(--bg-subcard)] border border-[var(--border-subtle)] text-center font-mono-tabular text-xs font-bold text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                    <span className="text-xs text-[var(--text-muted)]">—</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={yearToText}
                      onChange={(e) =>
                        setYearToText(
                          e.target.value.replace(/[^\d]/g, '').slice(0, 4)
                        )
                      }
                      onBlur={() => commitYearTo(yearToText)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitYearTo(yearToText);
                      }}
                      className="flex-1 min-w-0 h-8 px-2 rounded-xl bg-[var(--bg-subcard)] border border-[var(--border-subtle)] text-center font-mono-tabular text-xs font-bold text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-primary)]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* 3. MIN. RATING DROPDOWN */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setOpenDropdown((prev) =>
                    prev === 'rating' ? null : 'rating'
                  )
                }
                style={
                  minRating > 0 || openDropdown === 'rating'
                    ? {
                        backgroundColor: 'var(--accent-primary)',
                        color: 'var(--accent-text)',
                      }
                    : undefined
                }
                className={`h-10 px-3.5 rounded-xl border border-[var(--border-subtle)] font-sans text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  minRating > 0 || openDropdown === 'rating'
                    ? 'font-bold'
                    : 'bg-[var(--bg-subcard)] text-[var(--text-muted)] hover:text-[var(--text-main)] font-semibold'
                }`}
              >
                <span className="uppercase tracking-wider tabular-nums">
                  {ratingButtonLabel}
                </span>
                <PiCaretDownBold
                  className={`w-3 h-3 transition-transform duration-150 ${
                    openDropdown === 'rating' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openDropdown === 'rating' && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl p-3 space-y-2 z-40 animate-in fade-in zoom-in-95 duration-150">
                  <span className="font-sans text-[10px] font-bold tracking-wider uppercase text-[var(--text-muted)] block px-0.5">
                    {t.advFilterMinRating}
                  </span>
                  <div className="flex flex-col gap-1">
                    {ratingOptions.map((opt) => {
                      const active = minRating === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setMinRating(opt.value);
                            setOpenDropdown(null);
                          }}
                          style={
                            active
                              ? {
                                  backgroundColor: 'var(--accent-primary)',
                                  color: 'var(--accent-text)',
                                }
                              : undefined
                          }
                          className={`px-3 py-1.5 rounded-xl font-sans text-xs tabular-nums flex items-center justify-between transition-colors cursor-pointer ${
                            active
                              ? 'font-bold'
                              : 'bg-[var(--bg-subcard)]/70 hover:bg-[var(--bg-subcard)] text-[var(--text-main)] font-medium'
                          }`}
                        >
                          <span>{opt.label}</span>
                          {active && <PiCheckBold className="w-3 h-3" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* 4. SORT DROPDOWN (matches the main page Sort popover!) */}
            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setOpenDropdown((prev) => (prev === 'sort' ? null : 'sort'))
                }
                style={
                  sortMode !== 'popularity' || openDropdown === 'sort'
                    ? {
                        backgroundColor: 'var(--accent-primary)',
                        color: 'var(--accent-text)',
                      }
                    : undefined
                }
                className={`h-10 px-3.5 rounded-xl border border-[var(--border-subtle)] font-sans text-xs flex items-center gap-1.5 transition-all cursor-pointer ${
                  sortMode !== 'popularity' || openDropdown === 'sort'
                    ? 'font-bold'
                    : 'bg-[var(--bg-subcard)] text-[var(--text-muted)] hover:text-[var(--text-main)] font-semibold'
                }`}
              >
                <span className="uppercase tracking-wider">
                  {sortButtonLabel}
                </span>
                <PiCaretDownBold
                  className={`w-3 h-3 transition-transform duration-150 ${
                    openDropdown === 'sort' ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {openDropdown === 'sort' && (
                <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl p-3.5 space-y-2.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                  <span className="font-sans text-[10px] font-bold tracking-wider uppercase text-[var(--text-muted)] block px-0.5">
                    {t.advFilterSortBy}
                  </span>

                  {/* 3-Tab Sort Switch: Популярність / Рейтинг / Рік */}
                  <div className="grid grid-cols-[1.25fr_1fr_0.8fr] gap-1 p-1 rounded-xl bg-[var(--bg-subcard)]">
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
                      className={`py-2 px-2.5 rounded-lg font-sans text-xs whitespace-nowrap transition-colors cursor-pointer ${
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
                      className={`py-2 px-2.5 rounded-lg font-sans text-xs whitespace-nowrap transition-colors cursor-pointer ${
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
                      className={`py-2 px-2.5 rounded-lg font-sans text-xs whitespace-nowrap transition-colors cursor-pointer ${
                        isYearSort
                          ? 'font-bold'
                          : 'font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      {t.sortGroupYear}
                    </button>
                  </div>

                  {/* Platform Sub-Picker when "Рейтинг" is active */}
                  {isRatingSort && (
                    <div className="grid grid-cols-4 gap-1.5 pt-0.5 animate-in fade-in duration-100">
                      {[
                        {
                          id: 'imdb' as AdvSortMode,
                          title: 'IMDb',
                          content: <ImdbIcon className="w-9 h-4.5" />,
                        },
                        {
                          id: 'rt' as AdvSortMode,
                          title: 'Rotten Tomatoes',
                          content: (
                            <span className="flex items-center gap-1 font-sans text-[11px] font-extrabold text-[var(--text-main)]">
                              <RottenTomatoesIcon className="w-4 h-4" />
                              <span>RT</span>
                            </span>
                          ),
                        },
                        {
                          id: 'lb' as AdvSortMode,
                          title: 'Letterboxd',
                          content: (
                            <span className="flex items-center gap-1 font-sans text-[11px] font-extrabold text-[var(--text-main)]">
                              <LetterboxdIcon className="w-5.5 h-2.5" />
                              <span>LB</span>
                            </span>
                          ),
                        },
                        {
                          id: 'tmdb' as AdvSortMode,
                          title: 'TMDb',
                          content: <TmdbIcon className="w-10 h-4.5" />,
                        },
                      ].map((plat) => {
                        const active = sortMode === plat.id;
                        return (
                          <button
                            key={plat.id}
                            type="button"
                            aria-label={plat.title}
                            onClick={() => setSortMode(plat.id)}
                            className={`group/plat relative h-9.5 rounded-xl border flex items-center justify-center transition-all cursor-pointer ${
                              active
                                ? 'bg-[var(--bg-subcard)] border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)] shadow-sm'
                                : 'bg-[var(--bg-subcard)]/50 border-transparent hover:bg-[var(--bg-subcard)] opacity-80 hover:opacity-100'
                            }`}
                          >
                            {plat.content}
                            <span className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-1.5 px-2 py-0.5 rounded-md bg-[#141419] text-white border border-white/15 text-[10px] font-sans font-semibold whitespace-nowrap shadow-xl opacity-0 scale-95 -translate-y-0.5 group-hover/plat:opacity-100 group-hover/plat:scale-100 group-hover/plat:translate-y-0 transition-all duration-150 z-50">
                              {plat.title}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Year Direction Sub-Picker when "За роком" is active */}
                  {isYearSort && (
                    <div className="grid grid-cols-2 gap-1.5 pt-0.5 animate-in fade-in duration-100">
                      <button
                        type="button"
                        onClick={() => setSortMode('year_desc')}
                        className={`py-1.5 px-2.5 rounded-lg font-sans text-[11px] border transition-all cursor-pointer ${
                          sortMode === 'year_desc'
                            ? 'bg-[var(--bg-subcard)] border-[var(--accent-primary)] font-bold'
                            : 'bg-[var(--bg-subcard)]/50 border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        {t.sortYearNewest}
                      </button>
                      <button
                        type="button"
                        onClick={() => setSortMode('year_asc')}
                        className={`py-1.5 px-2.5 rounded-lg font-sans text-[11px] border transition-all cursor-pointer ${
                          sortMode === 'year_asc'
                            ? 'bg-[var(--bg-subcard)] border-[var(--accent-primary)] font-bold'
                            : 'bg-[var(--bg-subcard)]/50 border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                        }`}
                      >
                        {t.sortYearOldest}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Reset Button (only shown when filters are modified) */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                aria-label={t.advResetFilters}
                className="group/btn relative w-10 h-10 rounded-xl bg-[var(--bg-subcard)] border border-[var(--border-subtle)] text-emerald-400 hover:text-emerald-300 flex items-center justify-center transition-colors cursor-pointer"
              >
                <PiArrowCounterClockwiseBold className="w-4 h-4" />
                <span className="pointer-events-none absolute top-full right-0 mt-2 px-2.5 py-1 rounded-lg bg-[#18181F] text-white border border-white/15 text-[11px] font-sans font-semibold whitespace-nowrap shadow-xl opacity-0 scale-95 -translate-y-1 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:translate-y-0 transition-all duration-150 z-30">
                  {t.advResetFilters}
                </span>
              </button>
            )}

            {/* Close Modal Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-10 h-10 rounded-xl bg-[var(--bg-subcard)] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center justify-center transition-colors cursor-pointer"
            >
              <PiXBold className="w-4.5 h-4.5" />
            </button>
          </div>
        </div>

        {/* Full-Height Poster Workspace (90% of Modal) */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1">
          {!hasApiKey ? (
            <div className="h-full min-h-[360px] rounded-2xl bg-[var(--bg-subcard)] border border-[var(--border-subtle)] p-10 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] flex items-center justify-center">
                <PiKeyBold className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 max-w-md">
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
          ) : loading ? (
            <div className="h-full min-h-[360px] flex items-center justify-center font-sans text-sm text-[var(--text-muted)]">
              {t.searchingTmdb}
            </div>
          ) : sortedResults.length === 0 ? (
            <div className="h-full min-h-[360px] rounded-2xl bg-[var(--bg-subcard)] border border-[var(--border-subtle)] p-10 flex flex-col items-center justify-center text-center space-y-3">
              <p className="font-sans text-sm text-[var(--text-muted)]">
                {t.advNoResults}
              </p>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--accent-text)',
                  }}
                  className="px-4 py-2 rounded-xl font-sans text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <PiArrowCounterClockwiseBold className="w-3.5 h-3.5" />
                  <span>{t.advResetFilters}</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 sm:gap-5">
                {sortedResults.map((movie) => {
                  const primaryTitle = getMovieTitle(movie, language);
                  const inPool = isMovieInPool(movie.id);
                  const inWatched = isMovieInWatched
                    ? isMovieInWatched(movie.id)
                    : false;
                  const inWishlist = isMovieInWishlist(movie.id);

                  return (
                    <article
                      key={movie.id}
                      onClick={() => onOpenMovieDetail(movie)}
                      className="group relative aspect-[2/3] w-full rounded-[22px] overflow-hidden bg-[#121216] border border-[var(--border-subtle)] hover:border-white/25 transition-all cursor-pointer select-none animate-movie-fade-in"
                    >
                      {movie.posterPath ? (
                        <img
                          src={movie.posterPath}
                          alt={primaryTitle}
                          referrerPolicy="no-referrer"
                          className={`w-full h-full object-cover group-hover:scale-[1.03] transition-all duration-300 ${
                            inWatched ? 'grayscale contrast-110 opacity-80' : ''
                          }`}
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
                          <PiFilmSlateBold className="w-9 h-9 text-zinc-500 mb-2" />
                          <span className="font-display text-sm text-white uppercase">
                            {primaryTitle}
                          </span>
                        </div>
                      )}

                      {/* Top Vignette on Hover */}
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/65 via-black/25 to-transparent opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-200" />

                      {/* Top-Right Hover Action Icons (Add to Library + Watched + Wishlist) */}
                      <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto transition-opacity duration-200">
                        <div className="group/btn">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!inPool) onAddToPool(movie);
                            }}
                            aria-label={
                              inPool ? t.addedToPoolTooltip : t.moveToRouletteTitle
                            }
                            className={`w-8 h-8 rounded-xl backdrop-blur-md flex items-center justify-center transition-all cursor-pointer ${
                              inPool
                                ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/25'
                                : 'bg-black/75 hover:bg-white text-white hover:text-black border border-white/10'
                            }`}
                          >
                            {inPool ? (
                              <PiCheckBold className="w-4 h-4" />
                            ) : (
                              <PiPlusBold className="w-4 h-4" />
                            )}
                          </button>
                          <span className="pointer-events-none absolute top-full right-0 mt-1.5 px-2.5 py-1 rounded-lg bg-[#18181F] text-white border border-white/15 text-[11px] font-sans font-semibold whitespace-nowrap shadow-xl opacity-0 scale-95 -translate-y-1 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:translate-y-0 transition-all duration-150 z-30">
                            {inPool
                              ? t.addedToPoolTooltip
                              : t.moveToRouletteTitle}
                          </span>
                        </div>

                        {onToggleWatched && (
                          <div className="group/btn">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleWatched(movie);
                              }}
                              aria-label={t.watchedStatusLabel}
                              className={`w-8 h-8 rounded-xl backdrop-blur-md flex items-center justify-center transition-all cursor-pointer ${
                                inWatched
                                  ? 'bg-white text-black shadow-md'
                                  : 'bg-black/75 hover:bg-white text-white/90 hover:text-black border border-white/10'
                              }`}
                            >
                              {inWatched ? (
                                <PiEyeFill className="w-4 h-4" />
                              ) : (
                                <PiEyeBold className="w-4 h-4" />
                              )}
                            </button>
                            <span className="pointer-events-none absolute top-full right-0 mt-1.5 px-2.5 py-1 rounded-lg bg-[#18181F] text-white border border-white/15 text-[11px] font-sans font-semibold whitespace-nowrap shadow-xl opacity-0 scale-95 -translate-y-1 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:translate-y-0 transition-all duration-150 z-30">
                              {t.watchedStatusLabel}
                            </span>
                          </div>
                        )}

                        <div className="group/btn">
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
                            className={`w-8 h-8 rounded-xl backdrop-blur-md flex items-center justify-center transition-all cursor-pointer ${
                              inWishlist
                                ? 'bg-white text-black shadow-md'
                                : 'bg-black/75 hover:bg-white text-white/90 hover:text-black border border-white/10'
                            }`}
                          >
                            {inWishlist ? (
                              <PiBookmarkSimpleFill className="w-4 h-4" />
                            ) : (
                              <PiBookmarkSimpleBold className="w-4 h-4" />
                            )}
                          </button>
                          <span className="pointer-events-none absolute top-full right-0 mt-1.5 px-2.5 py-1 rounded-lg bg-[#18181F] text-white border border-white/15 text-[11px] font-sans font-semibold whitespace-nowrap shadow-xl opacity-0 scale-95 -translate-y-1 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:translate-y-0 transition-all duration-150 z-30">
                            {inWishlist
                              ? t.removeFromWishlistTitle
                              : t.addToWishlistTitle}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              {/* Load More Pagination Button */}
              {hasMore && (
                <div className="pt-2 flex justify-center">
                  <button
                    type="button"
                    disabled={loadingMore}
                    onClick={handleLoadMore}
                    className="px-6 py-3 rounded-2xl bg-[var(--bg-subcard)] hover:bg-[var(--accent-primary)] text-[var(--text-main)] hover:text-[var(--accent-text)] border border-[var(--border-subtle)] font-sans text-xs font-bold uppercase tracking-wider transition-all cursor-pointer disabled:opacity-50"
                  >
                    {loadingMore ? t.searchingTmdb : t.advLoadMore}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
