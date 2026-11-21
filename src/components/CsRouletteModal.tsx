import React, { useEffect, useRef, useState } from 'react';
import {
  PiArrowCounterClockwiseBold,
  PiFilmSlateBold,
  PiPlayFill,
  PiSpeakerHighBold,
  PiSpeakerSlashBold,
  PiXBold,
} from 'react-icons/pi';
import {
  AppLanguage,
  MovieItem,
  SecretOverrideConfig,
  WheelCandidate,
} from '../types/movie';
import { MultiRatingBar } from './MultiRatingBar';
import {
  getMovieGenres,
  getMovieSecondaryTitle,
  getMovieTitle,
  UI_TEXT,
} from '../utils/i18n';

interface CsRouletteModalProps {
  isOpen: boolean;
  candidates: WheelCandidate[];
  language: AppLanguage;
  secretOverride?: SecretOverrideConfig;
  onClose: () => void;
  onRemoveCandidate?: (movieId: string) => void;
  onToggleCandidateWeight?: (movieId: string) => void;
  onWinnerSelected?: (movie: MovieItem) => void;
  onOpenMovieDetail: (movie: MovieItem, autoPlayTrailer?: boolean) => void;
}

// Full 2:3 vertical poster aspect ratio (180px wide x 270px tall)
const CARD_WIDTH_PX = 180;
const CARD_HEIGHT_PX = 270;
const CARD_GAP_PX = 14;
const ITEM_STRIDE_PX = CARD_WIDTH_PX + CARD_GAP_PX;
const MIN_LANDING_INDEX = 45;

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Builds a roulette tape with MAXIMUM possible spacing between identical movies:
 * - Generates a fresh random permutation `baseCycle = shuffleArray(pool)` of all N movies on every spin.
 * - Repeats `baseCycle` across the tape so that:
 *   1. The order is 100% random on every spin.
 *   2. Every movie appears with strictly equal frequency (1/N).
 *   3. Any two occurrences of the same movie are ALWAYS separated by N slots (maximum possible distance).
 */
function buildMaxSpreadRouletteTape(pool: WheelCandidate[]): {
  tape: WheelCandidate[];
  winningIndex: number;
  chosenWinner: WheelCandidate;
} {
  const chosenWinner = pool[Math.floor(Math.random() * pool.length)];

  if (pool.length === 1) {
    const tape = Array.from({ length: 64 }, () => pool[0]);
    return { tape, winningIndex: 48, chosenWinner: pool[0] };
  }

  const baseCycle = shuffleArray(pool);
  const tape: WheelCandidate[] = [];
  const targetTotalLength = MIN_LANDING_INDEX + pool.length * 2 + 14;

  while (tape.length < targetTotalLength) {
    tape.push(...baseCycle);
  }

  let winningIndex = MIN_LANDING_INDEX;
  for (let i = MIN_LANDING_INDEX; i < MIN_LANDING_INDEX + pool.length; i++) {
    if (tape[i] && tape[i].movie.id === chosenWinner.movie.id) {
      winningIndex = i;
      break;
    }
  }

  return { tape, winningIndex, chosenWinner };
}

export const CsRouletteModal: React.FC<CsRouletteModalProps> = ({
  isOpen,
  candidates,
  language,
  secretOverride,
  onClose,
  onWinnerSelected,
  onOpenMovieDetail,
}) => {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);
  const spinTimeoutRef = useRef<number | null>(null);
  const tickRafRef = useRef<number | null>(null);

  const [tapeItems, setTapeItems] = useState<WheelCandidate[]>([]);
  const [activeWinningIndex, setActiveWinningIndex] = useState<number>(48);
  const [pendingWinner, setPendingWinner] = useState<WheelCandidate | null>(
    null
  );
  const [spinTrigger, setSpinTrigger] = useState<number>(0);

  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [winner, setWinner] = useState<WheelCandidate | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const soundEnabledRef = useRef<boolean>(true);

  const t = UI_TEXT[language];

  const handleToggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      soundEnabledRef.current = next;
      try {
        if (audioCtxRef.current) {
          if (!next && audioCtxRef.current.state === 'running') {
            audioCtxRef.current.suspend();
          } else if (next && audioCtxRef.current.state === 'suspended') {
            audioCtxRef.current.resume();
          }
        }
      } catch {
        // ignore audio errors
      }
      return next;
    });
  };

  const clearScheduledAudioAndTimers = () => {
    if (spinTimeoutRef.current) {
      window.clearTimeout(spinTimeoutRef.current);
      spinTimeoutRef.current = null;
    }
    if (tickRafRef.current) {
      window.cancelAnimationFrame(tickRafRef.current);
      tickRafRef.current = null;
    }
  };

  /**
   * Tactile mechanical wheel peg click + woody/carbon sub-thump,
   * pitch-modulated by spin progress so slowing down builds suspense.
   */
  const playTickSound = (progress = 0.5) => {
    if (!soundEnabledRef.current) return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // 1. Crisp mechanical transient click (bandpass-filtered noise burst, 12ms)
      if (!noiseBufferRef.current) {
        const bufSize = Math.floor(ctx.sampleRate * 0.015);
        const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < bufSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufSize * 0.3));
        }
        noiseBufferRef.current = buf;
      }

      const noiseSrc = ctx.createBufferSource();
      noiseSrc.buffer = noiseBufferRef.current;
      const bandpass = ctx.createBiquadFilter();
      bandpass.type = 'bandpass';
      bandpass.frequency.setValueAtTime(2100 + progress * 500, now);
      bandpass.Q.setValueAtTime(3.2, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(0.14, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.014);

      noiseSrc.connect(bandpass);
      bandpass.connect(noiseGain);
      noiseGain.connect(ctx.destination);
      noiseSrc.start(now);

      // 2. Warm mechanical body resonance (snappy pitch drop 22ms)
      const osc = ctx.createOscillator();
      const bodyGain = ctx.createGain();
      osc.type = 'sine';
      const startFreq = 780 + progress * 220;
      osc.frequency.setValueAtTime(startFreq, now);
      osc.frequency.exponentialRampToValueAtTime(135, now + 0.022);

      bodyGain.gain.setValueAtTime(0.09, now);
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.024);

      osc.connect(bodyGain);
      bodyGain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.025);
    } catch {
      // Ignore audio errors
    }
  };

  /**
   * Lush Cinematic Major-9th Reveal Chord + Warm Sub-Bass Lock Thump
   */
  const playWinChime = () => {
    if (!soundEnabledRef.current) return;
    try {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new Ctx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const now = ctx.currentTime;

      // Sub-bass lock impact
      const subOsc = ctx.createOscillator();
      const subGain = ctx.createGain();
      subOsc.type = 'sine';
      subOsc.frequency.setValueAtTime(140, now);
      subOsc.frequency.exponentialRampToValueAtTime(55, now + 0.35);
      subGain.gain.setValueAtTime(0.16, now);
      subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
      subOsc.connect(subGain);
      subGain.connect(ctx.destination);
      subOsc.start(now);
      subOsc.stop(now + 0.4);

      // Warm Major-9th arpeggio shimmer (C5 - E5 - G5 - B5 - D6 - G6)
      const chordNotes = [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98];
      chordNotes.forEach((freq, i) => {
        const start = now + i * 0.055;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain = ctx.createGain();

        osc1.type = 'triangle';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(freq, start);
        osc2.frequency.setValueAtTime(freq * 1.003, start); // subtle chorus detune

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(0.075, start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.85);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(start);
        osc2.start(start);
        osc1.stop(start + 0.88);
        osc2.stop(start + 0.88);
      });
    } catch {
      // Ignore audio errors
    }
  };

  const launchConfetti = () => {
    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.parentElement?.clientWidth || 860;
    canvas.height = canvas.parentElement?.clientHeight || 620;

    const colors = [
      '#FFFFFF',
      '#F59E0B',
      '#00E054',
      '#38BDF8',
      '#F43F5E',
      '#A855F7',
    ];
    const particles = Array.from({ length: 110 }, () => ({
      x: canvas.width / 2,
      y: 180,
      vx: (Math.random() - 0.5) * 16,
      vy: (Math.random() - 0.85) * 14 - 3,
      size: Math.random() * 7 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 12,
      alpha: 1,
    }));

    let frame = 0;
    const renderConfetti = () => {
      frame++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.34;
        p.vx *= 0.985;
        p.rotation += p.vRot;
        if (frame > 75) {
          p.alpha = Math.max(0, p.alpha - 0.025);
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.65);
        ctx.restore();
      });

      if (frame < 120) {
        requestAnimationFrame(renderConfetti);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    requestAnimationFrame(renderConfetti);
  };

  const prepareRoll = (pool: WheelCandidate[]) => {
    if (pool.length === 0) return;

    clearScheduledAudioAndTimers();
    setWinner(null);
    setIsRolling(true);

    const { tape, winningIndex, chosenWinner } =
      buildMaxSpreadRouletteTape(pool);

    setTapeItems(tape);
    setActiveWinningIndex(winningIndex);
    setPendingWinner(chosenWinner);
    setSpinTrigger((prev) => prev + 1);
  };

  // Execute the DOM transform animation once tapeItems are mounted in trackRef
  useEffect(() => {
    if (
      !isOpen ||
      spinTrigger === 0 ||
      tapeItems.length === 0 ||
      !pendingWinner
    ) {
      return;
    }

    const trackEl = trackRef.current;
    const viewportEl = viewportRef.current;
    if (!trackEl || !viewportEl) return;

    const viewportWidth = viewportEl.clientWidth || 780;
    const cardCenterAtWinningIndex =
      activeWinningIndex * ITEM_STRIDE_PX + CARD_WIDTH_PX / 2;
    const innerCardJitter = Math.floor(Math.random() * 72) - 36;
    const targetOffset =
      cardCenterAtWinningIndex - viewportWidth / 2 + innerCardJitter;

    // 1. Reset to 0px without transition
    trackEl.style.transition = 'none';
    trackEl.style.transform = 'translate3d(0px, 0, 0)';

    // 2. Force synchronous browser reflow so 0px is committed before starting transition
    void trackEl.offsetWidth;

    // 3. Apply 5-second deceleration transition to targetOffset
    trackEl.style.transition =
      'transform 5.0s cubic-bezier(0.10, 0.82, 0.14, 1)';
    trackEl.style.transform = `translate3d(${-targetOffset}px, 0, 0)`;

    // 4. Real-time frame tracker: fires a tactile click & tumbles the dice every time a poster crosses the center laser line
    let lastCardIndex = -1;
    const startTime = performance.now();
    const totalDuration = 5000;

    const trackCardCrossings = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / totalDuration);

      if (trackRef.current) {
        const matrix = window.getComputedStyle(trackRef.current).transform;
        let currentTranslateX = 0;
        if (matrix && matrix !== 'none') {
          const parts = matrix.match(/matrix.*\((.+)\)/);
          if (parts && parts[1]) {
            const values = parts[1].split(',').map((v) => parseFloat(v.trim()));
            currentTranslateX = Math.abs(
              values.length === 16 ? values[12] : values[4] || 0
            );
          }
        }
        const pointerX = currentTranslateX + viewportWidth / 2;
        const currentCardIndex = Math.floor(pointerX / ITEM_STRIDE_PX);

        if (currentCardIndex !== lastCardIndex && currentCardIndex >= 0) {
          lastCardIndex = currentCardIndex;
          playTickSound(progress);
        }
      }

      if (elapsed < totalDuration) {
        tickRafRef.current = window.requestAnimationFrame(trackCardCrossings);
      }
    };

    tickRafRef.current = window.requestAnimationFrame(trackCardCrossings);

    spinTimeoutRef.current = window.setTimeout(() => {
      setIsRolling(false);

      const shouldReplaceWithSecret = Boolean(
        secretOverride?.movie &&
          secretOverride.chancePercent > 0 &&
          Math.random() * 100 < secretOverride.chancePercent
      );

      let finalWinner: WheelCandidate = pendingWinner;

      if (shouldReplaceWithSecret && secretOverride?.movie) {
        const secretCandidate: WheelCandidate = {
          movie: secretOverride.movie,
        };
        setTapeItems((prev) =>
          prev.map((item, idx) =>
            idx === activeWinningIndex ? secretCandidate : item
          )
        );
        finalWinner = secretCandidate;
      }

      setWinner(finalWinner);
      playWinChime();
      launchConfetti();
      if (onWinnerSelected) {
        onWinnerSelected(finalWinner.movie);
      }
    }, 5100);

    return () => {
      clearScheduledAudioAndTimers();
    };
  }, [spinTrigger]);

  // Trigger roll automatically when modal opens (as before)
  useEffect(() => {
    if (!isOpen) {
      clearScheduledAudioAndTimers();
      setIsRolling(false);
      return;
    }

    if (candidates.length > 0) {
      prepareRoll(candidates);
    } else {
      setTapeItems([]);
      setWinner(null);
    }

    return () => {
      clearScheduledAudioAndTimers();
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isRolling) onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKey);
    }
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, isRolling, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/85 backdrop-blur-sm overflow-y-auto"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isRolling) {
          onClose();
        }
      }}
    >
      <div
        className="relative w-full max-w-4xl bg-[var(--bg-card)] text-[var(--text-main)] rounded-[28px] border border-[var(--border-subtle)] shadow-2xl overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Confetti Canvas Overlay */}
        <canvas
          ref={confettiCanvasRef}
          className="pointer-events-none absolute inset-0 z-30 w-full h-full"
        />

        {/* Top Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
          <h2 className="font-display text-2xl font-bold tracking-wide uppercase">
            {t.rouletteTitle}
          </h2>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleSound}
              aria-label={soundEnabled ? 'Mute sound' : 'Enable sound'}
              className="p-2.5 rounded-xl bg-[var(--bg-subcard)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
            >
              {soundEnabled ? (
                <PiSpeakerHighBold className="w-4.5 h-4.5" />
              ) : (
                <PiSpeakerSlashBold className="w-4.5 h-4.5" />
              )}
            </button>

            <button
              type="button"
              disabled={isRolling}
              onClick={onClose}
              aria-label="Close"
              className="p-2 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
            >
              <PiXBold className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Full-Format 2:3 Poster Roulette Viewport */}
        <div className="py-6 bg-[#09090B] relative overflow-hidden">
          <div
            ref={viewportRef}
            className="relative w-full h-[286px] overflow-hidden flex items-center"
          >
            {tapeItems.length === 0 ? (
              <div className="w-full text-center px-6">
                <p className="text-sm text-zinc-400">{t.emptyRouletteHint}</p>
              </div>
            ) : (
              <>
                {/* Soft Left & Right Dark Vignette Gradients */}
                <div className="pointer-events-none absolute inset-y-0 left-0 w-24 z-10 bg-gradient-to-r from-[#09090B] via-[#09090B]/70 to-transparent" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-24 z-10 bg-gradient-to-l from-[#09090B] via-[#09090B]/70 to-transparent" />

                {/* Center Vertical Laser Pointer Line */}
                <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center justify-between">
                  <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-t-[13px] border-t-white" />
                  <div className="w-[2.5px] flex-1 bg-white shadow-[0_0_16px_rgba(255,255,255,0.95)]" />
                  <div className="w-0 h-0 border-l-[9px] border-l-transparent border-r-[9px] border-r-transparent border-b-[13px] border-b-white" />
                </div>

                {/* Horizontal Moving Tape of Full-Format 2:3 Posters */}
                <div
                  ref={trackRef}
                  className="flex items-center will-change-transform"
                  style={{
                    gap: `${CARD_GAP_PX}px`,
                  }}
                >
                  {tapeItems.map((item, idx) => {
                    const isWinningSlot =
                      !isRolling && winner && idx === activeWinningIndex;
                    const titleText = getMovieTitle(item.movie, language);
                    return (
                      <div
                        key={`${item.movie.id}-${idx}`}
                        style={{
                          width: `${CARD_WIDTH_PX}px`,
                          height: `${CARD_HEIGHT_PX}px`,
                        }}
                        className={`relative shrink-0 rounded-2xl overflow-hidden bg-zinc-900 transition-transform duration-300 ${
                          isWinningSlot
                            ? 'ring-3 ring-white scale-105 shadow-2xl'
                            : 'opacity-90'
                        }`}
                      >
                        {item.movie.posterPath ? (
                          <img
                            src={item.movie.posterPath}
                            alt={titleText}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-zinc-800">
                            <PiFilmSlateBold className="w-8 h-8 text-zinc-400 mb-2" />
                            <span className="font-display text-sm text-white uppercase">
                              {titleText}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Spin Again Button (shown only after the spin finishes) */}
          {!isRolling && candidates.length > 0 && (
            <div className="mt-5 flex items-center justify-center">
              <button
                type="button"
                onClick={() => prepareRoll(candidates)}
                className="px-5 py-2.5 rounded-xl bg-[#18181F] hover:bg-white text-white hover:text-black border border-white/15 font-sans text-xs font-semibold tracking-wider uppercase flex items-center gap-2 transition-colors cursor-pointer"
              >
                <PiArrowCounterClockwiseBold className="w-3.5 h-3.5" />
                <span>{t.spinAgain}</span>
              </button>
            </div>
          )}
        </div>

        {/* Winner Drop Reveal ONLY (No movies list below) */}
        {winner && !isRolling && (
          <div className="p-6">
            <div className="p-5 rounded-2xl bg-[var(--bg-subcard)] border border-[var(--border-subtle)] flex flex-col sm:flex-row gap-5 items-center sm:items-start">
              {winner.movie.posterPath ? (
                <img
                  src={winner.movie.posterPath}
                  alt={getMovieTitle(winner.movie, language)}
                  referrerPolicy="no-referrer"
                  className="w-24 h-36 object-cover rounded-xl shadow-md shrink-0"
                />
              ) : (
                <div className="w-24 h-36 rounded-xl bg-zinc-800 flex items-center justify-center shrink-0">
                  <PiFilmSlateBold className="w-8 h-8 text-zinc-400" />
                </div>
              )}
              <div className="flex-1 min-w-0 space-y-2.5 text-center sm:text-left">
                <div className="text-[11px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                  {t.winnerBadge}
                </div>
                <h3 className="font-display text-xl sm:text-2xl font-extrabold uppercase tracking-tight">
                  {getMovieTitle(winner.movie, language)}
                </h3>
                <p className="text-xs sm:text-sm text-[var(--text-muted)] font-medium">
                  {getMovieSecondaryTitle(winner.movie, language)} ·{' '}
                  {winner.movie.releaseYear} · {winner.movie.runtime}{' '}
                  {t.minUnit} ·{' '}
                  {getMovieGenres(winner.movie, language).join(' · ')}
                </p>

                <div className="max-w-md">
                  <MultiRatingBar
                    ratings={winner.movie.ratings}
                    language={language}
                    variant="compact"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenMovieDetail(winner.movie, true);
                    }}
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--accent-text)',
                    }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-opacity hover:opacity-90 cursor-pointer"
                  >
                    <PiPlayFill className="w-3.5 h-3.5" />
                    <span>{t.watchTrailerAndDetails}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
