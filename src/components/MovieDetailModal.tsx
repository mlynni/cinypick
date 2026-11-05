import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Play,
  Plus,
  Check,
  Film,
  User,
  Clapperboard,
  Bookmark,
  RotateCcw,
} from 'lucide-react';
import { AppLanguage, MovieItem, PersonCredit } from '../types/movie';
import { MultiRatingBar } from './MultiRatingBar';
import { StarRatingInput } from './StarRatingInput';
import {
  calculateCompositeScore,
  fetchPersonMovieCredits,
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
  isInWishlist?: boolean;
  onClose: () => void;
  onTogglePool: (movie: MovieItem) => void;
  onRestoreToRoulette?: (movie: MovieItem) => void;
  onToggleWishlist?: (movie: MovieItem) => void;
  onRateMovie?: (movieId: string, rating: number | undefined) => void;
  onSelectMovie?: (movie: MovieItem) => void;
}

export const MovieDetailModal: React.FC<MovieDetailModalProps> = ({
  movie,
  language,
  apiKey,
  autoPlayTrailer = false,
  isInPool,
  isInWishlist = false,
  onClose,
  onTogglePool,
  onRestoreToRoulette,
  onToggleWishlist,
  onRateMovie,
  onSelectMovie,
}) => {
  const scrollBodyRef = useRef<HTMLDivElement | null>(null);
  const filmographyRef = useRef<HTMLDivElement | null>(null);

  const [showTrailer, setShowTrailer] = useState<boolean>(autoPlayTrailer);
  const [backdropError, setBackdropError] = useState<boolean>(false);

  // Selected person (Director or Actor) for viewing their other movies
  const [selectedPerson, setSelectedPerson] = useState<{
    id?: number;
    name: string;
    roleLabel: string;
  } | null>(null);
  const [personMovies, setPersonMovies] = useState<MovieItem[]>([]);
  const [loadingPersonMovies, setLoadingPersonMovies] =
    useState<boolean>(false);

  useEffect(() => {
    setShowTrailer(autoPlayTrailer);
    setBackdropError(false);
    setSelectedPerson(null);
    setPersonMovies([]);
    if (scrollBodyRef.current) {
      scrollBodyRef.current.scrollTop = 0;
    }
  }, [movie?.id, autoPlayTrailer]);

  // Smoothly scroll down to the filmography panel whenever a person is clicked or their movies finish loading
  useEffect(() => {
    if (selectedPerson) {
      const timer = window.setTimeout(() => {
        filmographyRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 60);
      return () => window.clearTimeout(timer);
    }
  }, [selectedPerson, loadingPersonMovies]);

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
  }) => {
    if (selectedPerson && selectedPerson.name === person.name) {
      setSelectedPerson(null);
      setPersonMovies([]);
      return;
    }

    setSelectedPerson(person);
    setLoadingPersonMovies(true);
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
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-5xl bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-subtle)] rounded-[28px] overflow-hidden shadow-2xl my-auto max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Media Header: Backdrop or Embedded YouTube Trailer */}
        <div className="relative aspect-video w-full bg-zinc-950 shrink-0 overflow-hidden">
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
                  <Film className="w-12 h-12 mb-2 text-white/70" />
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
                    <Play className="w-5 h-5 fill-current" />
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
                      <Bookmark
                        className={`w-4 h-4 ${
                          isInWishlist ? 'fill-current' : ''
                        }`}
                      />
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
                      <RotateCcw className="w-4 h-4" />
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
                          <Check className="w-4 h-4" />
                          <span>{t.inRoulettePool}</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4" />
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

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute top-4 right-4 z-20 p-2.5 rounded-xl bg-black/65 hover:bg-black text-white border border-white/15 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          {showTrailer && (
            <button
              type="button"
              onClick={() => setShowTrailer(false)}
              className="absolute top-4 left-4 z-20 px-3.5 py-2 rounded-xl bg-black/65 hover:bg-black text-xs sm:text-sm font-semibold text-white border border-white/15 transition-colors cursor-pointer"
            >
              {t.backToDetails}
            </button>
          )}
        </div>

        {/* Scrollable Details Body */}
        <div
          ref={scrollBodyRef}
          className="p-6 sm:p-8 space-y-7 overflow-y-auto scroll-smooth"
        >
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
                  <RotateCcw className="w-3.5 h-3.5" />
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
                {allCrewAndCast.map((person) => {
                  const isSelected = selectedPerson?.name === person.name;
                  return (
                    <button
                      key={person.key}
                      type="button"
                      onClick={() =>
                        handlePersonClick({
                          id: person.id,
                          name: person.name,
                          roleLabel: person.roleLabel,
                        })
                      }
                      className={`group relative aspect-[2/3] w-full rounded-2xl overflow-hidden bg-[#141419] border text-left transition-all duration-200 cursor-pointer ${
                        isSelected
                          ? 'border-[var(--accent-primary)] ring-2 ring-[var(--accent-primary)] scale-[1.02] shadow-xl'
                          : 'border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/50'
                      }`}
                    >
                      {person.profilePath ? (
                        <img
                          src={person.profilePath}
                          alt={person.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-zinc-800 to-zinc-950 p-3">
                          {person.isDirector ? (
                            <Clapperboard className="w-9 h-9 text-zinc-400 mb-2" />
                          ) : (
                            <User className="w-9 h-9 text-zinc-400 mb-2" />
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
                  );
                })}
              </div>

              {/* Expanded Person Filmography Panel (Auto-scrolled into view on open) */}
              {selectedPerson && (
                <div
                  ref={filmographyRef}
                  className="p-5 rounded-2xl bg-[var(--bg-subcard)] border border-[var(--border-subtle)] space-y-4 animate-in fade-in duration-150 scroll-mt-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-base sm:text-lg font-bold uppercase tracking-wide">
                        {selectedPerson.name}
                      </span>
                      <span className="text-sm text-[var(--text-muted)]">
                        — {t.personMoviesTitle}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPerson(null)}
                      aria-label="Close"
                      className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {loadingPersonMovies ? (
                    <div className="py-8 text-center text-sm text-[var(--text-muted)]">
                      {t.loadingFilmography}
                    </div>
                  ) : personMovies.length === 0 ? (
                    <div className="py-8 text-center text-sm text-[var(--text-muted)]">
                      {t.noPersonMovies}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3.5">
                      {personMovies.map((pm) => {
                        const pmTitle = getMovieTitle(pm, language);
                        return (
                          <div
                            key={pm.id}
                            onClick={() => {
                              if (onSelectMovie) {
                                onSelectMovie(pm);
                              }
                            }}
                            className="group rounded-2xl overflow-hidden bg-[var(--bg-card)] border border-[var(--border-subtle)] cursor-pointer flex flex-col hover:border-[var(--accent-primary)]/50 transition-all"
                          >
                            <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-900">
                              {pm.posterPath ? (
                                <img
                                  src={pm.posterPath}
                                  alt={pmTitle}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                  loading="lazy"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <Film className="w-6 h-6 text-zinc-500" />
                                </div>
                              )}
                              <div
                                className="pointer-events-none absolute inset-x-0 bottom-0 h-8"
                                style={{
                                  background:
                                    'linear-gradient(to top, var(--bg-card) 5%, transparent 100%)',
                                }}
                              />
                            </div>
                            <div className="px-2.5 pb-2.5 pt-1 flex items-center justify-between text-xs font-mono-tabular">
                              <span className="font-sans font-semibold truncate text-[var(--text-main)]">
                                {pmTitle}
                              </span>
                              <span className="text-[var(--text-muted)] shrink-0 ml-1.5">
                                {pm.releaseYear}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
