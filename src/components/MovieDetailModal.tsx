import React, { useEffect, useRef, useState } from 'react';
import {
  PiArrowCounterClockwiseBold,
  PiArrowLeftBold,
  PiBookmarkSimpleBold,
  PiBookmarkSimpleFill,
  PiCheckBold,
  PiEyeBold,
  PiEyeFill,
  PiFilmSlateBold,
  PiPencilSimpleBold,
  PiPlayFill,
  PiPlusBold,
  PiUserBold,
  PiVideoCameraBold,
  PiXBold,
} from 'react-icons/pi';
import { AppLanguage, MovieItem, PersonCredit } from '../types/movie';
import { MultiRatingBar } from './MultiRatingBar';
import { StarRatingInput } from './StarRatingInput';
import {
  calculateCompositeScore,
  fetchMoviePosters,
  fetchPersonMovieCredits,
  fetchSimilarMovies,
  TmdbPosterOption,
} from '../services/tmdbService';
import {
  getMovieCast,
  getMovieDirector,
  getMovieGenres,
  getMovieOverview,
  getMovieSecondaryTitle,
  getMovieTitle,
  UI_TEXT,
} from '../utils/i18n';

interface MovieDetailModalProps {
  movie: MovieItem | null;
  language: AppLanguage;
  apiKey?: string;
  autoPlayTrailer?: boolean;
  isInPool: boolean;
  isInWatched?: boolean;
  isInWishlist?: boolean;
  isMovieInPool?: (movieId: string) => boolean;
  isMovieInWishlist?: (movieId: string) => boolean;
  onClose: () => void;
  onTogglePool: (movie: MovieItem) => void;
  onAddMovieToPool?: (movie: MovieItem) => void;
  onRestoreToRoulette?: (movie: MovieItem) => void;
  onToggleWatched?: (movie: MovieItem) => void;
  onToggleWishlist?: (movie: MovieItem) => void;
  onRateMovie?: (movieId: string, rating: number | undefined) => void;
  onChangePoster?: (movieId: string, newPosterUrl: string) => void;
  onSelectMovie?: (movie: MovieItem) => void;
  canGoBack?: boolean;
  onGoBack?: () => void;
}

export const MovieDetailModal: React.FC<MovieDetailModalProps> = ({
  movie,
  language,
  apiKey,
  autoPlayTrailer = false,
  isInPool,
  isInWatched = false,
  isInWishlist = false,
  isMovieInPool,
  isMovieInWishlist,
  onClose,
  onTogglePool,
  onAddMovieToPool,
  onRestoreToRoulette,
  onToggleWatched,
  onToggleWishlist,
  onRateMovie,
  onChangePoster,
  onSelectMovie,
  canGoBack = false,
  onGoBack,
}) => {
  const scrollBodyRef = useRef<HTMLDivElement | null>(null);

  const [showTrailer, setShowTrailer] = useState<boolean>(autoPlayTrailer);
  const [backdropError, setBackdropError] = useState<boolean>(false);

  // Poster Picker state
  const [isPosterPickerOpen, setIsPosterPickerOpen] = useState<boolean>(false);
  const [posterOptions, setPosterOptions] = useState<TmdbPosterOption[]>([]);
  const [loadingPosters, setLoadingPosters] = useState<boolean>(false);
  const [customPosterUrlInput, setCustomPosterUrlInput] = useState<string>('');

  // Selected person (Director or Actor) for viewing their full filmography in a dedicated window view
  const [selectedPerson, setSelectedPerson] = useState<{
    id?: number;
    name: string;
    roleLabel: string;
    profilePath?: string;
    isDirector?: boolean;
  } | null>(null);
  const [personMovies, setPersonMovies] = useState<MovieItem[]>([]);
  const [loadingPersonMovies, setLoadingPersonMovies] =
    useState<boolean>(false);

  // Stack to restore a person's filmography window when navigating Back from a movie opened inside that person's view
  const personReturnStackRef = useRef<
    Array<{
      forMovieId: string;
      person: {
        id?: number;
        name: string;
        roleLabel: string;
        profilePath?: string;
        isDirector?: boolean;
      };
      movies: MovieItem[];
    }>
  >([]);

  // Similar movies state
  const [similarMovies, setSimilarMovies] = useState<MovieItem[]>([]);
  const [loadingSimilar, setLoadingSimilar] = useState<boolean>(false);

  useEffect(() => {
    setShowTrailer(autoPlayTrailer);
    setBackdropError(false);
    setIsPosterPickerOpen(false);
    setPosterOptions([]);
    setCustomPosterUrlInput('');

    // Check if we arrived back at this movie after clicking Back from a movie opened in a person's window
    const stack = personReturnStackRef.current;
    const topEntry = stack.length > 0 ? stack[stack.length - 1] : null;
    if (movie && topEntry && topEntry.forMovieId === movie.id) {
      stack.pop();
      setSelectedPerson(topEntry.person);
      setPersonMovies(topEntry.movies);
      setLoadingPersonMovies(false);
    } else {
      setSelectedPerson(null);
      setPersonMovies([]);
    }

    if (scrollBodyRef.current) {
      scrollBodyRef.current.scrollTop = 0;
    }
  }, [movie?.id, autoPlayTrailer]);

  // Fetch alternative posters when Poster Picker is opened
  useEffect(() => {
    let isCancelled = false;
    if (!isPosterPickerOpen || !movie) return;

    setLoadingPosters(true);
    fetchMoviePosters({
      tmdbId: movie.tmdbId,
      apiKey: apiKey?.trim(),
      currentPoster: movie.posterPath,
    }).then((items) => {
      if (!isCancelled) {
        setPosterOptions(items);
        setLoadingPosters(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [isPosterPickerOpen, movie?.id, movie?.tmdbId, apiKey]);

  // Automatically load similar movies when a movie detail modal opens
  useEffect(() => {
    let isCancelled = false;
    if (
      !movie ||
      movie.id.startsWith('custom-') ||
      !movie.tmdbId ||
      !apiKey ||
      apiKey.trim().length <= 5
    ) {
      setSimilarMovies([]);
      setLoadingSimilar(false);
      return;
    }

    setLoadingSimilar(true);
    fetchSimilarMovies({
      tmdbId: movie.tmdbId,
      apiKey: apiKey.trim(),
    }).then((items) => {
      if (!isCancelled) {
        setSimilarMovies(items);
        setLoadingSimilar(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [movie?.id, movie?.tmdbId, apiKey]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (movie) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [movie, onClose]);

  if (!movie) return null;

  const t = UI_TEXT[language];
  const displayTitle = getMovieTitle(movie, language);
  const secondaryTitle = getMovieSecondaryTitle(movie, language);
  const overview = getMovieOverview(movie, language);
  const genres = getMovieGenres(movie, language);
  const directorName = getMovieDirector(movie, language);
  const fallbackCastNames = getMovieCast(movie, language);
  const compositeScore = calculateCompositeScore(movie.ratings);

  const isChosen = Boolean(movie.isChosen || movie.isWatched);

  const directorCredit: PersonCredit | null = movie.directorPerson
    ? movie.directorPerson
    : directorName &&
      directorName !== 'TMDb' &&
      directorName !== 'Власний список' &&
      directorName !== 'Custom Entry'
    ? { id: 0, name: directorName, job: 'Director' }
    : null;

  const castCredits: PersonCredit[] =
    movie.castPeople && movie.castPeople.length > 0
      ? movie.castPeople
      : fallbackCastNames.map((name, idx) => ({
          id: idx,
          name,
        }));

  const allCrewAndCast: Array<{
    key: string;
    id?: number;
    name: string;
    roleLabel: string;
    profilePath?: string;
    isDirector?: boolean;
  }> = [
    ...(directorCredit
      ? [
          {
            key: `director-${directorCredit.id}-${directorCredit.name}`,
            id: directorCredit.id,
            name: directorCredit.name,
            roleLabel: t.directorLabel,
            profilePath: directorCredit.profilePath,
            isDirector: true,
          },
        ]
      : []),
    ...castCredits.map((actor) => ({
      key: `cast-${actor.id}-${actor.name}`,
      id: actor.id,
      name: actor.name,
      roleLabel: actor.character || t.castLabel,
      profilePath: actor.profilePath,
      isDirector: false,
    })),
  ];

  const handlePersonClick = async (person: {
    id?: number;
    name: string;
    roleLabel: string;
    profilePath?: string;
    isDirector?: boolean;
  }) => {
    setSelectedPerson(person);
    setPersonMovies([]);
    setLoadingPersonMovies(true);
    if (scrollBodyRef.current) {
      scrollBodyRef.current.scrollTop = 0;
    }
    const credits = await fetchPersonMovieCredits({
      personId: person.id && person.id > 10 ? person.id : undefined,
      personName: person.name,
      excludeMovieTmdbId: movie.tmdbId,
      apiKey,
    });
    setPersonMovies(credits);
    setLoadingPersonMovies(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-5xl bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-[28px] overflow-hidden shadow-2xl my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {selectedPerson ? (
          <>
            {/* Dedicated Full-Window Person Filmography Header */}
            <div className="px-5 sm:px-7 py-4 border-b border-[var(--border-subtle)] flex items-center justify-between gap-4 shrink-0 bg-[var(--bg-card)]">
              <div className="flex items-center gap-3.5 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPerson(null);
                    setPersonMovies([]);
                  }}
                  aria-label={t.backToDetails}
                  className="p-2.5 rounded-xl bg-[var(--bg-subcard)] hover:opacity-85 text-[var(--text-main)] border border-[var(--border-subtle)] transition-opacity cursor-pointer shrink-0"
                >
                  <PiArrowLeftBold className="w-5 h-5" />
                </button>

                {selectedPerson.profilePath ? (
                  <img
                    src={selectedPerson.profilePath}
                    alt={selectedPerson.name}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover border border-[var(--border-subtle)] shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[var(--bg-subcard)] border border-[var(--border-subtle)] flex items-center justify-center shrink-0">
                    {selectedPerson.isDirector ? (
                      <PiVideoCameraBold className="w-6 h-6 text-[var(--text-muted)]" />
                    ) : (
                      <PiUserBold className="w-6 h-6 text-[var(--text-muted)]" />
                    )}
                  </div>
                )}

                <div className="min-w-0">
                  <div className="text-[11px] font-sans font-bold uppercase tracking-wider text-[var(--text-muted)] truncate">
                    {selectedPerson.roleLabel}
                    {!loadingPersonMovies && personMovies.length > 0
                      ? ` · ${personMovies.length}`
                      : ''}
                  </div>
                  <h2 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight truncate">
                    {selectedPerson.name}
                  </h2>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="p-2.5 rounded-xl bg-[var(--bg-subcard)] hover:opacity-85 text-[var(--text-main)] border border-[var(--border-subtle)] transition-opacity cursor-pointer shrink-0"
              >
                <PiXBold className="w-5 h-5" />
              </button>
            </div>

            {/* Full-Window Scrollable Grid of All Person's Movies */}
            <div
              ref={scrollBodyRef}
              className="p-5 sm:p-7 overflow-y-auto flex-1"
            >
              {loadingPersonMovies ? (
                <div className="py-20 text-center text-sm text-[var(--text-muted)]">
                  {t.loadingFilmography}
                </div>
              ) : personMovies.length === 0 ? (
                <div className="py-20 text-center text-sm text-[var(--text-muted)]">
                  {t.noPersonMovies}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {personMovies.map((pm) => {
                    const pmTitle = getMovieTitle(pm, language);
                    const pmInPool = isMovieInPool
                      ? isMovieInPool(pm.id)
                      : false;
                    const pmInWishlist = isMovieInWishlist
                      ? isMovieInWishlist(pm.id)
                      : false;
                    const thumbUrl = pm.posterPath
                      ? pm.posterPath.replace('/t/p/w780/', '/t/p/w342/')
                      : undefined;

                    return (
                      <div
                        key={pm.id}
                        onClick={() => {
                          if (onSelectMovie) {
                            personReturnStackRef.current.push({
                              forMovieId: movie.id,
                              person: selectedPerson,
                              movies: personMovies,
                            });
                            onSelectMovie(pm);
                          }
                        }}
                        className="group relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-[var(--bg-subcard)] border border-[var(--border-subtle)] cursor-pointer hover:border-white/25 transition-colors select-none [content-visibility:auto] [contain-intrinsic-size:180px_270px]"
                      >
                        {thumbUrl ? (
                          <img
                            src={thumbUrl}
                            alt={pmTitle}
                            referrerPolicy="no-referrer"
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
                            <PiFilmSlateBold className="w-6 h-6 text-zinc-500 mb-1.5" />
                            <span className="font-display text-xs text-white uppercase">
                              {pmTitle}
                            </span>
                          </div>
                        )}

                        {/* Top-Right Hover Quick Actions: Add to Roulette + Add to Wishlist */}
                        <div className="absolute top-2 right-2 flex items-center gap-1 z-20 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto transition-opacity duration-150">
                          {onAddMovieToPool && (
                            <div className="group/btn">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!pmInPool) {
                                    onAddMovieToPool(pm);
                                  }
                                }}
                                aria-label={
                                  pmInPool
                                    ? t.addedToPoolTooltip
                                    : t.moveToRouletteTitle
                                }
                                className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                                  pmInPool
                                    ? 'bg-emerald-500 text-black shadow-md'
                                    : 'bg-black/85 hover:bg-white text-white hover:text-black border border-white/15'
                                }`}
                              >
                                {pmInPool ? (
                                  <PiCheckBold className="w-3.5 h-3.5" />
                                ) : (
                                  <PiPlusBold className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <span className="pointer-events-none absolute top-full right-0 mt-1.5 px-2 py-0.5 rounded-md bg-[#141419] text-white border border-white/15 text-[10px] font-sans font-semibold whitespace-nowrap shadow-xl opacity-0 scale-95 -translate-y-1 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:translate-y-0 transition-all duration-150 z-30">
                                {pmInPool
                                  ? t.addedToPoolTooltip
                                  : t.moveToRouletteTitle}
                              </span>
                            </div>
                          )}

                          {onToggleWishlist && (
                            <div className="group/btn">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleWishlist(pm);
                                }}
                                aria-label={
                                  pmInWishlist
                                    ? t.removeFromWishlistTitle
                                    : t.addToWishlistTitle
                                }
                                className={`w-7.5 h-7.5 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                                  pmInWishlist
                                    ? 'bg-white text-black shadow-md'
                                    : 'bg-black/85 hover:bg-white text-white/90 hover:text-black border border-white/15'
                                }`}
                              >
                                {pmInWishlist ? (
                                  <PiBookmarkSimpleFill className="w-3.5 h-3.5" />
                                ) : (
                                  <PiBookmarkSimpleBold className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <span className="pointer-events-none absolute top-full right-0 mt-1.5 px-2 py-0.5 rounded-md bg-[#141419] text-white border border-white/15 text-[10px] font-sans font-semibold whitespace-nowrap shadow-xl opacity-0 scale-95 -translate-y-1 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:translate-y-0 transition-all duration-150 z-30">
                                {pmInWishlist
                                  ? t.removeFromWishlistTitle
                                  : t.addToWishlistTitle}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        ) : (
          <>
        {/* Top Media Header: Backdrop or Embedded YouTube Trailer */}
        <div className="relative min-h-[250px] sm:min-h-[300px] aspect-video w-full bg-zinc-950 shrink-0 overflow-hidden">
          {showTrailer && movie.trailerYoutubeKey ? (
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${movie.trailerYoutubeKey}?autoplay=1&rel=0`}
              title={displayTitle}
              className="w-full h-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <>
              {!backdropError && (movie.backdropPath || movie.posterPath) ? (
                <img
                  src={movie.backdropPath || movie.posterPath}
                  alt={displayTitle}
                  referrerPolicy="no-referrer"
                  onError={() => setBackdropError(true)}
                  className={`w-full h-full object-cover ${
                    isChosen ? 'grayscale contrast-110' : ''
                  }`}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900">
                  <PiFilmSlateBold className="w-12 h-12 mb-2 text-white/70" />
                  <span className="font-display text-lg text-white">
                    {displayTitle}
                  </span>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20" />

              {/* Center Play Trailer Trigger */}
              {movie.trailerYoutubeKey && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => setShowTrailer(true)}
                    className="px-6 py-3.5 rounded-2xl bg-white text-black font-display font-bold tracking-wide text-sm sm:text-base flex items-center gap-2.5 shadow-xl transition-transform hover:scale-105 cursor-pointer"
                  >
                    <PiPlayFill className="w-5 h-5" />
                    <span>{t.watchTrailer}</span>
                  </button>
                </div>
              )}

              {/* Bottom Left Title Overlay + Top-level Actions */}
              <div className="absolute bottom-5 left-6 right-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-xs sm:text-sm font-mono-tabular text-zinc-300">
                    <span>{movie.releaseYear}</span>
                    <span>·</span>
                    <span>
                      {movie.runtime} {t.minUnit}
                    </span>
                    <span>·</span>
                    <span>{genres.join(' / ')}</span>
                  </div>
                  <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white uppercase mt-1">
                    {displayTitle}
                  </h2>
                  {secondaryTitle &&
                    secondaryTitle.toLowerCase() !==
                      displayTitle.toLowerCase() && (
                      <p className="text-sm sm:text-base text-white/75 font-medium mt-0.5">
                        {secondaryTitle}
                      </p>
                    )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {onChangePoster && (
                    <button
                      type="button"
                      onClick={() => setIsPosterPickerOpen((prev) => !prev)}
                      aria-label={t.changePosterBtn}
                      className={`group/btn relative p-3 rounded-xl border transition-colors cursor-pointer ${
                        isPosterPickerOpen
                          ? 'bg-white text-black border-white'
                          : 'bg-black/65 text-white border-white/20 hover:bg-white hover:text-black'
                      }`}
                    >
                      <PiPencilSimpleBold className="w-4 h-4" />
                      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-lg bg-[#18181F] text-white border border-white/15 text-[11px] font-sans font-semibold whitespace-nowrap shadow-xl opacity-0 scale-95 translate-y-1 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:translate-y-0 transition-all duration-150">
                        {t.changePosterBtn}
                      </span>
                    </button>
                  )}

                  {onToggleWatched && (
                    <button
                      type="button"
                      onClick={() => onToggleWatched(movie)}
                      aria-label={t.watchedStatusLabel}
                      className={`group/btn relative p-3 rounded-xl border transition-colors cursor-pointer ${
                        isInWatched
                          ? 'bg-white text-black border-white'
                          : 'bg-black/65 text-white border-white/20 hover:bg-white hover:text-black'
                      }`}
                    >
                      {isInWatched ? (
                        <PiEyeFill className="w-4 h-4" />
                      ) : (
                        <PiEyeBold className="w-4 h-4" />
                      )}
                      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-lg bg-[#18181F] text-white border border-white/15 text-[11px] font-sans font-semibold whitespace-nowrap shadow-xl opacity-0 scale-95 translate-y-1 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:translate-y-0 transition-all duration-150">
                        {t.watchedStatusLabel}
                      </span>
                    </button>
                  )}

                  {onToggleWishlist && (
                    <button
                      type="button"
                      onClick={() => onToggleWishlist(movie)}
                      aria-label={
                        isInWishlist
                          ? t.removeFromWishlistTitle
                          : t.addToWishlistTitle
                      }
                      className={`group/btn relative p-3 rounded-xl border transition-colors cursor-pointer ${
                        isInWishlist
                          ? 'bg-white text-black border-white'
                          : 'bg-black/65 text-white border-white/20 hover:bg-white hover:text-black'
                      }`}
                    >
                      {isInWishlist ? (
                        <PiBookmarkSimpleFill className="w-4 h-4" />
                      ) : (
                        <PiBookmarkSimpleBold className="w-4 h-4" />
                      )}
                      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-lg bg-[#18181F] text-white border border-white/15 text-[11px] font-sans font-semibold whitespace-nowrap shadow-xl opacity-0 scale-95 translate-y-1 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:translate-y-0 transition-all duration-150">
                        {isInWishlist
                          ? t.removeFromWishlistTitle
                          : t.addToWishlistTitle}
                      </span>
                    </button>
                  )}

                  {isInPool && isChosen && onRestoreToRoulette ? (
                    <button
                      type="button"
                      onClick={() => onRestoreToRoulette(movie)}
                      className="px-4 py-3 rounded-xl bg-white text-black hover:opacity-90 font-display text-xs sm:text-sm font-bold tracking-wide uppercase flex items-center gap-2 transition-all cursor-pointer shadow-lg"
                    >
                      <PiArrowCounterClockwiseBold className="w-4 h-4" />
                      <span>{t.includeInRouletteBtn}</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onTogglePool(movie)}
                      className={`px-4 py-3 rounded-xl font-display text-xs sm:text-sm font-bold tracking-wide uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
                        isInPool
                          ? 'bg-emerald-500 text-black'
                          : 'bg-white text-black hover:opacity-90'
                      }`}
                    >
                      {isInPool ? (
                        <>
                          <PiCheckBold className="w-4 h-4" />
                          <span>{t.inRoulettePool}</span>
                        </>
                      ) : (
                        <>
                          <PiPlusBold className="w-4 h-4" />
                          <span>{t.addToRoulettePool}</span>
                        </>
                      )}
                    </button>
                  )}

                  <div className="px-4 py-2 rounded-xl bg-black/65 border border-white/15 text-right font-mono-tabular">
                    <span className="text-[10px] text-white/70 block">
                      {t.compositeIndex}
                    </span>
                    <span className="text-base sm:text-lg font-bold text-white">
                      {compositeScore}/100
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Close Button (Top-Right) */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 z-20 p-2.5 rounded-xl bg-black/65 hover:bg-black text-white border border-white/15 transition-colors cursor-pointer"
          >
            <PiXBold className="w-5 h-5" />
          </button>

          {/* Back Arrow Icon Button (Top-Left) — Shown when navigating across movies, viewing a person's filmography, or watching trailer */}
          {(showTrailer || selectedPerson !== null || canGoBack) && (
            <button
              type="button"
              onClick={() => {
                if (showTrailer) {
                  setShowTrailer(false);
                } else if (selectedPerson !== null) {
                  setSelectedPerson(null);
                  setPersonMovies([]);
                  scrollBodyRef.current?.scrollTo({
                    top: 0,
                    behavior: 'smooth',
                  });
                } else if (canGoBack && onGoBack) {
                  onGoBack();
                }
              }}
              aria-label={t.backToDetails}
              className="absolute top-4 left-4 z-20 p-2.5 rounded-xl bg-black/65 hover:bg-black text-white border border-white/15 transition-colors cursor-pointer"
            >
              <PiArrowLeftBold className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Scrollable Details Body */}
        <div
          ref={scrollBodyRef}
          className="p-6 sm:p-8 space-y-7 overflow-y-auto scroll-smooth"
        >
          {/* Expandable Poster Picker Panel (1 Row of 5 Posters + Custom Image URL) */}
          {isPosterPickerOpen && onChangePoster && (
            <div className="p-5 rounded-2xl bg-[var(--bg-subcard)] border border-[var(--border-subtle)] space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="font-display text-base font-bold uppercase tracking-wide flex items-center gap-2">
                  <PiPencilSimpleBold className="w-4 h-4" />
                  <span>{t.posterPickerTitle}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsPosterPickerOpen(false)}
                  aria-label="Close"
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                >
                  <PiXBold className="w-4 h-4" />
                </button>
              </div>

              {/* Direct Image URL Input */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const trimmed = customPosterUrlInput.trim();
                  if (!trimmed) return;
                  onChangePoster(movie.id, trimmed);
                  setCustomPosterUrlInput('');
                }}
                className="flex gap-2"
              >
                <input
                  type="url"
                  value={customPosterUrlInput}
                  onChange={(e) => setCustomPosterUrlInput(e.target.value)}
                  placeholder={t.posterUrlPlaceholder}
                  className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] text-xs sm:text-sm text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
                <button
                  type="submit"
                  disabled={!customPosterUrlInput.trim()}
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--accent-text)',
                  }}
                  className="px-4 py-2.5 rounded-xl font-sans text-xs font-bold uppercase tracking-wider disabled:opacity-40 transition-opacity cursor-pointer shrink-0"
                >
                  {t.posterApplyUrlBtn}
                </button>
              </form>

              {/* Single Row of 5 Alternative Posters from TMDb */}
              {loadingPosters ? (
                <div className="py-6 text-center text-sm text-[var(--text-muted)]">
                  {t.loadingPosters}
                </div>
              ) : posterOptions.length <= 1 &&
                (!apiKey || apiKey.trim().length <= 5) ? (
                <div className="py-4 text-center text-xs sm:text-sm text-[var(--text-muted)]">
                  {t.noPostersFound}
                </div>
              ) : (
                <div className="grid grid-cols-5 gap-3">
                  {posterOptions.slice(0, 5).map((opt, idx) => {
                    const isCurrent = movie.posterPath === opt.url;
                    const langBadge =
                      opt.lang === 'uk'
                        ? 'UA'
                        : opt.lang === 'en'
                        ? 'EN'
                        : opt.lang === 'textless'
                        ? t.posterLangTextless
                        : '';
                    return (
                      <button
                        key={`${opt.url}-${idx}`}
                        type="button"
                        onClick={() => onChangePoster(movie.id, opt.url)}
                        className={`group relative aspect-[2/3] w-full rounded-xl overflow-hidden bg-zinc-900 border transition-all cursor-pointer ${
                          isCurrent
                            ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)] scale-[0.98]'
                            : 'border-[var(--border-subtle)] hover:border-white/40'
                        }`}
                      >
                        <img
                          src={opt.url}
                          alt={`${displayTitle} poster ${idx + 1}`}
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                        />
                        {langBadge && (
                          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded-md bg-black/75 text-white font-sans text-[9px] font-bold uppercase backdrop-blur-sm">
                            {langBadge}
                          </span>
                        )}
                        {isCurrent && (
                          <span className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow-md">
                            <PiCheckBold className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Personal Letterboxd-Style Star Rating (.5 increments) + Restore to Roulette Action if Chosen */}
          {onRateMovie && (
            <div className="p-4 sm:p-5 rounded-2xl bg-[var(--bg-subcard)] border border-[var(--border-subtle)] flex flex-wrap items-center justify-between gap-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-display text-sm font-bold uppercase tracking-wide text-[var(--text-muted)]">
                  {t.myRatingLabel}:
                </span>
                <StarRatingInput
                  value={movie.userRating}
                  onChange={(val) => onRateMovie(movie.id, val)}
                  clearLabel={t.clearRating}
                  size="lg"
                />
              </div>

              {isInPool && isChosen && onRestoreToRoulette && (
                <button
                  type="button"
                  onClick={() => onRestoreToRoulette(movie)}
                  className="px-4 py-2.5 rounded-xl bg-[var(--bg-card)] hover:bg-white text-[var(--text-main)] hover:text-black border border-[var(--border-subtle)] font-display text-xs font-bold tracking-wide uppercase flex items-center gap-2 transition-all cursor-pointer"
                >
                  <PiArrowCounterClockwiseBold className="w-3.5 h-3.5" />
                  <span>{t.includeInRouletteBtn}</span>
                </button>
              )}
            </div>
          )}

          {/* 4 Global Rating Cards */}
          <MultiRatingBar
            ratings={movie.ratings}
            title={getMovieTitle(movie, 'en-US')}
            imdbId={movie.imdbId}
            tmdbId={movie.tmdbId}
            language={language}
            variant="detailed"
          />

          {/* Synopsis */}
          <div className="space-y-2.5">
            <h3 className="font-display text-xl font-bold tracking-wide uppercase">
              {t.aboutMovie}
            </h3>
            <p className="text-base text-[var(--text-main)] opacity-90 leading-relaxed">
              {overview}
            </p>
          </div>

          {/* Interactive Cast & Crew Section: Vertical 2:3 Portrait Poster Cards with Bottom Gradient */}
          {allCrewAndCast.length > 0 && (
            <div className="space-y-4 pt-5 border-t border-[var(--border-subtle)]">
              <h3 className="font-display text-xl font-bold tracking-wide uppercase">
                {t.castAndCrew}
              </h3>

              {/* Portrait Poster Grid for Director & Actors */}
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-3.5">
                {allCrewAndCast.map((person) => (
                  <button
                    key={person.key}
                    type="button"
                    onClick={() =>
                      handlePersonClick({
                        id: person.id,
                        name: person.name,
                        roleLabel: person.roleLabel,
                        profilePath: person.profilePath,
                        isDirector: person.isDirector,
                      })
                    }
                    className="group relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-[#141419] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/50 text-left transition-all duration-200 cursor-pointer"
                  >
                    {person.profilePath ? (
                      <img
                        src={person.profilePath}
                        alt={person.name}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-zinc-800 to-zinc-950 p-3">
                        {person.isDirector ? (
                          <PiVideoCameraBold className="w-9 h-9 text-zinc-400 mb-2" />
                        ) : (
                          <PiUserBold className="w-9 h-9 text-zinc-400 mb-2" />
                        )}
                      </div>
                    )}

                    {/* Smooth Bottom Gradient over Portrait */}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black via-black/70 to-transparent" />

                    {/* Role + Person Name at the Bottom */}
                    <div className="absolute inset-x-0 bottom-0 p-3 space-y-0.5">
                      <div className="text-[11px] font-medium text-white/75 uppercase tracking-wider truncate">
                        {person.roleLabel}
                      </div>
                      <div className="font-display text-sm sm:text-[15px] font-bold text-white leading-tight line-clamp-2">
                        {person.name}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Similar Movies Section with Quick Add to Pool & Wishlist Actions */}
          {(loadingSimilar || similarMovies.length > 0) && (
            <div className="space-y-4 pt-5 border-t border-[var(--border-subtle)]">
              <h3 className="font-display text-xl font-bold tracking-wide uppercase">
                {t.similarMoviesTitle}
              </h3>

              {loadingSimilar ? (
                <div className="py-8 text-center text-sm text-[var(--text-muted)]">
                  {t.loadingSimilarMovies}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3.5">
                  {similarMovies.map((sm) => {
                    const smTitle = getMovieTitle(sm, language);
                    const smInPool = isMovieInPool
                      ? isMovieInPool(sm.id)
                      : false;
                    const smInWishlist = isMovieInWishlist
                      ? isMovieInWishlist(sm.id)
                      : false;

                    return (
                      <div
                        key={sm.id}
                        onClick={() => {
                          if (onSelectMovie) {
                            onSelectMovie(sm);
                          }
                        }}
                        className="group relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-[var(--bg-subcard)] border border-[var(--border-subtle)] cursor-pointer hover:border-white/25 transition-all select-none animate-movie-fade-in"
                      >
                        {sm.posterPath ? (
                          <img
                            src={sm.posterPath}
                            alt={smTitle}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
                            <PiFilmSlateBold className="w-6 h-6 text-zinc-500 mb-1.5" />
                            <span className="font-display text-xs text-white uppercase">
                              {smTitle}
                            </span>
                          </div>
                        )}

                        {/* Top-Right Hover Quick Actions: Add to Movies + Add to Wishlist */}
                        <div className="absolute top-2 right-2 flex items-center gap-1 z-20 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto transition-opacity duration-200">
                          {onAddMovieToPool && (
                            <div className="group/btn">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (!smInPool) {
                                    onAddMovieToPool(sm);
                                  }
                                }}
                                aria-label={
                                  smInPool
                                    ? t.addedToPoolTooltip
                                    : t.moveToRouletteTitle
                                }
                                className={`w-7.5 h-7.5 rounded-lg backdrop-blur-md flex items-center justify-center transition-all cursor-pointer ${
                                  smInPool
                                    ? 'bg-emerald-500 text-black shadow-md shadow-emerald-500/25'
                                    : 'bg-black/75 hover:bg-white text-white hover:text-black border border-white/10'
                                }`}
                              >
                                {smInPool ? (
                                  <PiCheckBold className="w-3.5 h-3.5" />
                                ) : (
                                  <PiPlusBold className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <span className="pointer-events-none absolute top-full right-0 mt-1.5 px-2 py-0.5 rounded-md bg-[#141419] text-white border border-white/15 text-[10px] font-sans font-semibold whitespace-nowrap shadow-xl opacity-0 scale-95 -translate-y-1 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:translate-y-0 transition-all duration-150 z-30">
                                {smInPool
                                  ? t.addedToPoolTooltip
                                  : t.moveToRouletteTitle}
                              </span>
                            </div>
                          )}

                          {onToggleWishlist && (
                            <div className="group/btn">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleWishlist(sm);
                                }}
                                aria-label={
                                  smInWishlist
                                    ? t.removeFromWishlistTitle
                                    : t.addToWishlistTitle
                                }
                                className={`w-7.5 h-7.5 rounded-lg backdrop-blur-md flex items-center justify-center transition-all cursor-pointer ${
                                  smInWishlist
                                    ? 'bg-white text-black shadow-md'
                                    : 'bg-black/75 hover:bg-white text-white/90 hover:text-black border border-white/10'
                                }`}
                              >
                                {smInWishlist ? (
                                  <PiBookmarkSimpleFill className="w-3.5 h-3.5" />
                                ) : (
                                  <PiBookmarkSimpleBold className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <span className="pointer-events-none absolute top-full right-0 mt-1.5 px-2 py-0.5 rounded-md bg-[#141419] text-white border border-white/15 text-[10px] font-sans font-semibold whitespace-nowrap shadow-xl opacity-0 scale-95 -translate-y-1 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:translate-y-0 transition-all duration-150 z-30">
                                {smInWishlist
                                  ? t.removeFromWishlistTitle
                                  : t.addToWishlistTitle}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Subtle Bottom Gradient + Title & Year on Hover */}
                        <div className="pointer-events-none absolute inset-x-0 bottom-0 p-2.5 pt-7 bg-gradient-to-t from-black/95 via-black/60 to-transparent">
                          <div className="font-sans text-xs font-semibold text-white truncate">
                            {smTitle}
                          </div>
                          <div className="font-sans text-[10px] text-white/70 tabular-nums">
                            {sm.releaseYear}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
          </>
        )}
      </div>
    </div>
  );
};
