import React from 'react';
import { AppLanguage, MovieRatings } from '../types/movie';

interface MultiRatingBarProps {
  ratings: MovieRatings;
  title?: string;
  imdbId?: string;
  tmdbId?: number;
  language?: AppLanguage;
  variant?: 'compact' | 'detailed' | 'overlay';
}

/* Crisp, High-Contrast Brand Icons optimized for small UI sizes */
export const ImdbIcon: React.FC<{ className?: string }> = ({
  className = 'w-7 h-3.5',
}) => (
  <svg
    viewBox="0 0 40 20"
    className={`${className} shrink-0`}
    aria-hidden="true"
  >
    <rect width="40" height="20" rx="4" fill="#F5C518" />
    <text
      x="20"
      y="14.5"
      textAnchor="middle"
      fill="#000000"
      fontFamily="Impact, 'Arial Black', Inter, sans-serif"
      fontWeight="900"
      fontSize="12.5"
      letterSpacing="0.4"
    >
      IMDb
    </text>
  </svg>
);

export const RottenTomatoesIcon: React.FC<{ className?: string }> = ({
  className = 'w-4 h-4',
}) => (
  <svg
    viewBox="0 0 24 24"
    className={`${className} shrink-0`}
    aria-hidden="true"
  >
    {/* Tomato body */}
    <path
      d="M12 5.5C6.8 5.5 3 9 3 13.8C3 18.8 7 22 12 22C17 22 21 18.8 21 13.8C21 9 17.2 5.5 12 5.5Z"
      fill="#FA320A"
    />
    {/* Crisp highlight */}
    <path
      d="M6.5 12.5C6.5 10.3 8.1 8.6 10.2 8.2"
      stroke="#FF8A70"
      strokeWidth="1.8"
      strokeLinecap="round"
      fill="none"
    />
    {/* Green stem & leaves */}
    <path
      d="M12 1.8V6M12 5.5L8.2 3.2M12 5.5L15.8 3.2M12 5.8L6.8 6.8M12 5.8L17.2 6.8"
      stroke="#00E054"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const LetterboxdIcon: React.FC<{ className?: string }> = ({
  className = 'w-6 h-2.5',
}) => (
  <svg
    viewBox="0 0 32 12"
    className={`${className} shrink-0`}
    aria-hidden="true"
  >
    <circle cx="6" cy="6" r="5.5" fill="#FF8000" />
    <circle cx="16" cy="6" r="5.5" fill="#00E054" />
    <circle cx="26" cy="6" r="5.5" fill="#40BCF4" />
  </svg>
);

export const TmdbIcon: React.FC<{ className?: string }> = ({
  className = 'w-8 h-3.5',
}) => (
  <svg
    viewBox="0 0 46 20"
    className={`${className} shrink-0`}
    aria-hidden="true"
  >
    <defs>
      <linearGradient id="tmdbGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#90CEA1" />
        <stop offset="100%" stopColor="#01B4E4" />
      </linearGradient>
    </defs>
    <rect width="46" height="20" rx="4" fill="url(#tmdbGrad)" />
    <text
      x="23"
      y="14.5"
      textAnchor="middle"
      fill="#032541"
      fontFamily="'Arial Black', Inter, sans-serif"
      fontWeight="900"
      fontSize="11.5"
      letterSpacing="0.5"
    >
      TMDB
    </text>
  </svg>
);

/* Custom Modern Floating Tooltip Wrapper (Replaces native Windows 95 browser title tooltip) */
const RatingItemWithTooltip: React.FC<{
  label: string;
  children: React.ReactNode;
}> = ({ label, children }) => (
  <div className="group/tip relative flex items-center gap-1.5 py-0.5">
    {children}
    <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 rounded-lg bg-[#18181F] text-white border border-white/15 text-[11px] font-sans font-semibold tracking-normal whitespace-nowrap shadow-xl opacity-0 scale-95 translate-y-1 group-hover/tip:opacity-100 group-hover/tip:scale-100 group-hover/tip:translate-y-0 transition-all duration-150 z-30">
      {label}
    </span>
  </div>
);

export const MultiRatingBar: React.FC<MultiRatingBarProps> = ({
  ratings,
  title = '',
  imdbId,
  tmdbId,
  language = 'uk-UA',
  variant = 'compact',
}) => {
  if (variant === 'overlay') {
    return (
      <div className="flex items-center justify-between gap-1.5 font-mono-tabular text-[13px] sm:text-sm font-bold text-[var(--text-main)]">
        <RatingItemWithTooltip label="IMDb">
          <ImdbIcon className="w-7 h-3.5 shrink-0" />
          <span>{ratings.imdb.score.toFixed(1)}</span>
        </RatingItemWithTooltip>

        <RatingItemWithTooltip label="Rotten Tomatoes">
          <RottenTomatoesIcon className="w-4 h-4 shrink-0" />
          <span>{ratings.rottenTomatoes.tomatometer}%</span>
        </RatingItemWithTooltip>

        <RatingItemWithTooltip label="Letterboxd">
          <LetterboxdIcon className="w-6 h-2.5 shrink-0" />
          <span>{ratings.letterboxd.score.toFixed(1)}</span>
        </RatingItemWithTooltip>

        <RatingItemWithTooltip label="TMDb">
          <TmdbIcon className="w-8 h-3.5 shrink-0" />
          <span>{ratings.tmdb.score.toFixed(1)}</span>
        </RatingItemWithTooltip>
      </div>
    );
  }

  if (variant === 'compact') {
    return (
      <div className="flex items-center justify-between pt-2.5 font-mono-tabular text-sm font-bold">
        <RatingItemWithTooltip label="IMDb">
          <ImdbIcon className="w-7 h-3.5 shrink-0" />
          <span>{ratings.imdb.score.toFixed(1)}</span>
        </RatingItemWithTooltip>

        <RatingItemWithTooltip label="Rotten Tomatoes">
          <RottenTomatoesIcon className="w-4 h-4 shrink-0" />
          <span>{ratings.rottenTomatoes.tomatometer}%</span>
        </RatingItemWithTooltip>

        <RatingItemWithTooltip label="Letterboxd">
          <LetterboxdIcon className="w-6 h-2.5 shrink-0" />
          <span>{ratings.letterboxd.score.toFixed(1)}</span>
        </RatingItemWithTooltip>

        <RatingItemWithTooltip label="TMDb">
          <TmdbIcon className="w-8 h-3.5 shrink-0" />
          <span>{ratings.tmdb.score.toFixed(1)}</span>
        </RatingItemWithTooltip>
      </div>
    );
  }

  const imdbUrl = imdbId
    ? `https://www.imdb.com/title/${imdbId}/`
    : `https://www.imdb.com/find/?q=${encodeURIComponent(title)}`;
  const rtUrl = `https://www.rottentomatoes.com/search?search=${encodeURIComponent(
    title
  )}`;
  const lbUrl = `https://letterboxd.com/search/${encodeURIComponent(title)}/`;
  const tmdbUrl = tmdbId
    ? `https://www.themoviedb.org/movie/${tmdbId}`
    : `https://www.themoviedb.org/search?query=${encodeURIComponent(title)}`;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 py-2">
      <a
        href={imdbUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col justify-between p-4 rounded-2xl bg-[var(--bg-subcard)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/40 transition-all"
      >
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-2 font-bold text-sm text-[var(--text-main)]">
            <ImdbIcon className="w-7 h-3.5" />
            <span>IMDb</span>
          </span>
          <span className="text-sm opacity-60 group-hover:opacity-100">↗</span>
        </div>
        <div className="mt-2.5 flex items-baseline gap-1.5 font-mono-tabular">
          <span className="text-2xl sm:text-3xl font-bold">
            {ratings.imdb.score.toFixed(1)}
          </span>
          <span className="text-xs text-[var(--text-muted)]">/ 10</span>
        </div>
        <span className="mt-1 text-xs text-[var(--text-muted)] font-mono-tabular">
          {ratings.imdb.votes} {language === 'en-US' ? 'votes' : 'голосів'}
        </span>
      </a>

      <a
        href={rtUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col justify-between p-4 rounded-2xl bg-[var(--bg-subcard)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/40 transition-all"
      >
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-2 font-bold text-sm text-[var(--text-main)]">
            <RottenTomatoesIcon className="w-4.5 h-4.5" />
            <span>Rotten Tomatoes</span>
          </span>
          <span className="text-sm opacity-60 group-hover:opacity-100">↗</span>
        </div>
        <div className="mt-2.5 flex items-baseline gap-1.5 font-mono-tabular">
          <span className="text-2xl sm:text-3xl font-bold">
            {ratings.rottenTomatoes.tomatometer}%
          </span>
          <span className="text-xs text-[var(--text-muted)]">
            {ratings.rottenTomatoes.certifiedFresh ? 'Fresh' : 'Score'}
          </span>
        </div>
        <span className="mt-1 text-xs text-[var(--text-muted)] font-mono-tabular">
          {language === 'en-US' ? 'Audience' : 'Глядачі'}:{' '}
          {ratings.rottenTomatoes.audienceScore}%
        </span>
      </a>

      <a
        href={lbUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col justify-between p-4 rounded-2xl bg-[var(--bg-subcard)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/40 transition-all"
      >
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-2 font-bold text-sm text-[var(--text-main)]">
            <LetterboxdIcon className="w-6 h-2.5" />
            <span>Letterboxd</span>
          </span>
          <span className="text-sm opacity-60 group-hover:opacity-100">↗</span>
        </div>
        <div className="mt-2.5 flex items-baseline gap-1.5 font-mono-tabular">
          <span className="text-2xl sm:text-3xl font-bold">
            {ratings.letterboxd.score.toFixed(1)}
          </span>
          <span className="text-xs text-[var(--text-muted)]">/ 5.0</span>
        </div>
        <span className="mt-1 text-xs text-[var(--text-muted)] font-mono-tabular">
          {language === 'en-US' ? 'Fans' : 'Фанів'}:{' '}
          {ratings.letterboxd.fansCount || '95K'}
        </span>
      </a>

      <a
        href={tmdbUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex flex-col justify-between p-4 rounded-2xl bg-[var(--bg-subcard)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/40 transition-all"
      >
        <div className="flex items-center justify-between text-xs text-[var(--text-muted)]">
          <span className="flex items-center gap-2 font-bold text-sm text-[var(--text-main)]">
            <TmdbIcon className="w-8 h-3.5" />
            <span>TMDb</span>
          </span>
          <span className="text-sm opacity-60 group-hover:opacity-100">↗</span>
        </div>
        <div className="mt-2.5 flex items-baseline gap-1.5 font-mono-tabular">
          <span className="text-2xl sm:text-3xl font-bold">
            {ratings.tmdb.score.toFixed(1)}
          </span>
          <span className="text-xs text-[var(--text-muted)]">/ 10</span>
        </div>
        <span className="mt-1 text-xs text-[var(--text-muted)] font-mono-tabular">
          {ratings.tmdb.voteCount.toLocaleString(
            language === 'en-US' ? 'en-US' : 'uk-UA'
          )}{' '}
          {language === 'en-US' ? 'ratings' : 'оцінок'}
        </span>
      </a>
    </div>
  );
};
