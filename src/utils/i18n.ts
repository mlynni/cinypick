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
    advQueryPlaceholder: 'Пошук фільму',
    advYearInputPlaceholder: 'Рік або 2010-2020',
    advFilterGenres: 'ЖАНРИ',
    advFilterYears: 'РОКИ',
    advFilterMinRating: 'МІН. РЕЙТИНГ',
    advFilterSortBy: 'СОРТУВАННЯ',
    advSortPopular: 'Популярність',
    advSortRating: 'Рейтинг',
    advSortNewest: 'Нові',
    advSearchActionBtn: 'Шукати',
    advResetFilters: 'Скинути фільтри',
    advAnyRating: 'Всі',
    advNoApiKeyTitle: 'ПІДКЛЮЧІТЬ КЛЮЧ TMDB API',
    advNoApiKeyDesc: 'Введіть ваш ключ TMDb API у налаштуваннях.',
    advOpenSettingsBtn: 'Налаштування ключа',
    advNoResults: 'Нічого не знайдено за цими параметрами.',
    advMoodTrending: 'В тренді',
    advMoodTopRated: 'Шедеври 8.0+',
    advMoodCult: 'Культові хіти',
    advMoodShort: 'Короткі ≤ 100 хв',
    advMoodNew: 'Новинки',
    advFilterDecade: 'ЕПОХА / РОКИ',
    advDecadeAll: 'Усі роки',
    advDecadeClassic: 'До 1980',
    advFilterRuntime: 'ТРИВАЛІСТЬ',
    advRuntimeAll: 'Всі',
    advRuntimeShort: '≤ 95 хв',
    advRuntimeStandard: '≤ 120 хв',
    advRuntimeLong: '≤ 150 хв',
    advRuntimeEpic: '150+ хв',
    advSortMostVoted: 'Культові',
    advHideExisting: 'Сховати вже додані й переглянуті',
    advLoadMore: 'Показати ще фільми',
    addBtn: 'Додати',
    addedBtn: 'Додано',
    searchingTmdb: 'Пошук...',
    tmdbResults: 'Результати',
    noApiKeyShort: 'Вкажіть ключ TMDb у налаштуваннях або додайте вручну:',
    noExactMatch: 'Нічого не знайдено.',
    addCustomBtn: 'Додати',
    spinRoulette: 'КРУТИТИ РУЛЕТКУ',
    myMoviesTab: 'У РУЛЕТЦІ',
    watchedTab: 'ПЕРЕГЛЯНУТЕ',
    wishlistTab: 'СПИСОК БАЖАНОГО',
    clearList: 'Очистити список',
    deleteSelectedBtn: 'Видалити обрані',
    deleteAllBtn: 'Видалити все',
    emptyPoolTitle: 'СПИСОК РУЛЕТКИ ПОРОЖНІЙ',
    emptyWatchedTitle: 'СПИСОК ПЕРЕГЛЯНУТОГО ПОРОЖНІЙ',
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
    similarMoviesTitle: 'СХОЖІ ФІЛЬМИ',
    loadingSimilarMovies: 'Завантаження схожих фільмів...',
    noSimilarMovies: 'Схожих фільмів не знайдено.',
    inRoulettePool: 'У РУЛЕТЦІ',
    addedToPoolTooltip: 'У рулетці',
    addToRoulettePool: 'У РУЛЕТКУ',
    addToWishlistTitle: 'У бажане',
    removeFromWishlistTitle: 'З бажаного',
    moveToRouletteTitle: 'У рулетку',
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
    sortGroupRating: 'Рейтинг',
    sortGroupYear: 'Рік',
    sortMyStarsShort: 'Моя ★',
    sortYearNewest: 'Новіші ↓',
    sortYearOldest: 'Старіші ↑',
    resetFilterBtn: 'Скинути',
    noMoviesMatchFilter: 'За обраним фільтром фільмів не знайдено',
    sessionCodeLabel: 'ПЕРЕНЕСЕННЯ СПИСКУ (ПОСИЛАННЯ СЕСІЇ)',
    sessionCopyBtn: 'Скопіювати посилання на сесію',
    sessionCopiedBtn: 'Посилання скопійовано!',
    sessionPastePlaceholder: 'Вставте посилання або код сесії...',
    sessionLoadBtn: 'Завантажити',
    sessionEmptyHint: 'Спочатку додайте фільми у список',
    sessionLoadError: 'Невірне або пошкоджене посилання сесії.',
    loadStarterHitsBtn: 'Завантажити стартову добірку хітів',
    emptyPoolHint: 'Знайдіть фільми через пошук або завантажте готову добірку',
    undoAction: 'Скасувати',
    listClearedToast: 'Список очищено',
    movieRemovedToast: 'Фільм видалено зі списку',
    sessionImportedToast: 'Список фільмів імпортовано за посиланням!',
    rouletteModeStandard: 'Класичний',
    rouletteModeElimination: 'На вибування',
    eliminatedBadge: 'ВИБУВАЄ З ГРИ',
    nextEliminationSpin: 'ВИБИТИ НАСТУПНИЙ',
    rouletteFilterAllTime: 'Весь час',
    rouletteFilterUnder120: '≤ 2 год',
    rouletteFilterUnder150: '≤ 2.5 год',
    rouletteFilterAllGenres: 'Усі жанри',
    weightTooltip: 'Шанс у рулетці (x1 / x2 / x3)',
    changePosterBtn: 'Змінити обкладинку',
    posterPickerTitle: 'ВИБІР ОБКЛАДИНКИ',
    posterUrlPlaceholder: 'Вставте пряме посилання на картинку (URL)...',
    posterApplyUrlBtn: 'Застосувати',
    loadingPosters: 'Завантаження варіантів обкладинок...',
    noPostersFound:
      'Вкажіть ключ TMDb API у налаштуваннях для галереї постерів або вставте URL картинки вище.',
    posterLangTextless: 'Без тексту',
  },
  'en-US': {
    brand: 'CINEROULETTE',
    settings: 'Settings',
    headline: 'ADD MOVIES & SPIN ROULETTE',
    searchPlaceholder: 'Search movie',
    advancedSearchBtn: 'Advanced search',
    advancedSearchTitle: 'ADVANCED SEARCH',
    advQueryPlaceholder: 'Search movie',
    advYearInputPlaceholder: 'Year or 2010-2020',
    advFilterGenres: 'GENRES',
    advFilterYears: 'YEARS',
    advFilterMinRating: 'MIN. RATING',
    advFilterSortBy: 'SORT BY',
    advSortPopular: 'Popularity',
    advSortRating: 'Rating',
    advSortNewest: 'Newest',
    advSearchActionBtn: 'Search',
    advResetFilters: 'Reset filters',
    advAnyRating: 'All',
    advNoApiKeyTitle: 'CONNECT TMDB API KEY',
    advNoApiKeyDesc: 'Enter your TMDb API key in Settings.',
    advOpenSettingsBtn: 'Open Settings',
    advNoResults: 'No movies found matching these filters.',
    advMoodTrending: 'Trending',
    advMoodTopRated: 'Masterpieces 8.0+',
    advMoodCult: 'Cult Classics',
    advMoodShort: 'Short ≤ 100m',
    advMoodNew: 'New Releases',
    advFilterDecade: 'ERA / YEARS',
    advDecadeAll: 'All years',
    advDecadeClassic: 'Pre-1980',
    advFilterRuntime: 'RUNTIME',
    advRuntimeAll: 'Any',
    advRuntimeShort: '≤ 95m',
    advRuntimeStandard: '≤ 120m',
    advRuntimeLong: '≤ 150m',
    advRuntimeEpic: '150+m',
    advSortMostVoted: 'Most Voted',
    advHideExisting: 'Hide added & watched',
    advLoadMore: 'Load more movies',
    addBtn: 'Add',
    addedBtn: 'Added',
    searchingTmdb: 'Searching...',
    tmdbResults: 'Results',
    noApiKeyShort: 'Set TMDb API key in Settings or add custom title:',
    noExactMatch: 'No matches found.',
    addCustomBtn: 'Add',
    spinRoulette: 'SPIN ROULETTE',
    myMoviesTab: 'IN ROULETTE',
    watchedTab: 'WATCHED',
    wishlistTab: 'WISHLIST',
    clearList: 'Clear list',
    deleteSelectedBtn: 'Delete selected',
    deleteAllBtn: 'Delete all',
    emptyPoolTitle: 'ROULETTE LIST IS EMPTY',
    emptyWatchedTitle: 'WATCHED LIST IS EMPTY',
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
    similarMoviesTitle: 'SIMILAR MOVIES',
    loadingSimilarMovies: 'Loading similar movies...',
    noSimilarMovies: 'No similar movies found.',
    inRoulettePool: 'IN ROULETTE',
    addedToPoolTooltip: 'In roulette',
    addToRoulettePool: 'ADD TO ROULETTE',
    addToWishlistTitle: 'To Wishlist',
    removeFromWishlistTitle: 'From Wishlist',
    moveToRouletteTitle: 'To roulette',
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
    sortGroupRating: 'Rating',
    sortGroupYear: 'Year',
    sortMyStarsShort: 'My ★',
    sortYearNewest: 'Newest ↓',
    sortYearOldest: 'Oldest ↑',
    resetFilterBtn: 'Reset',
    noMoviesMatchFilter: 'No movies match the selected filter',
    sessionCodeLabel: 'LIST TRANSFER (SESSION LINK)',
    sessionCopyBtn: 'Copy session link',
    sessionCopiedBtn: 'Link copied!',
    sessionPastePlaceholder: 'Paste session link or code here...',
    sessionLoadBtn: 'Load',
    sessionEmptyHint: 'Add movies to your list first',
    sessionLoadError: 'Invalid or corrupted session link.',
    loadStarterHitsBtn: 'Load starter hit collection',
    emptyPoolHint: 'Search for movies or load our curated starter pack',
    undoAction: 'Undo',
    listClearedToast: 'List cleared',
    movieRemovedToast: 'Movie removed from list',
    sessionImportedToast: 'Movie list imported from link!',
    rouletteModeStandard: 'Classic',
    rouletteModeElimination: 'Elimination',
    eliminatedBadge: 'ELIMINATED',
    nextEliminationSpin: 'ELIMINATE NEXT',
    rouletteFilterAllTime: 'Any length',
    rouletteFilterUnder120: '≤ 2h',
    rouletteFilterUnder150: '≤ 2.5h',
    rouletteFilterAllGenres: 'All genres',
    weightTooltip: 'Roulette chance (x1 / x2 / x3)',
    changePosterBtn: 'Change poster',
    posterPickerTitle: 'CHOOSE POSTER',
    posterUrlPlaceholder: 'Paste a direct image URL from the web...',
    posterApplyUrlBtn: 'Apply',
    loadingPosters: 'Loading alternative posters...',
    noPostersFound:
      'Set your TMDb API key in Settings to browse posters, or paste a custom image URL above.',
    posterLangTextless: 'Textless',
  },
} as const;


