import React, { useEffect, useRef, useState } from 'react';
import {
  Settings,
  Dices,
  Plus,
  Search,
  Trash2,
  Film,
  Check,
  Bookmark,
  SlidersHorizontal,
  ListFilter,
  RotateCcw,
} from 'lucide-react';
import {
  ColorThemeId,
  MovieItem,
  SecretOverrideConfig,
  TmdbConfigState,
  WheelCandidate,
} from './types/movie';
import {
  createCustomMovieItem,
  fetchTmdbMovieDetails,
  searchTmdbForAdding,
} from './services/tmdbService';
import { MovieCard, MoviePoolStatus } from './components/MovieCard';
import {
  ImdbIcon,
  LetterboxdIcon,
  RottenTomatoesIcon,
  TmdbIcon,
} from './components/MultiRatingBar';
import { CsRouletteModal } from './components/CsRouletteModal';
import { MovieDetailModal } from './components/MovieDetailModal';
import { SettingsPopover } from './components/SettingsPopover';
import { AdvancedSearchModal } from './components/AdvancedSearchModal';
import { getMovieAltTitle, getMovieTitle, UI_TEXT } from './utils/i18n';

const STORAGE_KEY_MY_MOVIES = 'kinoroulette_my_movies_v4';
const STORAGE_KEY_WISHLIST = 'kinoroulette_wishlist_v4';
const STORAGE_KEY_TMDB = 'kinoroulette_tmdb_config_v4';
const STORAGE_KEY_TMDB_PERMANENT_KEY = 'kinoroulette_tmdb_api_key';
const STORAGE_KEY_COLOR_THEME = 'kinoroulette_color_theme_v4';
const STORAGE_KEY_SECRET_OVERRIDE = 'kinoroulette_secret_override_v1';

type ListFilterMode =
  | 'all'
  | 'active_roulette'
  | 'chosen_bw'
  | 'watched'
  | 'in_pool'
  | 'not_in_pool'
  | 'in_wishlist'
  | 'rated';

type ListSortMode =
  | 'default'
  | 'imdb_desc'
  | 'rt_desc'
  | 'lb_desc'
  | 'tmdb_desc'
  | 'user_rating_desc'
  | 'year_desc'
  | 'year_asc';

function loadSavedTmdbConfig(): TmdbConfigState {
  let recoveredKey = '';
  let recoveredLang: 'uk-UA' | 'en-US' = 'uk-UA';

  try {
    const directKey = localStorage.getItem(STORAGE_KEY_TMDB_PERMANENT_KEY);
    if (directKey && directKey.trim().length > 5) {
      recoveredKey = directKey.trim();
    }

    const legacyKeys = [
      STORAGE_KEY_TMDB,
      'kinoroulette_tmdb_config_v3',
      'kinoroulette_tmdb_config_v2',
      'kinoroulette_tmdb_config',
    ];

    for (const k of legacyKeys) {
      const raw = localStorage.getItem(k);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          !recoveredKey &&
          parsed?.customApiKey &&
          String(parsed.customApiKey).trim().length > 5
        ) {
          recoveredKey = String(parsed.customApiKey).trim();
        }
        if (parsed?.language === 'en-US' || parsed?.language === 'uk-UA') {
          recoveredLang = parsed.language;
        }
      }
    }
  } catch {
    // ignore storage errors
  }

  return {
    mode: 'custom',
    customApiKey: recoveredKey,
    language: recoveredLang,
    lastSyncStatus: recoveredKey ? 'connected' : 'idle',
  };
}

export default function App() {
  // Strictly 2 Themes: Monochrome Dark with White Accents ('dark-white') & Pure White ('pure-white')
  const [colorTheme, setColorTheme] = useState<ColorThemeId>(() => {
    try {
      const saved = localStorage.getItem(
        STORAGE_KEY_COLOR_THEME
      ) as ColorThemeId | null;
      if (saved === 'dark-white' || saved === 'pure-white') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'dark-white';
  });

  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', colorTheme);
    if (colorTheme === 'pure-white') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
    try {
      localStorage.setItem(STORAGE_KEY_COLOR_THEME, colorTheme);
    } catch {
      // ignore
    }
  }, [colorTheme]);

  // TMDb API & Site Language Configuration (Always saves key permanently)
  const [tmdbConfig, setTmdbConfig] =
    useState<TmdbConfigState>(loadSavedTmdbConfig);

  const lang = tmdbConfig.language;
  const t = UI_TEXT[lang];

  // Active View Tab: 'pool' (Movies) vs 'wishlist' (Wishlist)
  const [activeListTab, setActiveListTab] = useState<'pool' | 'wishlist'>(
    'pool'
  );

  // Filter & Sort state for the active list
  const [listFilter, setListFilter] = useState<ListFilterMode>('all');
  const [listSort, setListSort] = useState<ListSortMode>('default');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState<boolean>(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  // Personal Movie List (Starts empty)
  const [myMovies, setMyMovies] = useState<MovieItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_MY_MOVIES);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Personal Wishlist (Starts empty)
  const [wishlistMovies, setWishlistMovies] = useState<MovieItem[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_WISHLIST);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // ignore
    }
    return [];
  });

  // Secret Replacement Movie (1% Override)
  const [secretOverride, setSecretOverride] = useState<SecretOverrideConfig>(
    () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_SECRET_OVERRIDE);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed && typeof parsed.chancePercent === 'number') {
            return {
              movie: parsed.movie || null,
              chancePercent: parsed.chancePercent,
            };
          }
        }
      } catch {
        // ignore
      }
      return { movie: null, chancePercent: 1 };
    }
  );

  // TMDb Quick Search state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<MovieItem[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [hasValidApiKey, setHasValidApiKey] = useState<boolean>(
    Boolean(tmdbConfig.customApiKey && tmdbConfig.customApiKey.trim().length > 5)
  );

  // Modals & Popovers
  const [isSettingsPopoverOpen, setIsSettingsPopoverOpen] =
    useState<boolean>(false);
  const [isAdvancedSearchOpen, setIsAdvancedSearchOpen] =
    useState<boolean>(false);
  const [isRouletteModalOpen, setIsRouletteModalOpen] =
    useState<boolean>(false);
  const [selectedMovieModal, setSelectedMovieModal] = useState<{
    movie: MovieItem;
    autoPlayTrailer: boolean;
  } | null>(null);

  // Close Filter Menu on outside click
  useEffect(() => {
    if (!isFilterMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        filterMenuRef.current &&
        !filterMenuRef.current.contains(e.target as Node)
      ) {
        setIsFilterMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isFilterMenuOpen]);

  // Reset tab-specific filters when switching between Pool and Wishlist
  const handleSwitchListTab = (nextTab: 'pool' | 'wishlist') => {
    setActiveListTab(nextTab);
    setIsFilterMenuOpen(false);
    if (
      nextTab === 'wishlist' &&
      (listFilter === 'active_roulette' ||
        listFilter === 'chosen_bw' ||
        listFilter === 'watched' ||
        listFilter === 'in_wishlist')
    ) {
      setListFilter('all');
    } else if (
      nextTab === 'pool' &&
      (listFilter === 'in_pool' || listFilter === 'not_in_pool')
    ) {
      setListFilter('all');
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_MY_MOVIES, JSON.stringify(myMovies));
    } catch {
      // ignore
    }
  }, [myMovies]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_WISHLIST,
        JSON.stringify(wishlistMovies)
      );
    } catch {
      // ignore
    }
  }, [wishlistMovies]);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY_SECRET_OVERRIDE,
        JSON.stringify(secretOverride)
      );
    } catch {
      // ignore
    }
  }, [secretOverride]);

  // Always persist TMDb config & permanent API key
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY_TMDB, JSON.stringify(tmdbConfig));
      if (tmdbConfig.customApiKey && tmdbConfig.customApiKey.trim().length > 5) {
        localStorage.setItem(
          STORAGE_KEY_TMDB_PERMANENT_KEY,
          tmdbConfig.customApiKey.trim()
        );
      }
    } catch {
      // ignore
    }
  }, [tmdbConfig]);

  // Live TMDb Quick Search as user types
  useEffect(() => {
    let isCancelled = false;

    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const timer = setTimeout(async () => {
      const res = await searchTmdbForAdding({
        query: searchQuery,
        apiKey: tmdbConfig.customApiKey,
        language: tmdbConfig.language,
      });
      if (!isCancelled) {
        setSearchResults(res.results);
        setHasValidApiKey(res.hasApiKey);
        setIsSearching(false);
      }
    }, 220);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery, tmdbConfig]);

  const isMovieInPool = (movieId: string) =>
    myMovies.some((m) => m.id === movieId);

  const isMovieInWishlist = (movieId: string) =>
    wishlistMovies.some((m) => m.id === movieId);

  // Move a wishlist item to the end of wishlistMovies when it is added to the pool
  const moveWishlistItemToEnd = (movieId: string) => {
    setWishlistMovies((prev) => {
      const target = prev.find((m) => m.id === movieId);
      if (!target) return prev;
      return [...prev.filter((m) => m.id !== movieId), target];
    });
  };

  const handleAddMovieToActiveList = async (movie: MovieItem) => {
    let finalMovie: MovieItem = {
      ...movie,
      isChosen: false,
      excludeFromRoulette: false,
    };
    if (tmdbConfig.customApiKey.trim().length > 5) {
      const enriched = await fetchTmdbMovieDetails(
        movie,
        tmdbConfig.customApiKey
      );
      finalMovie = {
        ...enriched,
        isChosen: false,
        excludeFromRoulette: false,
      };
    }

    if (activeListTab === 'wishlist') {
      if (!isMovieInWishlist(finalMovie.id)) {
        setWishlistMovies((prev) =>
          isMovieInPool(finalMovie.id)
            ? [...prev, finalMovie]
            : [finalMovie, ...prev]
        );
      }
    } else {
      if (!isMovieInPool(finalMovie.id)) {
        setMyMovies((prev) => [finalMovie, ...prev]);
        moveWishlistItemToEnd(finalMovie.id);
      }
    }

    setSearchQuery('');
    setSearchResults([]);
  };

  const handleAddMovieToPoolDirect = async (movie: MovieItem) => {
    let finalMovie: MovieItem = {
      ...movie,
      isChosen: false,
      excludeFromRoulette: false,
    };
    if (tmdbConfig.customApiKey.trim().length > 5) {
      const enriched = await fetchTmdbMovieDetails(
        movie,
        tmdbConfig.customApiKey
      );
      finalMovie = {
        ...enriched,
        isChosen: false,
        excludeFromRoulette: false,
      };
    }
    if (!isMovieInPool(finalMovie.id)) {
      setMyMovies((prev) => [finalMovie, ...prev]);
      moveWishlistItemToEnd(finalMovie.id);
    }
  };

  const handleAddCustomTitle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (searchResults.length > 0) {
      handleAddMovieToActiveList(searchResults[0]);
      return;
    }

    const customMovie = createCustomMovieItem(searchQuery.trim());
    if (activeListTab === 'wishlist') {
      setWishlistMovies((prev) => [customMovie, ...prev]);
    } else {
      setMyMovies((prev) => [customMovie, ...prev]);
    }
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleToggleWishlist = (movie: MovieItem) => {
    if (isMovieInWishlist(movie.id)) {
      setWishlistMovies((prev) => prev.filter((m) => m.id !== movie.id));
    } else {
      setWishlistMovies((prev) =>
        isMovieInPool(movie.id) ? [...prev, movie] : [movie, ...prev]
      );
    }
  };

  // When adding a movie from Wishlist to Pool, its icon turns green (Check) and the movie moves to the end of the Wishlist
  const handleMoveFromWishlistToPool = (movie: MovieItem) => {
    if (!isMovieInPool(movie.id)) {
      setMyMovies((prev) => [
        { ...movie, isChosen: false, excludeFromRoulette: false },
        ...prev,
      ]);
      setWishlistMovies((prev) => {
        const rest = prev.filter((m) => m.id !== movie.id);
        return [...rest, movie];
      });
    } else {
      setMyMovies((prev) => prev.filter((m) => m.id !== movie.id));
    }
  };

  // Automatically turns the movie Black & White in the Movies list AND removes it from future roulette spins
  const handleWinnerSelected = (winnerMovie: MovieItem) => {
    setMyMovies((prev) =>
      prev.map((m) =>
        m.id === winnerMovie.id
          ? {
              ...m,
              isChosen: true,
              isWatched: false,
              excludeFromRoulette: true,
            }
          : m
      )
    );
    setSelectedMovieModal((prev) =>
      prev && prev.movie.id === winnerMovie.id
        ? {
            ...prev,
            movie: {
              ...prev.movie,
              isChosen: true,
              isWatched: false,
              excludeFromRoulette: true,
            },
          }
        : prev
    );
  };

  // Set or clear movie status ('watched' | 'chosen' | 'none') from the poster hover menu
  const handleSetMovieStatus = (movie: MovieItem, status: MoviePoolStatus) => {
    const nextChosen = status === 'chosen';
    const nextWatched = status === 'watched';
    const nextExclude = nextChosen || nextWatched;

    setMyMovies((prev) =>
      prev.map((m) =>
        m.id === movie.id
          ? {
              ...m,
              isChosen: nextChosen,
              isWatched: nextWatched,
              excludeFromRoulette: nextExclude,
            }
          : m
      )
    );
    setSelectedMovieModal((prev) =>
      prev && prev.movie.id === movie.id
        ? {
            ...prev,
            movie: {
              ...prev.movie,
              isChosen: nextChosen,
              isWatched: nextWatched,
              excludeFromRoulette: nextExclude,
            },
          }
        : prev
    );
  };

  // Restore an already-chosen or watched (Black & White) movie back into the active roulette pool
  const handleRestoreToRoulette = (movie: MovieItem) => {
    setMyMovies((prev) =>
      prev.map((m) =>
        m.id === movie.id
          ? {
              ...m,
              isChosen: false,
              isWatched: false,
              excludeFromRoulette: false,
            }
          : m
      )
    );
    setSelectedMovieModal((prev) =>
      prev && prev.movie.id === movie.id
        ? {
            ...prev,
            movie: {
              ...prev.movie,
              isChosen: false,
              isWatched: false,
              excludeFromRoulette: false,
            },
          }
        : prev
    );
  };

  // Set or clear personal Letterboxd 0.5–5.0 star rating on a movie
  const handleRateMovie = (movieId: string, rating: number | undefined) => {
    setMyMovies((prev) =>
      prev.map((m) => (m.id === movieId ? { ...m, userRating: rating } : m))
    );
    setWishlistMovies((prev) =>
      prev.map((m) => (m.id === movieId ? { ...m, userRating: rating } : m))
    );
    setSelectedMovieModal((prev) =>
      prev && prev.movie.id === movieId
        ? { ...prev, movie: { ...prev.movie, userRating: rating } }
        : prev
    );
  };

  const handleRemoveFromCurrentView = (movieId: string) => {
    if (activeListTab === 'wishlist') {
      setWishlistMovies((prev) => prev.filter((m) => m.id !== movieId));
    } else {
      setMyMovies((prev) => prev.filter((m) => m.id !== movieId));
    }
  };

  const handleRemoveFromPool = (movieId: string) => {
    setMyMovies((prev) => prev.filter((m) => m.id !== movieId));
  };

  const handleClearActiveList = () => {
    if (activeListTab === 'wishlist') {
      setWishlistMovies([]);
    } else {
      setMyMovies([]);
    }
  };

  const handleOpenMovieDetail = async (
    movie: MovieItem,
    autoPlayTrailer = false
  ) => {
    setSelectedMovieModal({ movie, autoPlayTrailer });
    if (tmdbConfig.customApiKey.trim().length > 5) {
      const enriched = await fetchTmdbMovieDetails(
        movie,
        tmdbConfig.customApiKey
      );
      const merged: MovieItem = {
        ...enriched,
        isChosen: movie.isChosen,
        isWatched: movie.isWatched,
        excludeFromRoulette: movie.excludeFromRoulette,
        userRating: movie.userRating,
      };
      setMyMovies((prev) =>
        prev.map((m) => (m.id === movie.id ? merged : m))
      );
      setWishlistMovies((prev) =>
        prev.map((m) => (m.id === movie.id ? merged : m))
      );
      setSelectedMovieModal((prev) =>
        prev && prev.movie.id === movie.id
          ? { ...prev, movie: merged }
          : prev
      );
    }
  };

  const rawActiveList =
    activeListTab === 'wishlist' ? wishlistMovies : myMovies;

  // Apply Filter
  const filteredMovies = rawActiveList.filter((movie) => {
    if (listFilter === 'all') return true;
    if (listFilter === 'active_roulette') {
      return !movie.isChosen && !movie.isWatched && !movie.excludeFromRoulette;
    }
    if (listFilter === 'chosen_bw') {
      return Boolean(movie.isChosen);
    }
    if (listFilter === 'watched') {
      return Boolean(movie.isWatched);
    }
    if (listFilter === 'in_pool') {
      return isMovieInPool(movie.id);
    }
    if (listFilter === 'not_in_pool') {
      return !isMovieInPool(movie.id);
    }
    if (listFilter === 'in_wishlist') {
      return isMovieInWishlist(movie.id);
    }
    if (listFilter === 'rated') {
      return typeof movie.userRating === 'number' && movie.userRating > 0;
    }
    return true;
  });

  // Apply Sort (in Wishlist default order, movies added to pool automatically go to the end)
  const displayedMovies = [...filteredMovies].sort((a, b) => {
    if (listSort === 'default') {
      if (activeListTab === 'wishlist') {
        const aInPool = isMovieInPool(a.id) ? 1 : 0;
        const bInPool = isMovieInPool(b.id) ? 1 : 0;
        return aInPool - bInPool;
      }
      return 0;
    }
    if (listSort === 'imdb_desc') {
      return b.ratings.imdb.score - a.ratings.imdb.score;
    }
    if (listSort === 'rt_desc') {
      return (
        b.ratings.rottenTomatoes.tomatometer -
        a.ratings.rottenTomatoes.tomatometer
      );
    }
    if (listSort === 'lb_desc') {
      return b.ratings.letterboxd.score - a.ratings.letterboxd.score;
    }
    if (listSort === 'tmdb_desc') {
      return b.ratings.tmdb.score - a.ratings.tmdb.score;
    }
    if (listSort === 'user_rating_desc') {
      return (b.userRating || 0) - (a.userRating || 0);
    }
    if (listSort === 'year_desc') {
      return b.releaseYear - a.releaseYear;
    }
    if (listSort === 'year_asc') {
      return a.releaseYear - b.releaseYear;
    }
    return 0;
  });

  const hasActiveFilterOrSort =
    listFilter !== 'all' || listSort !== 'default';

  const isRatingSort =
    listSort === 'imdb_desc' ||
    listSort === 'rt_desc' ||
    listSort === 'lb_desc' ||
    listSort === 'tmdb_desc' ||
    listSort === 'user_rating_desc';

  const isYearSort = listSort === 'year_desc' || listSort === 'year_asc';

  const filterOptionsForTab: Array<{
    id: ListFilterMode;
    label: string;
    count: number;
  }> =
    activeListTab === 'wishlist'
      ? [
          {
            id: 'all',
            label: t.filterAll,
            count: wishlistMovies.length,
          },
          {
            id: 'not_in_pool',
            label: t.filterNotInPool,
            count: wishlistMovies.filter((m) => !isMovieInPool(m.id)).length,
          },
          {
            id: 'in_pool',
            label: t.filterInPool,
            count: wishlistMovies.filter((m) => isMovieInPool(m.id)).length,
          },
          {
            id: 'rated',
            label: t.filterRated,
            count: wishlistMovies.filter(
              (m) => typeof m.userRating === 'number' && m.userRating > 0
            ).length,
          },
        ]
      : [
          {
            id: 'all',
            label: t.filterAll,
            count: myMovies.length,
          },
          {
            id: 'active_roulette',
            label: t.filterActiveRoulette,
            count: myMovies.filter(
              (m) => !m.isChosen && !m.isWatched && !m.excludeFromRoulette
            ).length,
          },
          {
            id: 'chosen_bw',
            label: t.filterChosenBw,
            count: myMovies.filter((m) => Boolean(m.isChosen)).length,
          },
          {
            id: 'watched',
            label: t.filterWatched,
            count: myMovies.filter((m) => Boolean(m.isWatched)).length,
          },
          {
            id: 'rated',
            label: t.filterRated,
            count: myMovies.filter(
              (m) => typeof m.userRating === 'number' && m.userRating > 0
            ).length,
          },
        ];

  // Only movies that have NOT been chosen or watched participate in the roulette
  const rouletteCandidates: WheelCandidate[] = myMovies
    .filter(
      (movie) =>
        !movie.isChosen && !movie.isWatched && !movie.excludeFromRoulette
    )
    .map((movie) => ({
      movie,
    }));

  return (
    <div className="min-h-screen bg-[var(--bg-page)] text-[var(--text-main)] transition-colors duration-200 px-4 sm:px-7 lg:px-10 xl:px-12 py-6 lg:py-9">
      <div className="max-w-[1840px] mx-auto flex flex-col lg:flex-row gap-7 lg:gap-10 items-start">
        {/* LEFT CONTROL STUDIO: Clean & Minimalist */}
        <aside className="w-full lg:w-[400px] xl:w-[420px] shrink-0 rounded-[28px] bg-[var(--bg-card)] border border-[var(--border-subtle)] p-6 sm:p-8 flex flex-col gap-5 lg:sticky lg:top-8 shadow-sm">
          {/* Top Bar inside Left Card: Subtle Brand Overline + Icon-Only Settings Button */}
          <div className="flex items-center justify-between">
            <span className="font-sans text-xs font-bold tracking-[0.22em] text-[var(--text-muted)] uppercase">
              {t.brand}
            </span>

            <button
              type="button"
              onClick={() => setIsSettingsPopoverOpen(true)}
              aria-label={t.settings}
              className="group/btn relative w-10 h-10 rounded-xl bg-[var(--bg-subcard)] hover:opacity-85 border border-[var(--border-subtle)] flex items-center justify-center transition-opacity cursor-pointer"
            >
              <Settings className="w-4.5 h-4.5" />
              <span className="pointer-events-none absolute top-full right-0 mt-2 px-2.5 py-1 rounded-lg bg-[#18181F] text-white border border-white/15 text-[11px] font-sans font-semibold whitespace-nowrap shadow-xl opacity-0 scale-95 -translate-y-1 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:translate-y-0 transition-all duration-150 z-30">
                {t.settings}
              </span>
            </button>
          </div>

          {/* Distinct Display Headline */}
          <h1 className="font-display text-2xl sm:text-[28px] font-extrabold uppercase leading-[1.18] tracking-tight">
            {t.headline}
          </h1>

          {/* 1. Quick Search Input + Icon-Only Advanced Search Button right next to it */}
          <div className="space-y-3 relative">
            <div className="flex items-center gap-2.5">
              <form
                onSubmit={handleAddCustomTitle}
                className="relative flex-1 min-w-0"
              >
                <Search className="w-4.5 h-4.5 text-[var(--text-muted)] absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  className="w-full pl-11 pr-24 py-3.5 rounded-2xl bg-[var(--bg-subcard)] border border-[var(--border-subtle)] font-sans text-sm font-medium text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
                {searchQuery.trim() && (
                  <button
                    type="submit"
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--accent-text)',
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-xl font-sans text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t.addBtn}</span>
                  </button>
                )}
              </form>

              {/* Icon-Only Advanced Search Button next to Search Input */}
              <button
                type="button"
                onClick={() => setIsAdvancedSearchOpen(true)}
                aria-label={t.advancedSearchBtn}
                className="group/btn relative w-[50px] h-[50px] shrink-0 rounded-2xl bg-[var(--bg-subcard)] hover:opacity-90 border border-[var(--border-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-all cursor-pointer"
              >
                <SlidersHorizontal className="w-4.5 h-4.5" />
                <span className="pointer-events-none absolute bottom-full right-0 mb-2 px-2.5 py-1 rounded-lg bg-[#18181F] text-white border border-white/15 text-[11px] font-sans font-semibold whitespace-nowrap shadow-xl opacity-0 scale-95 translate-y-1 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:translate-y-0 transition-all duration-150 z-30">
                  {t.advancedSearchBtn}
                </span>
              </button>
            </div>

            {/* Live TMDb Quick Search Results Dropdown with Dual Titles (UA + EN) */}
            {searchQuery.trim() && (
              <div className="rounded-2xl bg-[var(--bg-subcard)] border border-[var(--border-subtle)] overflow-hidden shadow-xl max-h-[380px] overflow-y-auto divide-y divide-[var(--border-subtle)]">
                {isSearching ? (
                  <div className="p-5 text-sm text-[var(--text-muted)] text-center">
                    {t.searchingTmdb}
                  </div>
                ) : searchResults.length > 0 ? (
                  <>
                    {searchResults.map((item) => {
                      const alreadyInActive =
                        activeListTab === 'wishlist'
                          ? isMovieInWishlist(item.id)
                          : isMovieInPool(item.id);
                      const itemTitle = getMovieTitle(item, lang);
                      const altTitle = getMovieAltTitle(item, lang);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={alreadyInActive}
                          onClick={() => handleAddMovieToActiveList(item)}
                          className="w-full p-3.5 flex items-center justify-between gap-3.5 text-left hover:bg-black/10 dark:hover:bg-white/5 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {item.posterPath ? (
                              <img
                                src={item.posterPath}
                                alt={itemTitle}
                                referrerPolicy="no-referrer"
                                className="w-11 h-16 object-cover rounded-lg shrink-0"
                              />
                            ) : (
                              <div className="w-11 h-16 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                                <Film className="w-5 h-5 text-zinc-400" />
                              </div>
                            )}
                            <div className="min-w-0 space-y-0.5">
                              <div className="font-sans text-sm font-bold truncate">
                                {itemTitle}
                              </div>
                              {altTitle && (
                                <div className="text-xs font-medium text-[var(--text-muted)] truncate">
                                  {altTitle}
                                </div>
                              )}
                              <div className="text-xs text-[var(--text-muted)] tabular-nums">
                                {item.releaseYear}
                              </div>
                            </div>
                          </div>

                          <span
                            style={
                              alreadyInActive
                                ? undefined
                                : {
                                    backgroundColor: 'var(--accent-primary)',
                                    color: 'var(--accent-text)',
                                  }
                            }
                            className={`px-3 py-2 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1 ${
                              alreadyInActive
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : ''
                            }`}
                          >
                            {alreadyInActive ? (
                              <>
                                <Check className="w-3.5 h-3.5" />
                                <span>{t.addedBtn}</span>
                              </>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>{t.addBtn}</span>
                              </>
                            )}
                          </span>
                        </button>
                      );
                    })}
                  </>
                ) : (
                  <div className="p-5 space-y-3 text-center">
                    <p className="text-sm text-[var(--text-muted)]">
                      {hasValidApiKey ? t.noExactMatch : t.noApiKeyShort}
                    </p>
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      {!hasValidApiKey && (
                        <button
                          type="button"
                          onClick={() => setIsSettingsPopoverOpen(true)}
                          className="px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs font-semibold uppercase cursor-pointer"
                        >
                          {t.settings}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={handleAddCustomTitle}
                        style={{
                          backgroundColor: 'var(--accent-primary)',
                          color: 'var(--accent-text)',
                        }}
                        className="px-4 py-2.5 rounded-xl text-xs font-semibold uppercase inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>
                          {t.addCustomBtn} «{searchQuery}»
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2. Minimalist Cohesive "КРУТИТИ РУЛЕТКУ" Button + "ФІЛЬМИ" & Icon-Only Wishlist Switcher */}
          <div className="space-y-2.5 pt-3 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              disabled={rouletteCandidates.length === 0}
              onClick={() => setIsRouletteModalOpen(true)}
              className="w-full h-[52px] px-4 rounded-2xl bg-[var(--bg-subcard)] hover:bg-[var(--accent-primary)] text-[var(--text-main)] hover:text-[var(--accent-text)] border border-white/15 disabled:opacity-35 font-sans text-sm font-bold tracking-wider uppercase flex items-center justify-between transition-colors duration-150 cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <Dices className="w-4.5 h-4.5" />
                <span>{t.spinRoulette}</span>
              </span>
              <span className="tabular-nums text-xs font-bold px-2.5 py-1 rounded-lg bg-black/20 dark:bg-white/10">
                {rouletteCandidates.length}
              </span>
            </button>

            {/* "ФІЛЬМИ" Button + Icon-Only Wishlist Button right next to it */}
            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleSwitchListTab('pool')}
                style={
                  activeListTab === 'pool'
                    ? {
                        backgroundColor: 'var(--accent-primary)',
                        color: 'var(--accent-text)',
                      }
                    : undefined
                }
                className={`flex-1 h-[48px] px-4 rounded-2xl border border-[var(--border-subtle)] font-sans text-xs font-bold tracking-wider uppercase flex items-center justify-between transition-all cursor-pointer ${
                  activeListTab === 'pool'
                    ? ''
                    : 'bg-[var(--bg-subcard)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <span className="truncate">{t.myMoviesTab}</span>
                <span className="tabular-nums ml-1.5">
                  {myMovies.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchListTab('wishlist')}
                aria-label={t.wishlistTab}
                style={
                  activeListTab === 'wishlist'
                    ? {
                        backgroundColor: 'var(--accent-primary)',
                        color: 'var(--accent-text)',
                      }
                    : undefined
                }
                className={`group/btn relative w-[48px] h-[48px] shrink-0 rounded-2xl border border-[var(--border-subtle)] flex items-center justify-center transition-all cursor-pointer ${
                  activeListTab === 'wishlist'
                    ? ''
                    : 'bg-[var(--bg-subcard)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <Bookmark
                  className={`w-4.5 h-4.5 ${
                    activeListTab === 'wishlist' ? 'fill-current' : ''
                  }`}
                />
                <span className="pointer-events-none absolute bottom-full right-0 mb-2 px-2.5 py-1 rounded-lg bg-[#18181F] text-white border border-white/15 text-[11px] font-sans font-semibold whitespace-nowrap shadow-xl opacity-0 scale-95 translate-y-1 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:translate-y-0 transition-all duration-150 z-30">
                  {t.wishlistTab} ({wishlistMovies.length})
                </span>
              </button>
            </div>
          </div>
        </aside>

        {/* RIGHT WORKSPACE: Header with Title on Left, Filter Icon + Clear List on Top-Right */}
        <main className="flex-1 min-w-0 w-full">
          {rawActiveList.length === 0 ? (
            <section className="min-h-[540px] rounded-[28px] bg-[var(--bg-card)] border border-[var(--border-subtle)] p-8 sm:p-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-[var(--bg-subcard)] border border-[var(--border-subtle)] flex items-center justify-center">
                {activeListTab === 'wishlist' ? (
                  <Bookmark className="w-7 h-7" />
                ) : (
                  <Film className="w-7 h-7" />
                )}
              </div>

              <h2 className="font-display text-xl sm:text-2xl font-extrabold uppercase tracking-tight">
                {activeListTab === 'wishlist'
                  ? t.emptyWishlistTitle
                  : t.emptyPoolTitle}
              </h2>
            </section>
          ) : (
            <section className="space-y-5">
              {/* Top Section Header: "ФІЛЬМИ" / "СПИСОК БАЖАНОГО" on left, Filter Icon + "Очистити список" on top-right */}
              <div className="px-1 flex items-center justify-between gap-4">
                <h2 className="font-display text-xl sm:text-2xl font-extrabold uppercase tracking-tight">
                  {activeListTab === 'wishlist' ? t.wishlistTab : t.myMoviesTab}
                </h2>

                <div className="flex items-center gap-2">
                  {/* Compact Filter & Sort Icon Button + Dropdown Menu */}
                  <div ref={filterMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setIsFilterMenuOpen((prev) => !prev)}
                      aria-label={t.filterAndSortTitle}
                      style={
                        hasActiveFilterOrSort || isFilterMenuOpen
                          ? {
                              backgroundColor: 'var(--accent-primary)',
                              color: 'var(--accent-text)',
                            }
                          : undefined
                      }
                      className={`group/btn relative w-9 h-9 rounded-xl border border-[var(--border-subtle)] flex items-center justify-center transition-all cursor-pointer ${
                        hasActiveFilterOrSort || isFilterMenuOpen
                          ? ''
                          : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                      }`}
                    >
                      <ListFilter className="w-4 h-4" />
                      {hasActiveFilterOrSort && !isFilterMenuOpen && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[var(--bg-page)]" />
                      )}
                      {!isFilterMenuOpen && (
                        <span className="pointer-events-none absolute bottom-full right-0 mb-2 px-2.5 py-1 rounded-lg bg-[#18181F] text-white border border-white/15 text-[11px] font-sans font-semibold whitespace-nowrap shadow-xl opacity-0 scale-95 translate-y-1 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:translate-y-0 transition-all duration-150 z-30">
                          {t.filterAndSortTitle}
                        </span>
                      )}
                    </button>

                    {isFilterMenuOpen && (
                      <div className="absolute right-0 top-full mt-2 w-64 sm:w-68 rounded-2xl bg-[var(--bg-card)] border border-[var(--border-subtle)] shadow-2xl p-3.5 space-y-3.5 z-40 animate-in fade-in zoom-in-95 duration-150">
                        {/* 1. Compact 2x2 Filter Pills */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between px-0.5">
                            <span className="font-sans text-[10px] font-bold tracking-wider uppercase text-[var(--text-muted)]">
                              {t.filterSectionLabel}
                            </span>
                            {hasActiveFilterOrSort && (
                              <button
                                type="button"
                                onClick={() => {
                                  setListFilter('all');
                                  setListSort('default');
                                }}
                                className="text-[10px] font-sans font-semibold text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                              >
                                <RotateCcw className="w-2.5 h-2.5" />
                                <span>{t.resetFilterBtn}</span>
                              </button>
                            )}
                          </div>

                          <div className="grid grid-cols-2 gap-1.5">
                            {filterOptionsForTab.map((opt, idx) => {
                              const active = listFilter === opt.id;
                              const isLastOdd =
                                filterOptionsForTab.length % 2 === 1 &&
                                idx === filterOptionsForTab.length - 1;
                              return (
                                <button
                                  key={opt.id}
                                  type="button"
                                  onClick={() => setListFilter(opt.id)}
                                  style={
                                    active
                                      ? {
                                          backgroundColor:
                                            'var(--accent-primary)',
                                          color: 'var(--accent-text)',
                                        }
                                      : undefined
                                  }
                                  className={`px-2.5 py-1.5 rounded-xl font-sans text-[11px] font-medium flex items-center justify-between gap-1.5 transition-colors cursor-pointer ${
                                    isLastOdd ? 'col-span-2' : ''
                                  } ${
                                    active
                                      ? 'font-bold'
                                      : 'bg-[var(--bg-subcard)]/70 hover:bg-[var(--bg-subcard)] text-[var(--text-main)]'
                                  }`}
                                >
                                  <span className="truncate">{opt.label}</span>
                                  <span
                                    className={`tabular-nums text-[10px] shrink-0 ${
                                      active
                                        ? 'opacity-80 font-bold'
                                        : 'text-[var(--text-muted)]'
                                    }`}
                                  >
                                    {opt.count}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* 2. Compact Sort Mode Selector + Platform / Year Sub-Switch */}
                        <div className="space-y-2 pt-2.5 border-t border-[var(--border-subtle)]">
                          <span className="font-sans text-[10px] font-bold tracking-wider uppercase text-[var(--text-muted)] block px-0.5">
                            {t.sortSectionLabel}
                          </span>

                          {/* 3-Tab Sort Mode Switch */}
                          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-[var(--bg-subcard)]">
                            <button
                              type="button"
                              onClick={() => setListSort('default')}
                              style={
                                listSort === 'default'
                                  ? {
                                      backgroundColor: 'var(--accent-primary)',
                                      color: 'var(--accent-text)',
                                    }
                                  : undefined
                              }
                              className={`py-1.5 px-1.5 rounded-lg font-sans text-[11px] transition-colors truncate cursor-pointer ${
                                listSort === 'default'
                                  ? 'font-bold'
                                  : 'font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]'
                              }`}
                            >
                              {t.sortGroupDefault}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (!isRatingSort) {
                                  setListSort('imdb_desc');
                                }
                              }}
                              style={
                                isRatingSort
                                  ? {
                                      backgroundColor: 'var(--accent-primary)',
                                      color: 'var(--accent-text)',
                                    }
                                  : undefined
                              }
                              className={`py-1.5 px-1.5 rounded-lg font-sans text-[11px] transition-colors truncate cursor-pointer ${
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
                                if (!isYearSort) {
                                  setListSort('year_desc');
                                }
                              }}
                              style={
                                isYearSort
                                  ? {
                                      backgroundColor: 'var(--accent-primary)',
                                      color: 'var(--accent-text)',
                                    }
                                  : undefined
                              }
                              className={`py-1.5 px-1.5 rounded-lg font-sans text-[11px] transition-colors truncate cursor-pointer ${
                                isYearSort
                                  ? 'font-bold'
                                  : 'font-medium text-[var(--text-muted)] hover:text-[var(--text-main)]'
                              }`}
                            >
                              {t.sortGroupYear}
                            </button>
                          </div>

                          {/* Platform Picker when "За оцінкою" is active */}
                          {isRatingSort && (
                            <div className="grid grid-cols-5 gap-1 pt-0.5 animate-in fade-in duration-100">
                              {[
                                {
                                  id: 'imdb_desc' as ListSortMode,
                                  title: 'IMDb',
                                  content: <ImdbIcon className="w-4 h-4" />,
                                },
                                {
                                  id: 'rt_desc' as ListSortMode,
                                  title: 'Rotten Tomatoes',
                                  content: (
                                    <RottenTomatoesIcon className="w-4 h-4" />
                                  ),
                                },
                                {
                                  id: 'lb_desc' as ListSortMode,
                                  title: 'Letterboxd',
                                  content: (
                                    <LetterboxdIcon className="w-4.5 h-3.5" />
                                  ),
                                },
                                {
                                  id: 'tmdb_desc' as ListSortMode,
                                  title: 'TMDb',
                                  content: <TmdbIcon className="w-4 h-4" />,
                                },
                                {
                                  id: 'user_rating_desc' as ListSortMode,
                                  title: t.sortMyStarsShort,
                                  content: (
                                    <span className="text-[11px] font-bold text-[#00E054]">
                                      ★
                                    </span>
                                  ),
                                },
                              ].map((plat) => {
                                const active = listSort === plat.id;
                                return (
                                  <button
                                    key={plat.id}
                                    type="button"
                                    title={plat.title}
                                    onClick={() => setListSort(plat.id)}
                                    className={`h-8 rounded-lg border flex items-center justify-center transition-all cursor-pointer ${
                                      active
                                        ? 'bg-[var(--bg-subcard)] border-[var(--accent-primary)] ring-1 ring-[var(--accent-primary)]'
                                        : 'bg-[var(--bg-subcard)]/50 border-transparent hover:bg-[var(--bg-subcard)] opacity-70 hover:opacity-100'
                                    }`}
                                  >
                                    {plat.content}
                                  </button>
                                );
                              })}
                            </div>
                          )}

                          {/* Year Direction Picker when "За роком" is active */}
                          {isYearSort && (
                            <div className="grid grid-cols-2 gap-1.5 pt-0.5 animate-in fade-in duration-100">
                              <button
                                type="button"
                                onClick={() => setListSort('year_desc')}
                                className={`py-1.5 px-2.5 rounded-lg font-sans text-[11px] border transition-all cursor-pointer ${
                                  listSort === 'year_desc'
                                    ? 'bg-[var(--bg-subcard)] border-[var(--accent-primary)] font-bold'
                                    : 'bg-[var(--bg-subcard)]/50 border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                                }`}
                              >
                                {t.sortYearNewest}
                              </button>
                              <button
                                type="button"
                                onClick={() => setListSort('year_asc')}
                                className={`py-1.5 px-2.5 rounded-lg font-sans text-[11px] border transition-all cursor-pointer ${
                                  listSort === 'year_asc'
                                    ? 'bg-[var(--bg-subcard)] border-[var(--accent-primary)] font-bold'
                                    : 'bg-[var(--bg-subcard)]/50 border-transparent text-[var(--text-muted)] hover:text-[var(--text-main)]'
                                }`}
                              >
                                {t.sortYearOldest}
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Clear List Button */}
                  <button
                    type="button"
                    onClick={handleClearActiveList}
                    className="h-9 px-3.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-rose-400 hover:text-rose-500 hover:border-rose-500/30 font-sans text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{t.clearList}</span>
                  </button>
                </div>
              </div>

              {displayedMovies.length === 0 ? (
                <div className="min-h-[340px] rounded-[28px] bg-[var(--bg-card)] border border-[var(--border-subtle)] p-8 flex flex-col items-center justify-center text-center space-y-3">
                  <p className="font-sans text-sm text-[var(--text-muted)]">
                    {t.noMoviesMatchFilter}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setListFilter('all');
                      setListSort('default');
                    }}
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--accent-text)',
                    }}
                    className="px-4 py-2 rounded-xl font-sans text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t.resetFilterBtn}</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5 lg:gap-6">
                  {displayedMovies.map((movie) => (
                    <MovieCard
                      key={movie.id}
                      movie={movie}
                      language={lang}
                      isInWishlist={isMovieInWishlist(movie.id)}
                      isInPool={isMovieInPool(movie.id)}
                      isWishlistView={activeListTab === 'wishlist'}
                      onToggleWishlist={handleToggleWishlist}
                      onMoveToRoulette={handleMoveFromWishlistToPool}
                      onSetMovieStatus={handleSetMovieStatus}
                      onRemove={handleRemoveFromCurrentView}
                      onOpenDetail={handleOpenMovieDetail}
                    />
                  ))}
                </div>
              )}
            </section>
          )}
        </main>
      </div>

      {/* Compact Settings Popover */}
      <SettingsPopover
        isOpen={isSettingsPopoverOpen}
        colorTheme={colorTheme}
        tmdbConfig={tmdbConfig}
        secretOverride={secretOverride}
        onClose={() => setIsSettingsPopoverOpen(false)}
        onChangeColorTheme={setColorTheme}
        onSaveTmdbConfig={setTmdbConfig}
        onChangeSecretOverride={setSecretOverride}
      />

      {/* Dedicated Advanced Search & Filters Modal */}
      <AdvancedSearchModal
        isOpen={isAdvancedSearchOpen}
        language={lang}
        apiKey={tmdbConfig.customApiKey}
        initialQuery={searchQuery}
        isMovieInPool={isMovieInPool}
        isMovieInWishlist={isMovieInWishlist}
        onClose={() => setIsAdvancedSearchOpen(false)}
        onAddToPool={handleAddMovieToPoolDirect}
        onToggleWishlist={handleToggleWishlist}
        onOpenMovieDetail={(movie) => handleOpenMovieDetail(movie, false)}
        onOpenSettings={() => setIsSettingsPopoverOpen(true)}
      />

      {/* Centered Auto-Spinning Horizontal Movie Roulette Modal with Maximum-Spread Cycles */}
      <CsRouletteModal
        isOpen={isRouletteModalOpen}
        candidates={rouletteCandidates}
        language={lang}
        secretOverride={secretOverride}
        onClose={() => setIsRouletteModalOpen(false)}
        onRemoveCandidate={handleRemoveFromPool}
        onWinnerSelected={handleWinnerSelected}
        onOpenMovieDetail={handleOpenMovieDetail}
      />

      {/* Movie Detail, Trailer & Interactive Cast/Director Filmography Modal */}
      <MovieDetailModal
        movie={selectedMovieModal?.movie || null}
        language={lang}
        apiKey={tmdbConfig.customApiKey}
        autoPlayTrailer={selectedMovieModal?.autoPlayTrailer}
        isInPool={
          selectedMovieModal ? isMovieInPool(selectedMovieModal.movie.id) : false
        }
        isInWishlist={
          selectedMovieModal
            ? isMovieInWishlist(selectedMovieModal.movie.id)
            : false
        }
        onClose={() => setSelectedMovieModal(null)}
        onTogglePool={(movie) => {
          if (!isMovieInPool(movie.id)) {
            handleAddMovieToPoolDirect(movie);
          } else {
            handleRemoveFromCurrentView(movie.id);
          }
        }}
        onRestoreToRoulette={handleRestoreToRoulette}
        onToggleWishlist={handleToggleWishlist}
        onRateMovie={handleRateMovie}
        onSelectMovie={(movie) => handleOpenMovieDetail(movie, false)}
      />
    </div>
  );
}

