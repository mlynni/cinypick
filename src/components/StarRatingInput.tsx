import React, { useState } from 'react';
import { X } from 'lucide-react';

export function normalizeStarRating(raw?: number): number | undefined {
  if (raw === undefined || raw === null || Number.isNaN(raw) || raw <= 0) {
    return undefined;
  }
  const scaled = raw > 5 ? raw / 2 : raw;
  const clamped = Math.max(0.5, Math.min(5, scaled));
  return Math.round(clamped * 2) / 2;
}

export function formatLetterboxdStarsText(raw?: number): string {
  const val = normalizeStarRating(raw);
  if (!val) return '';
  const full = Math.floor(val);
  const half = val % 1 >= 0.5;
  return `${'★'.repeat(full)}${half ? '½' : ''}`;
}

interface StarRatingInputProps {
  value?: number;
  onChange: (nextValue: number | undefined) => void;
  clearLabel?: string;
  size?: 'sm' | 'md' | 'lg';
}

const STAR_PATH =
  'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z';

export const StarRatingInput: React.FC<StarRatingInputProps> = ({
  value,
  onChange,
  clearLabel = 'Clear',
  size = 'md',
}) => {
  const normalizedValue = normalizeStarRating(value);
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const displayValue = hoverValue !== null ? hoverValue : normalizedValue || 0;

  const starDimensions =
    size === 'lg'
      ? 'w-7 h-7'
      : size === 'sm'
      ? 'w-5 h-5'
      : 'w-6 h-6';

  const handleStarMouseMove = (
    e: React.MouseEvent<HTMLButtonElement>,
    starIndex: number
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const isLeftHalf = offsetX < rect.width / 2;
    const computed = isLeftHalf ? starIndex - 0.5 : starIndex;
    setHoverValue(computed);
  };

  const handleStarClick = (
    e: React.MouseEvent<HTMLButtonElement>,
    starIndex: number
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const isLeftHalf = offsetX < rect.width / 2;
    const clickedVal = isLeftHalf ? starIndex - 0.5 : starIndex;

    if (normalizedValue === clickedVal) {
      onChange(undefined);
    } else {
      onChange(clickedVal);
    }
  };

  return (
    <div
      className="inline-flex items-center gap-2 select-none"
      onMouseLeave={() => setHoverValue(null)}
    >
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((starIndex) => {
          const fillLevel =
            displayValue >= starIndex
              ? 'full'
              : displayValue >= starIndex - 0.5
              ? 'half'
              : 'empty';

          const clipId = `half-star-clip-${starIndex}-${size}`;

          return (
            <button
              key={starIndex}
              type="button"
              onMouseMove={(e) => handleStarMouseMove(e, starIndex)}
              onClick={(e) => handleStarClick(e, starIndex)}
              aria-label={`Rate ${starIndex} stars`}
              className="relative p-0.5 transition-transform hover:scale-110 cursor-pointer focus:outline-none"
            >
              <svg
                viewBox="0 0 24 24"
                className={`${starDimensions} transition-colors duration-100`}
              >
                <defs>
                  <clipPath id={clipId}>
                    <rect x="0" y="0" width="12" height="24" />
                  </clipPath>
                </defs>

                {/* Base Empty Star */}
                <path
                  d={STAR_PATH}
                  fill="currentColor"
                  className="text-zinc-600/45 dark:text-zinc-700"
                />

                {/* Full or Left-Half Filled Star (Letterboxd Emerald Green #00E054) */}
                {fillLevel === 'full' && (
                  <path d={STAR_PATH} fill="#00E054" />
                )}

                {fillLevel === 'half' && (
                  <path
                    d={STAR_PATH}
                    fill="#00E054"
                    clipPath={`url(#${clipId})`}
                  />
                )}
              </svg>
            </button>
          );
        })}
      </div>

      {/* Numeric Readout (e.g., 3.5 / 5) */}
      <span className="min-w-[38px] font-mono-tabular text-xs sm:text-sm font-bold text-[#00E054]">
        {displayValue > 0 ? displayValue.toFixed(1).replace(/\.0$/, '') : '—'}
      </span>

      {/* Clear Rating Button */}
      {normalizedValue !== undefined && (
        <button
          type="button"
          onClick={() => onChange(undefined)}
          aria-label={clearLabel}
          className="p-1 rounded-lg text-[var(--text-muted)] hover:text-rose-400 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
