import React, { useEffect, useState } from 'react';
import {
  X,
  Settings,
  Check,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  KeyRound,
  Search,
  Sparkles,
  Trash2,
  Film,
  Plus,
  ChevronDown,
} from 'lucide-react';
import {
  AppLanguage,
  ColorThemeId,
  MovieItem,
  SecretOverrideConfig,
  TmdbConfigState,
} from '../types/movie';
import {
  createCustomMovieItem,
  fetchTmdbMovieDetails,
  searchTmdbForAdding,
  testTmdbApiKey,
} from '../services/tmdbService';
import { getMovieAltTitle, getMovieTitle, UI_TEXT } from '../utils/i18n';

interface SettingsPopoverProps {
  isOpen: boolean;
  colorTheme: ColorThemeId;
  tmdbConfig: TmdbConfigState;
  secretOverride: SecretOverrideConfig;
  onClose: () => void;
  onChangeColorTheme: (theme: ColorThemeId) => void;
  onSaveTmdbConfig: (config: TmdbConfigState) => void;
  onChangeSecretOverride: (config: SecretOverrideConfig) => void;
}

export const SettingsPopover: React.FC<SettingsPopoverProps> = ({
  isOpen,
  colorTheme,
  tmdbConfig,
  secretOverride,
  onClose,
  onChangeColorTheme,
  onSaveTmdbConfig,
  onChangeSecretOverride,
}) => {
  const [apiKey, setApiKey] = useState<string>(tmdbConfig.customApiKey || '');
  const [language, setLanguage] = useState<AppLanguage>(tmdbConfig.language);
  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  // Collapsible TMDb API key section: collapsed by default when a key is already saved
  const [isTmdbExpanded, setIsTmdbExpanded] = useState<boolean>(
    () => !(tmdbConfig.customApiKey && tmdbConfig.customApiKey.trim().length > 5)
  );

  // Secret movie search state
  const [secretQuery, setSecretQuery] = useState<string>('');
  const [secretResults, setSecretResults] = useState<MovieItem[]>([]);
  const [isSearchingSecret, setIsSearchingSecret] = useState<boolean>(false);
  const [chanceInputText, setChanceInputText] = useState<string>(
    String(secretOverride.chancePercent)
  );

  useEffect(() => {
    setApiKey(tmdbConfig.customApiKey || '');
    setLanguage(tmdbConfig.language);
    if (isOpen) {
      const hasKey = Boolean(
        tmdbConfig.customApiKey && tmdbConfig.customApiKey.trim().length > 5
      );
      setIsTmdbExpanded(!hasKey);
      setChanceInputText(String(secretOverride.chancePercent));
    }
  }, [
    tmdbConfig.customApiKey,
    tmdbConfig.language,
    secretOverride.chancePercent,
    isOpen,
  ]);

  useEffect(() => {
    let isCancelled = false;
    if (!secretQuery.trim()) {
      setSecretResults([]);
      setIsSearchingSecret(false);
      return;
    }

    setIsSearchingSecret(true);
    const timer = setTimeout(async () => {
      const res = await searchTmdbForAdding({
        query: secretQuery,
        apiKey: apiKey.trim(),
        language,
      });
      if (!isCancelled) {
        setSecretResults(res.results.slice(0, 6));
        setIsSearchingSecret(false);
      }
    }, 220);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [secretQuery, apiKey, language]);

  if (!isOpen) return null;

  const t = UI_TEXT[language];
  const hasSavedKey = apiKey.trim().length > 5;

  const themes: {
    id: ColorThemeId;
    name: string;
    bgPreview: string;
    accentPreview: string;
  }[] = [
    {
      id: 'dark-white',
      name: t.themeDark,
      bgPreview: '#09090B',
      accentPreview: '#FFFFFF',
    },
    {
      id: 'pure-white',
      name: t.themeWhite,
      bgPreview: '#FFFFFF',
      accentPreview: '#09090B',
    },
  ];

  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    onSaveTmdbConfig({
      ...tmdbConfig,
      mode: 'custom',
      customApiKey: val.trim(),
      language,
      lastSyncStatus: val.trim().length > 5 ? 'connected' : 'idle',
    });
  };

  const handleLanguageChange = (nextLang: AppLanguage) => {
    setLanguage(nextLang);
    onSaveTmdbConfig({
      ...tmdbConfig,
      mode: 'custom',
      customApiKey: apiKey.trim(),
      language: nextLang,
    });
  };

  const handleTestKey = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await testTmdbApiKey(apiKey, language);
    setTesting(false);
    setTestResult(res);
    if (res.ok) {
      onSaveTmdbConfig({
        ...tmdbConfig,
        mode: 'custom',
        customApiKey: apiKey.trim(),
        language,
        lastSyncStatus: 'connected',
        lastSyncMessage: res.message,
      });
    }
  };

  const handleSelectSecretMovie = async (movie: MovieItem) => {
    let enriched = movie;
    if (apiKey.trim().length > 5) {
      enriched = await fetchTmdbMovieDetails(movie, apiKey.trim());
    }
    const nextChance =
      secretOverride.chancePercent > 0 ? secretOverride.chancePercent : 1;
    onChangeSecretOverride({
      movie: enriched,
      chancePercent: nextChance,
    });
    setChanceInputText(String(nextChance));
    setSecretQuery('');
    setSecretResults([]);
  };

  const handleAddCustomSecretMovie = (e: React.FormEvent) => {
    e.preventDefault();
    if (!secretQuery.trim()) return;
    if (secretResults.length > 0) {
      handleSelectSecretMovie(secretResults[0]);
      return;
    }
    const custom = createCustomMovieItem(secretQuery.trim());
    const nextChance =
      secretOverride.chancePercent > 0 ? secretOverride.chancePercent : 1;
    onChangeSecretOverride({
      movie: custom,
      chancePercent: nextChance,
    });
    setChanceInputText(String(nextChance));
    setSecretQuery('');
    setSecretResults([]);
  };

  const handleChanceInputChange = (rawText: string) => {
    const digitsOnly = rawText.replace(/[^\d]/g, '').slice(0, 3);
    setChanceInputText(digitsOnly);
    const num = digitsOnly === '' ? 0 : Math.min(100, Number(digitsOnly));
    onChangeSecretOverride({
      ...secretOverride,
      chancePercent: num,
    });
  };

  const handleChanceInputBlur = () => {
    const clamped = Math.max(
      0,
      Math.min(100, Number(chanceInputText || 0))
    );
    setChanceInputText(String(clamped));
    onChangeSecretOverride({
      ...secretOverride,
      chancePercent: clamped,
    });
  };

  const handleSave = () => {
    onSaveTmdbConfig({
      mode: 'custom',
      customApiKey: apiKey.trim(),
      language,
      lastSyncStatus: apiKey.trim().length > 5 ? 'connected' : 'idle',
      lastSyncMessage: testResult?.message,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-start p-4 sm:p-8 bg-black/60 backdrop-blur-[2px] overflow-y-auto"
      onClick={handleSave}
    >
      <div
        className="w-full max-w-md rounded-[26px] bg-[var(--bg-card)] text-[var(--text-main)] border border-[var(--border-subtle)] shadow-2xl p-5 space-y-4 mt-4 sm:ml-6 animate-in fade-in zoom-in-95 duration-150 my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--border-subtle)] pb-3">
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <h3 className="font-display text-sm sm:text-base font-bold tracking-wider uppercase">
              {t.settingsTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={handleSave}
            aria-label="Close"
            className="p-1.5 rounded-xl text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Theme Selector: Strictly Dark (White accent) and White */}
        <div className="space-y-2">
          <span className="font-sans text-[11px] font-bold tracking-wider uppercase text-[var(--text-muted)] block">
            {t.themeLabel}
          </span>

          <div className="grid grid-cols-2 gap-2">
            {themes.map((item) => {
              const active = colorTheme === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onChangeColorTheme(item.id)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                    active
                      ? 'border-[var(--accent-primary)] bg-[var(--bg-subcard)] font-bold'
                      : 'border-transparent bg-[var(--bg-subcard)]/60 hover:bg-[var(--bg-subcard)]'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-5 h-5 rounded-full border border-zinc-500/40 flex items-center justify-center shrink-0"
                      style={{ backgroundColor: item.bgPreview }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: item.accentPreview }}
                      />
                    </span>
                    <span>{item.name}</span>
                  </div>

                  {active && <Check className="w-4 h-4" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Site & Movie Titles Language Selector (UA / EN) */}
        <div className="space-y-2 pt-3 border-t border-[var(--border-subtle)]">
          <span className="font-sans text-[11px] font-bold tracking-wider uppercase text-[var(--text-muted)] block">
            {t.languageLabel}
          </span>
          <div className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[var(--bg-subcard)]">
            <button
              type="button"
              onClick={() => handleLanguageChange('uk-UA')}
              style={
                language === 'uk-UA'
                  ? {
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--accent-text)',
                    }
                  : undefined
              }
              className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                language === 'uk-UA'
                  ? 'font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {t.langUk}
            </button>
            <button
              type="button"
              onClick={() => handleLanguageChange('en-US')}
              style={
                language === 'en-US'
                  ? {
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--accent-text)',
                    }
                  : undefined
              }
              className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                language === 'en-US'
                  ? 'font-bold'
                  : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'
              }`}
            >
              {t.langEn}
            </button>
          </div>
        </div>

        {/* 3. Secret Movie Override */}
        <div className="space-y-2.5 pt-3 border-t border-[var(--border-subtle)]">
          <span className="font-sans text-[11px] font-bold tracking-wider uppercase text-[var(--text-muted)] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>{t.secretMovieTitle}</span>
          </span>

          {!secretOverride.movie ? (
            <div className="space-y-2 relative">
              <form onSubmit={handleAddCustomSecretMovie} className="relative">
                <Search className="w-4 h-4 text-[var(--text-muted)] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={secretQuery}
                  onChange={(e) => setSecretQuery(e.target.value)}
                  placeholder={t.secretMovieSearchPlaceholder}
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-[var(--bg-subcard)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-primary)]"
                />
                {secretQuery.trim() && (
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-lg bg-white text-black cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </form>

              {secretQuery.trim() && (
                <div className="rounded-xl bg-[var(--bg-subcard)] border border-[var(--border-subtle)] overflow-hidden max-h-48 overflow-y-auto divide-y divide-[var(--border-subtle)]">
                  {isSearchingSecret ? (
                    <div className="p-3 text-xs text-center text-[var(--text-muted)]">
                      {t.searchingTmdb}
                    </div>
                  ) : secretResults.length > 0 ? (
                    secretResults.map((item) => {
                      const itemTitle = getMovieTitle(item, language);
                      const altTitle = getMovieAltTitle(item, language);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSelectSecretMovie(item)}
                          className="w-full p-2.5 flex items-center gap-2.5 text-left hover:bg-black/10 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          {item.posterPath ? (
                            <img
                              src={item.posterPath}
                              alt={itemTitle}
                              referrerPolicy="no-referrer"
                              className="w-8 h-12 object-cover rounded-md shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-12 rounded-md bg-zinc-800 flex items-center justify-center shrink-0">
                              <Film className="w-4 h-4 text-zinc-400" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="font-sans text-xs font-semibold truncate">
                              {itemTitle}
                            </div>
                            {altTitle && (
                              <div className="text-[11px] text-[var(--text-muted)] truncate">
                                {altTitle}
                              </div>
                            )}
                            <div className="text-[11px] text-[var(--text-muted)] tabular-nums">
                              {item.releaseYear}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <button
                      type="button"
                      onClick={handleAddCustomSecretMovie}
                      className="w-full p-3 text-xs font-semibold text-center hover:bg-white/5 cursor-pointer"
                    >
                      + {t.addCustomBtn} «{secretQuery}»
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-[var(--bg-subcard)] border border-[var(--border-subtle)] space-y-3">
              {/* Selected Secret Movie Card */}
              <div className="flex items-center justify-between gap-2.5">
                <div className="flex items-center gap-3 min-w-0">
                  {secretOverride.movie.posterPath ? (
                    <img
                      src={secretOverride.movie.posterPath}
                      alt={getMovieTitle(secretOverride.movie, language)}
                      referrerPolicy="no-referrer"
                      className="w-10 h-14 object-cover rounded-lg shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-14 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                      <Film className="w-4 h-4 text-zinc-400" />
                    </div>
                  )}
                  <div className="min-w-0 space-y-0.5">
                    <div className="font-sans text-sm font-bold truncate">
                      {getMovieTitle(secretOverride.movie, language)}
                    </div>
                    <div className="text-xs text-[var(--text-muted)] tabular-nums">
                      {secretOverride.movie.releaseYear} · IMDb{' '}
                      {secretOverride.movie.ratings.imdb.score.toFixed(1)}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    onChangeSecretOverride({
                      movie: null,
                      chancePercent: secretOverride.chancePercent,
                    })
                  }
                  aria-label={t.secretMovieRemove}
                  className="p-2 rounded-xl text-[var(--text-muted)] hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Manual Chance Percentage Input: Entire Box is the Input */}
              <div className="flex items-center justify-between gap-3 pt-2.5 border-t border-[var(--border-subtle)]">
                <span className="font-sans text-xs font-medium text-[var(--text-muted)]">
                  {t.secretChanceLabel}:
                </span>
                <label className="relative inline-flex items-center cursor-text">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={chanceInputText}
                    onFocus={(e) => e.currentTarget.select()}
                    onChange={(e) => handleChanceInputChange(e.target.value)}
                    onBlur={handleChanceInputBlur}
                    className="w-20 h-9 pl-3 pr-7 rounded-xl bg-[var(--bg-card)] border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] text-center font-sans tabular-nums text-xs font-bold text-[var(--text-main)] focus:outline-none transition-colors cursor-text"
                  />
                  <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 font-sans text-xs font-semibold text-[var(--text-muted)] select-none">
                    %
                  </span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* 4. Collapsible Permanent TMDb API Key */}
        <div className="pt-3 border-t border-[var(--border-subtle)]">
          <button
            type="button"
            onClick={() => setIsTmdbExpanded((prev) => !prev)}
            className="w-full flex items-center justify-between py-1 text-left cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="font-sans text-[11px] font-bold tracking-wider uppercase text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-colors">
                {t.tmdbLabel}
              </span>
              {hasSavedKey && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-sans text-[10px] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{t.tmdbActiveBadge}</span>
                </span>
              )}
            </div>

            <ChevronDown
              className={`w-4 h-4 text-[var(--text-muted)] group-hover:text-[var(--text-main)] transition-transform duration-200 ${
                isTmdbExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>

          {isTmdbExpanded && (
            <div className="mt-2.5 space-y-2 animate-in fade-in duration-150">
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => handleApiKeyChange(e.target.value)}
                  placeholder={t.apiKeyPlaceholder}
                  className="flex-1 px-3 py-2 rounded-xl bg-[var(--bg-subcard)] border border-[var(--border-subtle)] text-xs text-[var(--text-main)] font-sans focus:outline-none focus:border-[var(--accent-primary)]"
                />
                <button
                  type="button"
                  disabled={testing}
                  onClick={handleTestKey}
                  className="px-3 py-2 rounded-xl bg-[var(--bg-subcard)] hover:opacity-80 border border-[var(--border-subtle)] text-xs font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`}
                  />
                  <span>{t.testBtn}</span>
                </button>
              </div>

              <div className="flex items-center justify-between px-0.5">
                <a
                  href="https://www.themoviedb.org/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:underline inline-flex items-center gap-1 font-medium"
                >
                  <span>{t.getApiKey}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {testResult && (
                <div
                  className={`flex items-start gap-1.5 p-2 rounded-xl text-[11px] ${
                    testResult.ok
                      ? 'bg-emerald-500/15 text-emerald-400'
                      : 'bg-rose-500/15 text-rose-400'
                  }`}
                >
                  {testResult.ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  )}
                  <span>{testResult.message}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Compact Right-Aligned Footer Action */}
        <div className="pt-2 border-t border-[var(--border-subtle)] flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: 'var(--accent-text)',
            }}
            className="px-5 py-2 rounded-xl font-sans text-xs font-bold tracking-wider uppercase transition-opacity hover:opacity-90 cursor-pointer"
          >
            {t.saveSettings}
          </button>
        </div>
      </div>
    </div>
  );
};

