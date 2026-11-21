import React, { useState } from 'react';
import {
  PiBookmarkSimpleBold,
  PiBookmarkSimpleFill,
  PiCheckBold,
  PiEyeBold,
  PiEyeFill,
  PiFilmSlateBold,
  PiPlusBold,
  PiTrashBold,
} from 'react-icons/pi';
import { AppLanguage, MovieItem } from '../types/movie';
import { getMovieTitle, UI_TEXT } from '../utils/i18n';

export type MoviePoolStatus = 'watched' | 'chosen' | 'none';

interface MovieCardProps {
  movie: MovieItem;
  language: AppLanguage;
  isInWishlist: boolean;
  isInPool?: boolean;
  isWishlistView?: boolean;
  isWatchedView?: boolean;
  isSelectionMode?: boolean;
  isSelectedForDelete?: boolean;
  onToggleSelectForDelete?: (movieId: string) => void;
  onToggleWishlist: (movie: MovieItem) => void;
  onMoveToRoulette?: (movie: MovieItem) => void;
  onSetMovieStatus?: (movie: MovieItem, status: MoviePoolStatus) => void;
  onRemove: (movieId: string) => void;
  onOpenDetail: (movie: MovieItem, autoPlayTrailer?: boolean) => void;
}

export const MovieCard: React.FC<MovieCardProps> = ({
  movie,
  language,
  isInWishlist,
  isInPool = false,
  isWishlistView = false,
  isWatchedView = false,
  isSelectionMode = false,
  isSelectedForDelete = false,
  onToggleSelectForDelete,
  onToggleWishlist,
  onMoveToRoulette,
  onSetMovieStatus,
  onRemove,
  onOpenDetail,
}) => {
  const [imgError, setImgError] = useState(false);
  const t = UI_TEXT[language];
  const displayTitle = getMovieTitle(movie, language);

  const isChosen = Boolean(movie.isChosen);
  const isWatched = Boolean(movie.isWatched);
  // Movies in Wishlist and Watched tab are full-color; in Library pool, "Обрано" turns poster B&W
  const isBwPoster =
    !isWishlistView && !isWatchedView && (isChosen || isWatched);
  const weight = movie.rouletteWeight || 1;
  const showWeightBadge =
    !isWishlistView && !isWatchedView && !isChosen && !isWatched && weight > 1;

  return (
    <article
      onClick={() => {
        if (isSelectionMode && onToggleSelectForDelete) {
          onToggleSelectForDelete(movie.id);
        } else {
          onOpenDetail(movie, false);
        }
      }}
      className={`group relative aspect-[2/3] w-full rounded-[22px] overflow-hidden bg-[var(--bg-card)] border cursor-pointer select-none shadow-sm transition-all duration-200 animate-movie-fade-in ${
        isSelectionMode
          ? isSelectedForDelete
            ? 'border-rose-500 ring-2 ring-rose-500 scale-[0.98]'
            : 'border-white/25 hover:border-rose-400/70'
          : 'border-[var(--border-subtle)] hover:shadow-2xl hover:border-white/25'
      }`}
    >
      {/* Full-bleed 2:3 Poster — turns Black & White when marked as Watched or Chosen */}
      {!imgError && movie.posterPath ? (
        <img
          src={movie.posterPath}
          alt={displayTitle}
          referrerPolicy="no-referrer"
          onError={() => setImgError(true)}
          className={`w-full h-full object-cover group-hover:scale-[1.03] transition-all duration-300 ${
            isBwPoster
              ? 'grayscale contrast-115 brightness-90 group-hover:brightness-100'
              : ''
          }`}
          loading="lazy"
        />
      ) : (
        <div
          className={`w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-[#1C1C22] to-[#09090B] text-center ${
            isBwPoster ? 'grayscale opacity-70' : ''
          }`}
        >
          <PiFilmSlateBold className="w-10 h-10 mb-3 text-white/70" />
          <span className="font-display text-lg font-bold tracking-wide text-white uppercase">
            {displayTitle}
          </span>
        </div>
      )}

      {/* Subtle Top Vignette on Hover so Action Icons are always crisp */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-200" />

      {/* Top-Left Persistent Status / Weight Indicator (not shown in Wishlist or Watched tab) */}
      {(!isWishlistView &&
        !isWatchedView &&
        (isChosen || isWatched || showWeightBadge)) && (
        <div className="pointer-events-none absolute top-3 left-3 z-20 flex items-center gap-1.5 group-hover:opacity-0 transition-opacity duration-150">
          {(isChosen || isWatched) && (
            <span className="px-2 py-1 rounded-xl bg-black/80 text-white border border-white/15 backdrop-blur-md font-sans text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 shadow-md">
              {isChosen ? (
                <>
                  <PiCheckBold className="w-3 h-3 text-emerald-400" />
                  <span>{t.chosenStatusLabel}</span>
                </>
              ) : (
                <>
                  <PiEyeFill className="w-3 h-3 text-zinc-300" />
                  <span>{t.watchedStatusLabel}</span>
                </>
              )}
            </span>
          )}
          {showWeightBadge && (
            <span className="px-2 py-0.5 rounded-lg bg-amber-500/90 text-black font-sans text-[10px] font-extrabold tabular-nums shadow-md">
              ×{weight}
            </span>
          )}
        </div>
      )}

      {/* Bottom-Left Personal Star Rating Badge (if rated) */}
      {typeof movie.userRating === 'number' && movie.userRating > 0 && (
        <div className="pointer-events-none absolute bottom-3 left-3 z-20 px-2 py-0.5 rounded-lg bg-black/80 text-[#00E054] border border-white/15 backdrop-blur-md font-sans text-[11px] font-bold tabular-nums flex items-center gap-1 shadow-md">
          <span>★</span>
          <span>{movie.userRating.toFixed(1).replace(/\.0$/, '')}</span>
        </div>
      )}

      {/* Selection Mode Overlay & Top-Right Checkbox OR Standard Top-Right 3 Action Icons */}
      {isSelectionMode ? (
        <>
          {isSelectedForDelete && (
            <div className="pointer-events-none absolute inset-0 bg-rose-500/15 z-10 transition-opacity" />
          )}
          <div className="pointer-events-none absolute top-3 right-3 z-20">
            <div
              className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl flex items-center justify-center transition-all shadow-lg ${
                isSelectedForDelete
                  ? 'bg-rose-500 text-white border border-rose-400 scale-105'
                  : 'bg-black/75 text-transparent border-2 border-white/50 group-hover:border-white'
              }`}
            >
              <PiCheckBold className="w-4 h-4" />
            </div>
          </div>
        </>
      ) : (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-20 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto [@media(hover:none)]:opacity-100 [@media(hover:none)]:pointer-events-auto transition-opacity duration-200">
        {/* 1st Icon: Status (Eye / Check with hover menu in Pool view, or Add to Pool in Wishlist view) — Hidden in Watched view */}
        {!isWatchedView &&
          (isWishlistView ? (
            onMoveToRoulette && (
              <div className="group/btn">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveToRoulette(movie);
                  }}
                  aria-label={
                    isInPool ? t.addedToPoolTooltip : t.moveToRouletteTitle
                  }
                  className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl backdrop-blur-md flex items-center justify-center transition-all cursor-pointer ${
                    isInPool
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-md shadow-emerald-500/25'
                      : 'bg-black/75 hover:bg-white text-white/90 hover:text-black border border-white/10'
                  }`}
                >
                  {isInPool ? (
                    <PiCheckBold className="w-4 h-4" />
                  ) : (
                    <PiPlusBold className="w-4 h-4" />
                  )}
                </button>
                <span className="pointer-events-none absolute top-full right-0 mt-2 px-2.5 py-1 rounded-lg bg-[#141419] text-white border border-white/15 text-[11px] font-sans font-semibold whitespace-nowrap shadow-xl opacity-0 scale-95 -translate-y-1 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:translate-y-0 transition-all duration-150 z-30">
                  {isInPool ? t.addedToPoolTooltip : t.moveToRouletteTitle}
                </span>
              </div>
            )
          ) : (
            onSetMovieStatus && (
              <div
                className="group/status"
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isWatched || isChosen) {
                      onSetMovieStatus(movie, 'none');
                    } else {
                      onSetMovieStatus(movie, 'watched');
                    }
                  }}
                  aria-label={
                    isChosen ? t.chosenStatusLabel : t.watchedStatusLabel
                  }
                  className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl backdrop-blur-md flex items-center justify-center transition-all cursor-pointer ${
                    isWatched || isChosen
                      ? 'bg-white text-black shadow-md'
                      : 'bg-black/75 hover:bg-white text-white/90 hover:text-black border border-white/10'
                  }`}
                >
                  {isChosen ? (
                    <PiCheckBold className="w-4 h-4" />
                  ) : isWatched ? (
                    <PiEyeFill className="w-4 h-4" />
                  ) : (
                    <PiEyeBold className="w-4 h-4" />
                  )}
                </button>

                {/* Hover Choice Dropdown: Aligned with the 3-button group so it stays 100% inside the card */}
                <div className="pt-1.5 absolute top-full right-0 z-30 opacity-0 pointer-events-none translate-y-1 scale-95 group-hover/status:opacity-100 group-hover/status:pointer-events-auto group-hover/status:translate-y-0 group-hover/status:scale-100 transition-all duration-150 origin-top-right">
                  <div className="p-1 rounded-xl bg-[#141419]/95 backdrop-blur-md border border-white/15 shadow-2xl flex flex-col gap-0.5 min-w-[116px]">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetMovieStatus(movie, isWatched ? 'none' : 'watched');
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg font-sans text-[11px] flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isWatched
                          ? 'bg-white text-black font-bold'
                          : 'text-white/85 hover:bg-white/10 hover:text-white font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        {isWatched ? (
                          <PiEyeFill className="w-3.5 h-3.5 shrink-0" />
                        ) : (
                          <PiEyeBold className="w-3.5 h-3.5 shrink-0" />
                        )}
                        <span>{t.watchedStatusLabel}</span>
                      </span>
                      {isWatched && <PiCheckBold className="w-3 h-3 shrink-0" />}
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSetMovieStatus(movie, isChosen ? 'none' : 'chosen');
                      }}
                      className={`w-full px-2.5 py-1.5 rounded-lg font-sans text-[11px] flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isChosen
                          ? 'bg-white text-black font-bold'
                          : 'text-white/85 hover:bg-white/10 hover:text-white font-medium'
                      }`}
                    >
                      <span className="flex items-center gap-1.5">
                        <PiCheckBold className="w-3.5 h-3.5 shrink-0" />
                        <span>{t.chosenStatusLabel}</span>
                      </span>
                      {isChosen && <PiCheckBold className="w-3 h-3 shrink-0" />}
                    </button>
                  </div>
                </div>
              </div>
            )
          ))}

        {/* 2nd Icon: Wishlist — Hidden in Watched view */}
        {!isWatchedView && (
          <div className="group/btn">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleWishlist(movie);
              }}
              aria-label={
                isInWishlist ? t.removeFromWishlistTitle : t.addToWishlistTitle
              }
              className={`w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl backdrop-blur-md flex items-center justify-center transition-colors cursor-pointer ${
                isInWishlist
                  ? 'bg-white text-black shadow-md'
                  : 'bg-black/75 hover:bg-white text-white/90 hover:text-black border border-white/10'
              }`}
            >
              {isInWishlist ? (
                <PiBookmarkSimpleFill className="w-4 h-4" />
              ) : (
                <PiBookmarkSimpleBold className="w-4 h-4" />
              )}
            </button>
            <span className="pointer-events-none absolute top-full right-0 mt-2 px-2.5 py-1 rounded-lg bg-[#141419] text-white border border-white/15 text-[11px] font-sans font-semibold whitespace-nowrap shadow-xl opacity-0 scale-95 -translate-y-1 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:translate-y-0 transition-all duration-150 z-30">
              {isInWishlist ? t.removeFromWishlistTitle : t.addToWishlistTitle}
            </span>
          </div>
        )}

        {/* 3rd Icon: Remove */}
        <div className="group/btn">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove(movie.id);
            }}
            aria-label={t.deleteMovieTitle}
            className="w-8 h-8 sm:w-8.5 sm:h-8.5 rounded-xl bg-black/75 hover:bg-rose-600 text-white/90 hover:text-white border border-white/10 hover:border-rose-500 backdrop-blur-md flex items-center justify-center transition-colors cursor-pointer"
          >
            <PiTrashBold className="w-4 h-4" />
          </button>
          <span className="pointer-events-none absolute top-full right-0 mt-2 px-2.5 py-1 rounded-lg bg-[#141419] text-white border border-white/15 text-[11px] font-sans font-semibold whitespace-nowrap shadow-xl opacity-0 scale-95 -translate-y-1 group-hover/btn:opacity-100 group-hover/btn:scale-100 group-hover/btn:translate-y-0 transition-all duration-150 z-30">
            {t.deleteMovieTitle}
          </span>
        </div>
      </div>
      )}
    </article>
  );
};
