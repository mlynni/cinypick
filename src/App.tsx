import React, { useEffect, useRef, useState } from 'react';
import {
  PiArrowCounterClockwiseBold,
  PiBookmarkSimpleBold,
  PiBookmarkSimpleFill,
  PiCheckBold,
  PiDiceFiveBold,
  PiEyeBold,
  PiEyeFill,
  PiFilmSlateBold,
  PiFunnelBold,
  PiGearSixBold,
  PiMagnifyingGlassBold,
  PiPlusBold,
  PiSlidersHorizontalBold,
  PiTrashBold,
  PiXBold,
} from 'react-icons/pi';
import {
  ColorThemeId,
  MovieItem,
  SecretOverrideConfig,
  TmdbConfigState,
  WheelCandidate,
} from './types/movie';
import { CURATED_MOVIES } from './data/curatedMovies';
import {
  createCustomMovieItem,
  fetchTmdbMovieDetails,
  searchTmdbForAdding,
} from './services/tmdbService';
import {
  decodeSessionHash,
  extractSessionCodeFromInput,
} from './utils/sessionHash';
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

  // Active View Tab: 'pool' (Library) vs 'watched' (Watched) vs 'wishlist' (Wishlist)
  const [activeListTab, setActiveListTab] = useState<
    'pool' | 'watched' | 'wishlist'
  >('pool');

  // Filter & Sort state for the active list
  const [listFilter, setListFilter] = useState<ListFilterMode>('all');
  const [listSort, setListSort] = useState<ListSortMode>('default');
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState<boolean>(false);
  const filterMenuRef = useRef<HTMLDivElement | null>(null);

  // Multi-select Deletion Mode triggered by clicking "Очистити список"
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedForDeleteIds, setSelectedForDeleteIds] = useState<string[]>(
    []
  );

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
  const [movieDetailHistory, setMovieDetailHistory] = useState<MovieItem[]>([]);

  // Undo / Notification Toast state
  const [toastBanner, setToastBanner] = useState<{
    message: string;
    onUndo?: () => void;
  } | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const showToast = (message: string, onUndo?: () => void) => {
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToastBanner({ message, onUndo });
    toastTimerRef.current = window.setTimeout(() => {
      setToastBanner(null);
    }, 6000);
  };

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

  // Reset tab-specific filters when switching between Library, Watched, and Wishlist
  const handleSwitchListTab = (nextTab: 'pool' | 'watched' | 'wishlist') => {
    setActiveListTab(nextTab);
    setIsFilterMenuOpen(false);
    setIsSelectionMode(false);
    setSelectedForDeleteIds([]);
    if (nextTab === 'watched' && listFilter !== 'all' && listFilter !== 'rated') {
      setListFilter('all');
    } else if (
      nextTab === 'wishlist' &&
      (listFilter === 'active_roulette' ||
        listFilter === 'chosen_bw' ||
        listFilter === 'watched' ||
        listFilter === 'in_wishlist')
    ) {
      setListFilter('all');
    } else if (
      nextTab === 'pool' &&
      (listFilter === 'in_pool' ||
        listFilter === 'not_in_pool' ||
        listFilter === 'watched')
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
    myMovies.some((m) => m.id === movieId && !m.isWatched);

  const isMovieInWatched = (movieId: string) =>
    myMovies.some((m) => m.id === movieId && Boolean(m.isWatched));

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
    const isAddingToWatched = activeListTab === 'watched';
    let finalMovie: MovieItem = {
      ...movie,
      isChosen: false,
      isWatched: isAddingToWatched,
      excludeFromRoulette: isAddingToWatched,
    };
    if (tmdbConfig.customApiKey.trim().length > 5) {
      const enriched = await fetchTmdbMovieDetails(
        movie,
        tmdbConfig.customApiKey
      );
      finalMovie = {
        ...enriched,
        isChosen: false,
        isWatched: isAddingToWatched,
        excludeFromRoulette: isAddingToWatched,
      };
    }

    if (activeListTab === 'wishlist') {
      setWishlistMovies((prev) => {
        if (prev.some((m) => m.id === finalMovie.id)) return prev;
        return isMovieInPool(finalMovie.id)
          ? [...prev, finalMovie]
          : [finalMovie, ...prev];
      });
    } else if (activeListTab === 'watched') {
      setMyMovies((prev) => {
        if (prev.some((m) => m.id === finalMovie.id)) {
          return prev.map((m) =>
            m.id === finalMovie.id
              ? {
                  ...m,
                  isWatched: true,
                  isChosen: false,
                  excludeFromRoulette: true,
                }
              : m
          );
        }
        return [finalMovie, ...prev];
      });
    } else {
      setMyMovies((prev) => {
        if (prev.some((m) => m.id === finalMovie.id)) {
          return prev.map((m) =>
            m.id === finalMovie.id
              ? {
                  ...m,
                  isWatched: false,
                  isChosen: false,
                  excludeFromRoulette: false,
                }
              : m
          );
        }
        return [finalMovie, ...prev];
      });
      moveWishlistItemToEnd(finalMovie.id);
    }

    setSearchQuery('');
    setSearchResults([]);
  };

  const handleAddMovieToPoolDirect = async (movie: MovieItem) => {
    let finalMovie: MovieItem = {
      ...movie,
      isChosen: false,
      isWatched: false,
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
        isWatched: false,
        excludeFromRoulette: false,
      };
    }
    setMyMovies((prev) => {
      if (prev.some((m) => m.id === finalMovie.id)) {
        return prev.map((m) =>
          m.id === finalMovie.id
            ? {
                ...m,
                isWatched: false,
                isChosen: false,
                excludeFromRoulette: false,
              }
            : m
        );
      }
      return [finalMovie, ...prev];
    });
    setSelectedMovieModal((prev) =>
      prev && prev.movie.id === finalMovie.id
        ? {
            ...prev,
            movie: {
              ...prev.movie,
              isWatched: false,
              isChosen: false,
              excludeFromRoulette: false,
            },
          }
        : prev
    );
    moveWishlistItemToEnd(finalMovie.id);
  };

  const handleAddCustomTitle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    if (searchResults.length > 0) {
      handleAddMovieToActiveList(searchResults[0]);
      return;
    }

    const isAddingToWatched = activeListTab === 'watched';
    const customMovie: MovieItem = {
      ...createCustomMovieItem(searchQuery.trim()),
      isWatched: isAddingToWatched,
      excludeFromRoulette: isAddingToWatched,
    };
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

  const handleToggleWatchedDirect = async (movie: MovieItem) => {
    if (isMovieInWatched(movie.id)) {
      setMyMovies((prev) =>
        prev.map((m) =>
          m.id === movie.id
            ? {
                ...m,
                isWatched: false,
                isChosen: false,
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
                isWatched: false,
                isChosen: false,
                excludeFromRoulette: false,
              },
            }
          : prev
      );
      return;
    }

    let finalMovie: MovieItem = {
      ...movie,
      isChosen: false,
      isWatched: true,
      excludeFromRoulette: true,
    };
    if (tmdbConfig.customApiKey.trim().length > 5) {
      const enriched = await fetchTmdbMovieDetails(
        movie,
        tmdbConfig.customApiKey
      );
      finalMovie = {
        ...enriched,
        isChosen: false,
        isWatched: true,
        excludeFromRoulette: true,
      };
    }

    setMyMovies((prev) => {
      if (prev.some((m) => m.id === finalMovie.id)) {
        return prev.map((m) =>
          m.id === finalMovie.id
            ? {
                ...m,
                isWatched: true,
                isChosen: false,
                excludeFromRoulette: true,
              }
            : m
        );
      }
      return [finalMovie, ...prev];
    });
    setSelectedMovieModal((prev) =>
      prev && prev.movie.id === finalMovie.id
        ? {
            ...prev,
            movie: {
              ...prev.movie,
              isWatched: true,
              isChosen: false,
              excludeFromRoulette: true,
            },
          }
        : prev
    );
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

  // Change movie poster (cover) from TMDb gallery or custom URL
  const handleChangeMoviePoster = (movieId: string, newPosterUrl: string) => {
    setMyMovies((prev) =>
      prev.map((m) =>
        m.id === movieId
          ? { ...m, posterPath: newPosterUrl, customPoster: true }
          : m
      )
    );
    setWishlistMovies((prev) =>
      prev.map((m) =>
        m.id === movieId
          ? { ...m, posterPath: newPosterUrl, customPoster: true }
          : m
      )
    );
    setSelectedMovieModal((prev) =>
      prev && prev.movie.id === movieId
        ? {
            ...prev,
            movie: {
              ...prev.movie,
              posterPath: newPosterUrl,
              customPoster: true,
            },
          }
        : prev
    );
  };

  // Cycle roulette weight multiplier (1x -> 2x -> 3x -> 1x)
  const handleToggleCandidateWeight = (movieId: string) => {
    setMyMovies((prev) =>
      prev.map((m) => {
        if (m.id !== movieId) return m;
        const curr = m.rouletteWeight || 1;
        const next = curr >= 3 ? 1 : curr + 1;
        return { ...m, rouletteWeight: next };
      })
    );
  };

  const handleLoadStarterHits = () => {
    setMyMovies((prev) => {
      const existingIds = new Set(prev.map((m) => m.id));
      const toAdd = CURATED_MOVIES.filter((m) => !existingIds.has(m.id)).map(
        (m) => ({
          ...m,
          isChosen: false,
          isWatched: false,
          excludeFromRoulette: false,
        })
      );
      return [...toAdd, ...prev];
    });
  };

  const handleRemoveFromCurrentView = (movieId: string) => {
    if (activeListTab === 'wishlist') {
      const removed = wishlistMovies.find((m) => m.id === movieId);
      setWishlistMovies((prev) => prev.filter((m) => m.id !== movieId));
      if (removed) {
        showToast(`${t.movieRemovedToast}: «${getMovieTitle(removed, lang)}»`, () => {
          setWishlistMovies((prev) => [removed, ...prev]);
        });
      }
    } else {
      const removed = myMovies.find((m) => m.id === movieId);
      setMyMovies((prev) => prev.filter((m) => m.id !== movieId));
      if (removed) {
        showToast(`${t.movieRemovedToast}: «${getMovieTitle(removed, lang)}»`, () => {
          setMyMovies((prev) => [removed, ...prev]);
        });
      }
    }
  };

  const handleRemoveFromPool = (movieId: string) => {
    const removed = myMovies.find((m) => m.id === movieId);
    setMyMovies((prev) => prev.filter((m) => m.id !== movieId));
    if (removed) {
      showToast(`${t.movieRemovedToast}: «${getMovieTitle(removed, lang)}»`, () => {
        setMyMovies((prev) => [removed, ...prev]);
      });
    }
  };

  const handleToggleSelectForDelete = (movieId: string) => {
    setSelectedForDeleteIds((prev) =>
      prev.includes(movieId)
        ? prev.filter((id) => id !== movieId)
        : [...prev, movieId]
    );
  };

  const handleDeleteSelectedMovies = () => {
    if (selectedForDeleteIds.length === 0) return;
    const toRemoveSet = new Set(selectedForDeleteIds);

    if (activeListTab === 'wishlist') {
      const snapshot = [...wishlistMovies];
      const count = wishlistMovies.filter((m) => toRemoveSet.has(m.id)).length;
      setWishlistMovies((prev) => prev.filter((m) => !toRemoveSet.has(m.id)));
      if (count > 0) {
        showToast(`${t.movieRemovedToast} (${count})`, () => {
          setWishlistMovies(snapshot);
        });
      }
    } else {
      const snapshot = [...myMovies];
      const count = myMovies.filter((m) => toRemoveSet.has(m.id)).length;
      setMyMovies((prev) => prev.filter((m) => !toRemoveSet.has(m.id)));
      if (count > 0) {
        showToast(`${t.movieRemovedToast} (${count})`, () => {
          setMyMovies(snapshot);
        });
      }
    }

    setIsSelectionMode(false);
    setSelectedForDeleteIds([]);
  };

  const handleClearActiveList = () => {
    if (activeListTab === 'wishlist') {
      if (wishlistMovies.length === 0) return;
      const snapshot = [...wishlistMovies];
      setWishlistMovies([]);
      showToast(`${t.listClearedToast} (${snapshot.length})`, () => {
        setWishlistMovies(snapshot);
      });
    } else if (activeListTab === 'watched') {
      const watchedToClear = myMovies.filter((m) => Boolean(m.isWatched));
      if (watchedToClear.length === 0) return;
      const snapshot = [...myMovies];
      setMyMovies((prev) => prev.filter((m) => !m.isWatched));
      showToast(`${t.listClearedToast} (${watchedToClear.length})`, () => {
        setMyMovies(snapshot);
      });
    } else {
      const libraryToClear = myMovies.filter((m) => !m.isWatched);
      if (libraryToClear.length === 0) return;
      const snapshot = [...myMovies];
      setMyMovies((prev) => prev.filter((m) => Boolean(m.isWatched)));
      showToast(`${t.listClearedToast} (${libraryToClear.length})`, () => {
        setMyMovies(snapshot);
      });
    }
    setIsSelectionMode(false);
    setSelectedForDeleteIds([]);
  };

  // Merge imported session movies and wishlist with existing items (updating status & ratings on ID match)
  const handleImportSessionLists = (
    importedPool: MovieItem[],
    importedWishlist: MovieItem[]
  ) => {
    if (importedPool.length > 0) {
      setMyMovies((prev) => {
        const importedMap = new Map<string, MovieItem>();
        importedPool.forEach((m) => importedMap.set(m.id, m));

        const updatedExisting = prev.map((existing) => {
          const match = importedMap.get(existing.id);
          if (!match) return existing;
          importedMap.delete(existing.id);
          return {
            ...existing,
            isChosen: match.isChosen,
            isWatched: match.isWatched,
            excludeFromRoulette: match.excludeFromRoulette,
            userRating:
              typeof match.userRating === 'number'
                ? match.userRating
                : existing.userRating,
          };
        });

        return [...Array.from(importedMap.values()), ...updatedExisting];
      });
    }

    if (importedWishlist.length > 0) {
      setWishlistMovies((prev) => {
        const importedMap = new Map<string, MovieItem>();
        importedWishlist.forEach((m) => importedMap.set(m.id, m));

        const updatedExisting = prev.map((existing) => {
          const match = importedMap.get(existing.id);
          if (!match) return existing;
          importedMap.delete(existing.id);
          return {
            ...existing,
            userRating:
              typeof match.userRating === 'number'
                ? match.userRating
                : existing.userRating,
          };
        });

        return [...Array.from(importedMap.values()), ...updatedExisting];
      });
    }
  };

  // Automatically import shared session if URL contains #s=... or ?s=...
  useEffect(() => {
    const rawUrl = window.location.href;
    if (!/[#?&]s=([^&#\s]+)/i.test(rawUrl)) return;

    const code = extractSessionCodeFromInput(rawUrl);
    if (!code) return;

    // Clean up the URL hash/query immediately so refreshing doesn't re-import
    try {
      window.history.replaceState(
        null,
        '',
        window.location.pathname
      );
    } catch {
      // ignore
    }

    decodeSessionHash(code, tmdbConfig.customApiKey.trim())
      .then((decoded) => {
        if (decoded.apiKey && decoded.apiKey.trim().length > 5) {
          const nextKey = decoded.apiKey.trim();
          setTmdbConfig((prev) => ({
            ...prev,
            mode: 'custom',
            customApiKey: nextKey,
            lastSyncStatus: 'connected',
          }));
        }
        handleImportSessionLists(decoded.myMovies, decoded.wishlistMovies);
        showToast(UI_TEXT[tmdbConfig.language].sessionImportedToast);
      })
      .catch(() => {
        // ignore invalid URL hash
      });
  }, []);

  const handleOpenMovieDetail = async (
    movie: MovieItem,
    autoPlayTrailer = false,
    preserveHistory = false
  ) => {
    if (!preserveHistory) {
      setMovieDetailHistory([]);
    }
    setSelectedMovieModal({ movie, autoPlayTrailer });
    if (tmdbConfig.customApiKey.trim().length > 5) {
      const enriched = await fetchTmdbMovieDetails(
        movie,
        tmdbConfig.customApiKey
      );
      const merged: MovieItem = {
        ...enriched,
        posterPath: movie.customPoster
          ? movie.posterPath
          : enriched.posterPath,
        customPoster: movie.customPoster,
        rouletteWeight: movie.rouletteWeight,
        isChosen: movie.isChosen,
        isWatched: movie.isWatched,
        excludeFromRoulette: movie.excludeFromRoulette,
        userRating: movie.userRating,
      };
      setMyMovies((prev) =>
        prev.map((m) =>
          m.id === movie.id
            ? {
                ...merged,
                posterPath: m.customPoster ? m.posterPath : merged.posterPath,
                customPoster: m.customPoster,
              }
            : m
        )
      );
      setWishlistMovies((prev) =>
        prev.map((m) =>
          m.id === movie.id
            ? {
                ...merged,
                posterPath: m.customPoster ? m.posterPath : merged.posterPath,
                customPoster: m.customPoster,
              }
            : m
        )
      );
      setSelectedMovieModal((prev) =>
        prev && prev.movie.id === movie.id
          ? {
              ...prev,
              movie: {
                ...merged,
                posterPath: prev.movie.customPoster
                  ? prev.movie.posterPath
                  : merged.posterPath,
                customPoster: prev.movie.customPoster,
              },
            }
          : prev
      );
    }
  };

  const libraryMovies = myMovies.filter((m) => !m.isWatched);
  const watchedMovies = myMovies.filter((m) => Boolean(m.isWatched));

  const rawActiveList =
    activeListTab === 'wishlist'
      ? wishlistMovies
      : activeListTab === 'watched'
      ? watchedMovies
      : libraryMovies;

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
      : activeListTab === 'watched'
      ? [
          {
            id: 'all',
            label: t.filterAll,
            count: watchedMovies.length,
          },
          {
            id: 'rated',
            label: t.filterRated,
            count: watchedMovies.filter(
              (m) => typeof m.userRating === 'number' && m.userRating > 0
            ).length,
          },
        ]
      : [
          {
            id: 'all',
            label: t.filterAll,
            count: libraryMovies.length,
          },
          {
            id: 'active_roulette',
            label: t.filterActiveRoulette,
            count: libraryMovies.filter(
              (m) => !m.isChosen && !m.isWatched && !m.excludeFromRoulette
            ).length,
          },
          {
            id: 'chosen_bw',
            label: t.filterChosenBw,
            count: libraryMovies.filter((m) => Boolean(m.isChosen)).length,
          },
          {
            id: 'rated',
            label: t.filterRated,
            count: libraryMovies.filter(
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
              <PiGearSixBold className="w-4.5 h-4.5" />
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
                <PiMagnifyingGlassBold className="w-4.5 h-4.5 text-[var(--text-muted)] absolute left-4 top-1/2 -translate-y-1/2" />
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
                    <PiPlusBold className="w-3.5 h-3.5" />
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
                <PiSlidersHorizontalBold className="w-4.5 h-4.5" />
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
                          : activeListTab === 'watched'
                          ? isMovieInWatched(item.id)
                          : isMovieInPool(item.id);
                      const itemTitle = getMovieTitle(item, lang);
                      const altTitle = getMovieAltTitle(item, lang);
                      return (
                        <div
                          key={item.id}
                          onClick={() => handleOpenMovieDetail(item, false)}
                          className="w-full p-3.5 flex items-center justify-between gap-3.5 text-left hover:bg-black/10 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3.5 min-w-0">
                            {item.posterPath ? (
                              <img
                                src={item.posterPath.replace(
                                  '/t/p/w780/',
                                  '/t/p/w185/'
                                )}
                                alt={itemTitle}
                                referrerPolicy="no-referrer"
                                loading="lazy"
                                decoding="async"
                                className="w-11 h-16 object-cover rounded-lg shrink-0"
                              />
                            ) : (
                              <div className="w-11 h-16 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                                <PiFilmSlateBold className="w-5 h-5 text-zinc-400" />
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

                          <button
                            type="button"
                            disabled={alreadyInActive}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAddMovieToActiveList(item);
                            }}
                            style={
                              alreadyInActive
                                ? undefined
                                : {
                                    backgroundColor: 'var(--accent-primary)',
                                    color: 'var(--accent-text)',
                                  }
                            }
                            className={`px-3 py-2 rounded-xl text-xs font-semibold shrink-0 flex items-center gap-1 transition-opacity ${
                              alreadyInActive
                                ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                                : 'hover:opacity-90 cursor-pointer'
                            }`}
                          >
                            {alreadyInActive ? (
                              <>
                                <PiCheckBold className="w-3.5 h-3.5" />
                                <span>{t.addedBtn}</span>
                              </>
                            ) : (
                              <>
                                <PiPlusBold className="w-3.5 h-3.5" />
                                <span>{t.addBtn}</span>
                              </>
                            )}
                          </button>
                        </div>
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
                        <PiPlusBold className="w-4 h-4" />
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

          {/* 2. Minimalist Cohesive "КРУТИТИ РУЛЕТКУ" Button + "БІБЛІОТЕКА" & Icon-Only Watched / Wishlist Switcher */}
          <div className="space-y-2.5 pt-3 border-t border-[var(--border-subtle)]">
            <button
              type="button"
              disabled={rouletteCandidates.length === 0}
              onClick={() => setIsRouletteModalOpen(true)}
              className="w-full h-[52px] px-4 rounded-2xl bg-[var(--bg-subcard)] hover:bg-[var(--accent-primary)] text-[var(--text-main)] hover:text-[var(--accent-text)] border border-white/15 disabled:opacity-35 font-sans text-sm font-bold tracking-wider uppercase flex items-center justify-between transition-colors duration-150 cursor-pointer"
            >
              <span className="flex items-center gap-3">
                <PiDiceFiveBold className="w-5 h-5" />
                <span>{t.spinRoulette}</span>
              </span>
              <span className="tabular-nums text-xs font-bold px-2.5 py-1 rounded-lg bg-black/20 dark:bg-white/10">
                {rouletteCandidates.length}
              </span>
            </button>

            {/* "БІБЛІОТЕКА" Button + Icon-Only Watched Button + Icon-Only Wishlist Button */}
            <div className="flex items-center gap-2 pt-1">
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
                className={`flex-1 min-w-0 h-[48px] px-4 rounded-2xl border border-[var(--border-subtle)] font-sans text-xs font-bold tracking-wider uppercase flex items-center justify-between transition-all cursor-pointer ${
                  activeListTab === 'pool'
                    ? ''
                    : 'bg-[var(--bg-subcard)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                <span className="truncate">{t.myMoviesTab}</span>
                <span className="tabular-nums ml-1.5">
                  {libraryMovies.length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchListTab('watched')}
                aria-label={t.watchedTab}
                style={
                  activeListTab === 'watched'
                    ? {
                        backgroundColor: 'var(--accent-primary)',
                        color: 'var(--accent-text)',
                      }
                    : undefined
                }
                className={`group/btn relative w-[48px] h-[48px] shrink-0 rounded-2xl border border-[var(--border-subtle)] flex items-center justify-center transition-all cursor-pointer ${
                  activeListTab === 'watched'
                    ? ''
                    : 'bg-[var(--bg-subcard)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                }`}
              >
                {activeListTab === 'watched' ? (
                  <PiEyeFill className="w-5 h-5" />
                ) : (
                  <PiEyeBold className="w-5 h-5" />
                )}
                <span className="pointer-events-none absolute bottom-full right-0 mb-2 px-2.5 py-1 rounded-lg bg-[#18181F] text-white border border-white/15 text-[11px] font-sans font-semibold whitespace-nowrap shadow-xl opacity-0 scale-95 translate-y-1 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:translate-y-0 transition-all duration-150 z-30">
                  {t.watchedTab} ({watchedMovies.length})
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
                {activeListTab === 'wishlist' ? (
                  <PiBookmarkSimpleFill className="w-5 h-5" />
                ) : (
                  <PiBookmarkSimpleBold className="w-5 h-5" />
                )}
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
                  <PiBookmarkSimpleBold className="w-7 h-7" />
                ) : activeListTab === 'watched' ? (
                  <PiEyeBold className="w-7 h-7" />
                ) : (
                  <PiFilmSlateBold className="w-7 h-7" />
                )}
              </div>

              <h2 className="font-display text-xl sm:text-2xl font-extrabold uppercase tracking-tight">
                {activeListTab === 'wishlist'
                  ? t.emptyWishlistTitle
                  : activeListTab === 'watched'
                  ? t.emptyWatchedTitle
                  : t.emptyPoolTitle}
              </h2>
            </section>
          ) : (
            <section className="space-y-5">
              {/* Top Section Header: "У РУЛЕТЦІ" / "ПЕРЕГЛЯНУТЕ" / "СПИСОК БАЖАНОГО" on left, Clear List Icon on top-right */}
              <div className="px-1 flex items-center justify-between gap-4">
                <h2 className="font-display text-xl sm:text-2xl font-extrabold uppercase tracking-tight">
                  {activeListTab === 'wishlist'
                    ? t.wishlistTab
                    : activeListTab === 'watched'
                    ? t.watchedTab
                    : t.myMoviesTab}
                </h2>

                <div className="flex items-center gap-2">
                  {/* Clear List Icon-Only Button OR 2 Selection Mode Buttons ("Видалити обрані" + "Видалити все") */}
                  {!isSelectionMode ? (
                    <button
                      type="button"
                      onClick={() => {
                        setIsSelectionMode(true);
                        setSelectedForDeleteIds([]);
                      }}
                      aria-label={t.clearList}
                      className="group/btn relative w-9 h-9 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-rose-400 hover:text-rose-500 hover:border-rose-500/30 flex items-center justify-center transition-all cursor-pointer"
                    >
                      <PiTrashBold className="w-4 h-4" />
                      <span className="pointer-events-none absolute bottom-full right-0 mb-2 px-2.5 py-1 rounded-lg bg-[#18181F] text-white border border-white/15 text-[11px] font-sans font-semibold whitespace-nowrap shadow-xl opacity-0 scale-95 translate-y-1 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:translate-y-0 transition-all duration-150 z-30">
                        {t.clearList}
                      </span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 animate-in fade-in duration-150">
                      <button
                        type="button"
                        disabled={selectedForDeleteIds.length === 0}
                        onClick={handleDeleteSelectedMovies}
                        className="h-9 px-3.5 rounded-xl bg-rose-500 hover:bg-rose-600 disabled:bg-[var(--bg-card)] text-white disabled:text-[var(--text-muted)] border border-rose-500 disabled:border-[var(--border-subtle)] font-sans text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
                      >
                        <PiTrashBold className="w-4 h-4" />
                        <span>
                          {t.deleteSelectedBtn}
                          {selectedForDeleteIds.length > 0
                            ? ` (${selectedForDeleteIds.length})`
                            : ''}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleClearActiveList}
                        className="h-9 px-3.5 rounded-xl bg-[var(--bg-card)] border border-rose-500/40 text-rose-400 hover:bg-rose-500 hover:text-white font-sans text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                      >
                        <span>{t.deleteAllBtn}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setIsSelectionMode(false);
                          setSelectedForDeleteIds([]);
                        }}
                        aria-label="Cancel"
                        className="w-9 h-9 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-[var(--text-muted)] hover:text-[var(--text-main)] flex items-center justify-center transition-colors cursor-pointer"
                      >
                        <PiXBold className="w-4 h-4" />
                      </button>
                    </div>
                  )}
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
                    <PiArrowCounterClockwiseBold className="w-3.5 h-3.5" />
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
                      isWatchedView={activeListTab === 'watched'}
                      isSelectionMode={isSelectionMode}
                      isSelectedForDelete={selectedForDeleteIds.includes(
                        movie.id
                      )}
                      onToggleSelectForDelete={handleToggleSelectForDelete}
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
        myMovies={myMovies}
        wishlistMovies={wishlistMovies}
        onClose={() => setIsSettingsPopoverOpen(false)}
        onChangeColorTheme={setColorTheme}
        onSaveTmdbConfig={setTmdbConfig}
        onChangeSecretOverride={setSecretOverride}
        onImportSessionLists={handleImportSessionLists}
      />

      {/* Dedicated Advanced Search & Filters Modal */}
      <AdvancedSearchModal
        isOpen={isAdvancedSearchOpen}
        language={lang}
        apiKey={tmdbConfig.customApiKey}
        initialQuery={searchQuery}
        isMovieInPool={isMovieInPool}
        isMovieInWatched={isMovieInWatched}
        isMovieInWishlist={isMovieInWishlist}
        onClose={() => setIsAdvancedSearchOpen(false)}
        onAddToPool={handleAddMovieToPoolDirect}
        onToggleWatched={handleToggleWatchedDirect}
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
        onToggleCandidateWeight={handleToggleCandidateWeight}
        onWinnerSelected={handleWinnerSelected}
        onOpenMovieDetail={handleOpenMovieDetail}
      />

      {/* Floating Notification & Undo Toast */}
      {toastBanner && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-3 rounded-2xl bg-[#18181F] text-white border border-white/15 shadow-2xl flex items-center gap-3.5 animate-in fade-in slide-in-from-bottom-3 duration-200 max-w-[92vw]">
          <span className="font-sans text-xs sm:text-sm font-medium truncate">
            {toastBanner.message}
          </span>
          {toastBanner.onUndo && (
            <button
              type="button"
              onClick={() => {
                toastBanner.onUndo?.();
                setToastBanner(null);
              }}
              className="px-3 py-1 rounded-xl bg-white text-black font-sans text-xs font-bold uppercase tracking-wider hover:opacity-90 transition-opacity shrink-0 cursor-pointer"
            >
              {t.undoAction}
            </button>
          )}
        </div>
      )}

      {/* Movie Detail, Trailer & Interactive Cast/Director Filmography Modal */}
      <MovieDetailModal
        movie={selectedMovieModal?.movie || null}
        language={lang}
        apiKey={tmdbConfig.customApiKey}
        autoPlayTrailer={selectedMovieModal?.autoPlayTrailer}
        isInPool={
          selectedMovieModal ? isMovieInPool(selectedMovieModal.movie.id) : false
        }
        isInWatched={
          selectedMovieModal
            ? isMovieInWatched(selectedMovieModal.movie.id)
            : false
        }
        isInWishlist={
          selectedMovieModal
            ? isMovieInWishlist(selectedMovieModal.movie.id)
            : false
        }
        isMovieInPool={isMovieInPool}
        isMovieInWishlist={isMovieInWishlist}
        onClose={() => {
          setSelectedMovieModal(null);
          setMovieDetailHistory([]);
        }}
        onTogglePool={(movie) => {
          if (!isMovieInPool(movie.id)) {
            handleAddMovieToPoolDirect(movie);
          } else {
            handleRemoveFromCurrentView(movie.id);
          }
        }}
        onAddMovieToPool={handleAddMovieToPoolDirect}
        onRestoreToRoulette={handleRestoreToRoulette}
        onToggleWatched={handleToggleWatchedDirect}
        onToggleWishlist={handleToggleWishlist}
        onRateMovie={handleRateMovie}
        onChangePoster={handleChangeMoviePoster}
        onSelectMovie={(nextMovie) => {
          if (selectedMovieModal?.movie) {
            setMovieDetailHistory((prev) => [
              ...prev,
              selectedMovieModal.movie,
            ]);
          }
          handleOpenMovieDetail(nextMovie, false, true);
        }}
        canGoBack={movieDetailHistory.length > 0}
        onGoBack={() => {
          if (movieDetailHistory.length === 0) return;
          const prevMovie = movieDetailHistory[movieDetailHistory.length - 1];
          setMovieDetailHistory((prev) => prev.slice(0, -1));
          handleOpenMovieDetail(prevMovie, false, true);
        }}
      />
    </div>
  );
}

