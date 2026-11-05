import { AppLanguage, MovieItem } from '../types/movie';

export function getMovieTitle(movie: MovieItem, lang: AppLanguage): string {
  if (lang === 'en-US') {
    return (
      movie.titleEn ||
      movie.originalTitle ||
      movie.titleUk ||
      movie.title ||
      'Untitled'
    );
  }
  return (
    movie.titleUk ||
    movie.title ||
    movie.titleEn ||
    movie.originalTitle ||
    'Без назви'
  );
}

/**
 * Returns the secondary language title if it differs from the primary displayed title.
 */
export function getMovieAltTitle(
  movie: MovieItem,
  lang: AppLanguage
): string | null {
  const primary = getMovieTitle(movie, lang).trim();
  const candidate =
    lang === 'en-US'
      ? (movie.titleUk || movie.originalTitle || '').trim()
      : (movie.titleEn || movie.originalTitle || '').trim();

  if (!candidate) return null;
  if (candidate.toLowerCase() === primary.toLowerCase()) return null;
  return candidate;
}

export function getMovieSecondaryTitle(
  movie: MovieItem,
  lang: AppLanguage
): string {
  if (lang === 'en-US') {
    return movie.directorEn || movie.director || '';
  }
  return movie.titleEn || movie.originalTitle || '';
}

export function getMovieOverview(movie: MovieItem, lang: AppLanguage): string {
  if (lang === 'en-US') {
    return movie.overviewEn || movie.overview || movie.overviewUk || '';
  }
  return movie.overviewUk || movie.overview || movie.overviewEn || '';
}

export function getMovieGenres(movie: MovieItem, lang: AppLanguage): string[] {
  if (lang === 'en-US') {
    return movie.genresEn?.length
      ? movie.genresEn
      : movie.genres || ['Movie'];
  }
  return movie.genresUk?.length ? movie.genresUk : movie.genres || ['Кіно'];
}

export function getMovieDirector(
  movie: MovieItem,
  lang: AppLanguage
): string {
  if (lang === 'en-US') {
    return movie.directorEn || movie.director || 'TMDb';
  }
  return movie.directorUk || movie.director || 'TMDb';
}

export function getMovieCast(movie: MovieItem, lang: AppLanguage): string[] {
  if (lang === 'en-US') {
    return movie.castEn?.length ? movie.castEn : movie.cast || [];
  }
  return movie.castUk?.length ? movie.castUk : movie.cast || [];
}

export const UI_TEXT = {
  'uk-UA': {
    brand: 'КІНОРУЛЕТКА',
    settings: 'Налаштування',
    headline: 'ДОДАВАЙ ФІЛЬМИ ТА КРУТИ РУЛЕТКУ',
    searchPlaceholder: 'Пошук фільму',
    advancedSearchBtn: 'Розширений пошук',
    advancedSearchTitle: 'РОЗШИРЕНИЙ ПОШУК',
    advQueryPlaceholder: 'Назва українською або англійською...',
    advFilterGenres: 'ЖАНРИ',
    advFilterYears: 'РОКИ',
    advFilterMinRating: 'МІН. РЕЙТИНГ',
    advFilterSortBy: 'СОРТУВАННЯ',
    advSortPopular: 'Популярні',
    advSortRating: 'Рейтинг',
    advSortNewest: 'Нові',
    advSearchActionBtn: 'Шукати',
    advResetFilters: 'Скинути фільтри',
    advAnyRating: 'Всі',
    advNoApiKeyTitle: 'ПІДКЛЮЧІТЬ КЛЮЧ TMDB API',
    advNoApiKeyDesc: 'Введіть ваш ключ TMDb API у налаштуваннях.',
    advOpenSettingsBtn: 'Налаштування ключа',
    advNoResults: 'Нічого не знайдено.',
    addBtn: 'Додати',
    addedBtn: 'Додано',
    searchingTmdb: 'Пошук...',
    tmdbResults: 'Результати',
    noApiKeyShort: 'Вкажіть ключ TMDb у налаштуваннях або додайте вручну:',
    noExactMatch: 'Нічого не знайдено.',
    addCustomBtn: 'Додати',
    spinRoulette: 'КРУТИТИ РУЛЕТКУ',
    myMoviesTab: 'ФІЛЬМИ',
    wishlistTab: 'СПИСОК БАЖАНОГО',
    clearList: 'Очистити список',
    emptyPoolTitle: 'СПИСОК ПОРОЖНІЙ',
    emptyWishlistTitle: 'СПИСОК БАЖАНОГО ПОРОЖНІЙ',
    settingsTitle: 'НАЛАШТУВАННЯ',
    themeLabel: 'ТЕМА',
    themeDark: 'Темна',
    themeWhite: 'Біла',
    languageLabel: 'МОВА',
    langUk: 'Українська',
    langEn: 'English',
    tmdbLabel: 'КЛЮЧ TMDB API',
    tmdbActiveBadge: 'Підключено',
    getApiKey: 'Отримати ключ',
    apiKeyPlaceholder: 'TMDb v3 ключ або Read Token...',
    testBtn: 'Тест',
    saveSettings: 'Готово',
    rouletteTitle: 'РУЛЕТКА',
    rollingTape: 'КРУТИМО...',
    spinAgain: 'КРУТИТИ ЩЕ РАЗ',
    winnerBadge: 'ВИБІР НА ВЕЧІР',
    watchTrailerAndDetails: 'Деталі та трейлер',
    allMoviesInTape: 'УСІ ФІЛЬМИ В СТРІЧЦІ',
    emptyRouletteHint: 'Немає активних фільмів для рулетки.',
    watchTrailer: 'ДИВИТИСЯ ТРЕЙЛЕР',
    backToDetails: '← Назад',
    compositeIndex: 'Рейтинг',
    aboutMovie: 'СИНОПСИС',
    castAndCrew: 'СКЛАД ФІЛЬМУ',
    runtimeLabel: 'Тривалість',
    minUnit: 'хв',
    castLabel: 'Актори',
    directorLabel: 'Режисер',
    personMoviesTitle: 'Інші фільми:',
    loadingFilmography: 'Завантаження фільмографії...',
    noPersonMovies: 'Інших фільмів не знайдено.',
    inRoulettePool: 'У РУЛЕТЦІ',
    addedToPoolTooltip: 'Додано у фільми',
    addToRoulettePool: 'У РУЛЕТКУ',
    addToWishlistTitle: 'У список бажаного',
    removeFromWishlistTitle: 'Прибрати з бажаного',
    moveToRouletteTitle: 'Додати у фільми',
    deleteMovieTitle: 'Видалити',
    chosenBadge: 'ОБРАНО',
    watchedStatusLabel: 'Переглянуто',
    chosenStatusLabel: 'Обрано',
    markAsChosen: 'Відмітити як обраний',
    unmarkChosen: 'Зняти відмітку обраного',
    excludeFromRouletteBtn: 'Прибрати з рулетки (залишити у фільмах)',
    includeInRouletteBtn: 'Повернути в рулетку',
    pausedFromRouletteBadge: 'Поза рулеткою',
    rateMovieBtn: 'Оцінити',
    myRatingLabel: 'МОЯ ОЦІНКА',
    clearRating: 'Скинути',
    secretMovieTitle: 'ПІДМІНА ФІЛЬМУ',
    secretMovieSearchPlaceholder: 'Пошук фільму для підміни...',
    secretChanceLabel: 'Шанс підміни результату',
    secretMovieRemove: 'Прибрати',
    filterAndSortTitle: 'Фільтр і сортування',
    filterSectionLabel: 'ФІЛЬТР',
    sortSectionLabel: 'СОРТУВАННЯ',
    sortPlatformLabel: 'Платформа оцінки',
    filterAll: 'Усі',
    filterActiveRoulette: 'У рулетці',
    filterChosenBw: 'Обрані',
    filterWatched: 'Переглянуті',
    filterInPool: 'Додані ✓',
    filterNotInPool: 'Не додані',
    filterInWishlist: 'У бажаному',
    filterRated: 'Оцінені ★',
    sortGroupDefault: 'Стандарт',
    sortGroupRating: 'За оцінкою',
    sortGroupYear: 'За роком',
    sortMyStarsShort: 'Моя ★',
    sortYearNewest: 'Новіші ↓',
    sortYearOldest: 'Старіші ↑',
    resetFilterBtn: 'Скинути',
    noMoviesMatchFilter: 'За обраним фільтром фільмів не знайдено',
  },
  'en-US': {
    brand: 'CINEROULETTE',
    settings: 'Settings',
    headline: 'ADD MOVIES & SPIN ROULETTE',
    searchPlaceholder: 'Search movie',
    advancedSearchBtn: 'Advanced search',
    advancedSearchTitle: 'ADVANCED SEARCH',
    advQueryPlaceholder: 'Movie title in English or Ukrainian...',
    advFilterGenres: 'GENRES',
    advFilterYears: 'YEARS',
    advFilterMinRating: 'MIN. RATING',
    advFilterSortBy: 'SORT BY',
    advSortPopular: 'Popular',
    advSortRating: 'By rating',
    advSortNewest: 'Newest',
    advSearchActionBtn: 'Search',
    advResetFilters: 'Reset filters',
    advAnyRating: 'All',
    advNoApiKeyTitle: 'CONNECT TMDB API KEY',
    advNoApiKeyDesc: 'Enter your TMDb API key in Settings.',
    advOpenSettingsBtn: 'Open Settings',
    advNoResults: 'No movies found.',
    addBtn: 'Add',
    addedBtn: 'Added',
    searchingTmdb: 'Searching...',
    tmdbResults: 'Results',
    noApiKeyShort: 'Set TMDb API key in Settings or add custom title:',
    noExactMatch: 'No matches found.',
    addCustomBtn: 'Add',
    spinRoulette: 'SPIN ROULETTE',
    myMoviesTab: 'MOVIES',
    wishlistTab: 'WISHLIST',
    clearList: 'Clear list',
    emptyPoolTitle: 'LIST IS EMPTY',
    emptyWishlistTitle: 'WISHLIST IS EMPTY',
    settingsTitle: 'SETTINGS',
    themeLabel: 'THEME',
    themeDark: 'Dark',
    themeWhite: 'White',
    languageLabel: 'LANGUAGE',
    langUk: 'Українська',
    langEn: 'English',
    tmdbLabel: 'TMDB API KEY',
    tmdbActiveBadge: 'Connected',
    getApiKey: 'Get Key',
    apiKeyPlaceholder: 'TMDb v3 key or Read Token...',
    testBtn: 'Test',
    saveSettings: 'Done',
    rouletteTitle: 'ROULETTE',
    rollingTape: 'SPINNING...',
    spinAgain: 'SPIN AGAIN',
    winnerBadge: 'TONIGHT’S PICK',
    watchTrailerAndDetails: 'Details & Trailer',
    allMoviesInTape: 'ALL MOVIES IN REEL',
    emptyRouletteHint: 'No active movies in the roulette.',
    watchTrailer: 'WATCH TRAILER',
    backToDetails: '← Back',
    compositeIndex: 'Score',
    aboutMovie: 'SYNOPSIS',
    castAndCrew: 'CAST & CREW',
    runtimeLabel: 'Runtime',
    minUnit: 'min',
    castLabel: 'Cast',
    directorLabel: 'Director',
    personMoviesTitle: 'Known for:',
    loadingFilmography: 'Loading filmography...',
    noPersonMovies: 'No other movies found.',
    inRoulettePool: 'IN ROULETTE',
    addedToPoolTooltip: 'Added to movies',
    addToRoulettePool: 'ADD TO ROULETTE',
    addToWishlistTitle: 'Add to Wishlist',
    removeFromWishlistTitle: 'Remove from Wishlist',
    moveToRouletteTitle: 'Add to Movies',
    deleteMovieTitle: 'Remove',
    chosenBadge: 'CHOSEN',
    watchedStatusLabel: 'Watched',
    chosenStatusLabel: 'Chosen',
    markAsChosen: 'Mark as chosen',
    unmarkChosen: 'Unmark chosen',
    excludeFromRouletteBtn: 'Remove from roulette (keep in movies)',
    includeInRouletteBtn: 'Include in roulette',
    pausedFromRouletteBadge: 'Paused from roulette',
    rateMovieBtn: 'Rate',
    myRatingLabel: 'MY RATING',
    clearRating: 'Clear',
    secretMovieTitle: 'SECRET MOVIE OVERRIDE',
    secretMovieSearchPlaceholder: 'Search movie for override...',
    secretChanceLabel: 'Chance to replace winner',
    secretMovieRemove: 'Remove',
    filterAndSortTitle: 'Filter & Sort',
    filterSectionLabel: 'FILTER',
    sortSectionLabel: 'SORT BY',
    sortPlatformLabel: 'Rating platform',
    filterAll: 'All',
    filterActiveRoulette: 'In roulette',
    filterChosenBw: 'Chosen',
    filterWatched: 'Watched',
    filterInPool: 'Added ✓',
    filterNotInPool: 'Not added',
    filterInWishlist: 'In wishlist',
    filterRated: 'Rated ★',
    sortGroupDefault: 'Default',
    sortGroupRating: 'By rating',
    sortGroupYear: 'By year',
    sortMyStarsShort: 'My ★',
    sortYearNewest: 'Newest ↓',
    sortYearOldest: 'Oldest ↑',
    resetFilterBtn: 'Reset',
    noMoviesMatchFilter: 'No movies match the selected filter',
  },
} as const;


