export type Language = "en" | "ru";

type Translations = {
  // Common
  save: string;
  cancel: string;
  close: string;
  delete: string;
  edit: string;
  confirm: string;
  discard: string;
  continue: string;
  back: string;
  next: string;
  finish: string;
  loading: string;
  error: string;
  success: string;

  // Auth
  signIn: string;
  signOut: string;
  signUp: string;
  email: string;
  password: string;

  // Profile
  profile: string;
  settings: string;
  firstName: string;
  lastName: string;
  username: string;
  homeClub: string;
  city: string;
  memberSince: string;
  roundsPlayed: string;
  enterYourName: string;
  profileUpdated: string;
  profilePhotoUpdated: string;
  defaultTee: string;

  // Play
  play: string;
  startRound: string;
  findAnyCourse: string;
  searchPlaceholder: string;
  unfinishedRound: string;
  holesPlayed: string;
  lastRound: string;
  savedCourses: string;
  golfClubMinsk: string;
  russianCourses: string;

  // Round
  round: string;
  rounds: string;
  completedRound: string;
  finishRound: string;
  cancelRound: string;
  deleteRound: string;

  // Course
  course: string;
  courses: string;
  holes: string;
  tees: string;
  designer: string;
  loadingCourse: string;
  courseFound: string;
  courseNotFound: string;
  failedToLoadCourse: string;

  // Stats (golf terms stay in English)
  stats: string;
  best: string;
  avg: string;
  last: string;
  all: string;

  // Scoring breakdown (golf terms stay in English)
  holeScoring: string;

  // Performance stats
  puttsPerRound: string;
  penalties: string;
  drive: string;

  // Settings
  language: string;
  theme: string;
  dark: string;
  light: string;
  statistics: string;
  allRounds: string;
  lastRoundOnly: string;

  // Players
  players: string;
  addPlayer: string;
  searchPlayers: string;
  noPlayersFound: string;
  noOtherPlayers: string;
  added: string;

  // Tournament
  tournaments: string;
  tournament: string;
  format: string;

  // Confirmation
  confirmation: string;
  areYouSure: string;

  // Search
  search: string;
  searching: string;
  find: string;

  // Date/Time
  today: string;
  yesterday: string;

  // Messages
  getting: string;

  // Units
  meters: string;

  // Additional
  manual: string;
  deletePhoto: string;
  saveChanges: string;
  frequentPartners: string;
  add: string;
  addRoundPhoto: string;
  back9: string;
  confirmRound: string;
  courseInfo: string;
  done: string;
  editScore: string;
  findCourse: string;
  front9: string;
  photoAdded: string;
  player: string;
  replacePhoto: string;
  roundStartedNoScores: string;
  saving: string;
  selectTee: string;
  suggested: string;
  tee: string;
};

export const translations: Record<Language, Translations> = {
  en: {
    // Common
    save: "Save",
    cancel: "Cancel",
    close: "Close",
    delete: "Delete",
    edit: "Edit",
    confirm: "Confirm",
    discard: "Discard",
    continue: "Continue",
    back: "Back",
    next: "Next",
    finish: "Finish",
    loading: "Loading",
    error: "Error",
    success: "Success",

    // Auth
    signIn: "Sign In",
    signOut: "Sign Out",
    signUp: "Sign Up",
    email: "Email",
    password: "Password",

    // Profile
    profile: "Profile",
    settings: "Settings",
    firstName: "First Name",
    lastName: "Last Name",
    username: "Username",
    homeClub: "Home Club",
    city: "City",
    memberSince: "Member since",
    roundsPlayed: "Rounds played",
    enterYourName: "Enter your name →",
    profileUpdated: "Profile updated",
    profilePhotoUpdated: "Profile photo updated",
    defaultTee: "Default Tee",

    // Play
    play: "Play",
    startRound: "Start round",
    findAnyCourse: "Find any course",
    searchPlaceholder: "Course or club name…",
    unfinishedRound: "Unfinished round",
    holesPlayed: "Holes played",
    lastRound: "Last round",
    savedCourses: "Saved courses",
    golfClubMinsk: "Golf Club Minsk",
    russianCourses: "Russian courses",

    // Round
    round: "Round",
    rounds: "Rounds",
    completedRound: "Round completed",
    finishRound: "FINISH ROUND",
    cancelRound: "Cancel round",
    deleteRound: "Delete round",

    // Course
    course: "Course",
    courses: "Courses",
    holes: "holes",
    tees: "Tees",
    designer: "Designer:",
    loadingCourse: "Loading course…",
    courseFound: "Course found",
    courseNotFound: "Course not found",
    failedToLoadCourse: "Failed to load course",

    // Stats
    stats: "Stats",
    best: "Best",
    avg: "Avg",
    last: "last",
    all: "all",

    // Scoring
    holeScoring: "Hole Scoring",

    // Performance
    puttsPerRound: "PUTTS / ROUND",
    penalties: "PENALTIES",
    drive: "DRIVE",

    // Settings
    language: "Language",
    theme: "Theme",
    dark: "Dark",
    light: "Light",
    statistics: "Statistics",
    allRounds: "All Rounds",
    lastRoundOnly: "Last Round",

    // Players
    players: "Players",
    addPlayer: "Add player",
    searchPlayers: "Name or @username...",
    noPlayersFound: "No one found",
    noOtherPlayers: "No other players",
    added: "Added",

    // Tournament
    tournaments: "Tournaments",
    tournament: "Tournament",
    format: "Format",

    // Confirmation
    confirmation: "Confirmation",
    areYouSure: "Are you sure?",

    // Search
    search: "Search",
    searching: "Searching",
    find: "Find",

    // Date/Time
    today: "Today",
    yesterday: "Yesterday",

    // Messages
    getting: "Getting",

    // Units
    meters: "m",

    // Additional
    manual: "manual",
    deletePhoto: "Delete Photo",
    saveChanges: "Save Changes",
    frequentPartners: "Frequent Partners",
    add: "Add",
    addRoundPhoto: "Add round photo",
    back9: "Back 9",
    confirmRound: "Confirm Round",
    courseInfo: "course info",
    done: "Done",
    editScore: "Edit score",
    findCourse: "Find course",
    front9: "Front 9",
    photoAdded: "Photo added!",
    player: "Player",
    replacePhoto: "Replace photo",
    roundStartedNoScores: "Round started, no scores entered",
    saving: "Saving…",
    selectTee: "Select Tee",
    suggested: "Sug.",
    tee: "Tee",
  },

  ru: {
    // Common
    save: "Сохранить",
    cancel: "Отмена",
    close: "Закрыть",
    delete: "Удалить",
    edit: "Изменить",
    confirm: "Подтвердить",
    discard: "Отменить",
    continue: "Продолжить",
    back: "Назад",
    next: "Далее",
    finish: "Завершить",
    loading: "Загрузка",
    error: "Ошибка",
    success: "Успешно",

    // Auth
    signIn: "Войти",
    signOut: "Выйти",
    signUp: "Регистрация",
    email: "Email",
    password: "Пароль",

    // Profile
    profile: "Профиль",
    settings: "Настройки",
    firstName: "Имя",
    lastName: "Фамилия",
    username: "Имя пользователя",
    homeClub: "Домашний клуб",
    city: "Город",
    memberSince: "Участник с",
    roundsPlayed: "Сыграно раундов",
    enterYourName: "Введите ваше имя →",
    profileUpdated: "Профиль обновлён",
    profilePhotoUpdated: "Фото профиля обновлено",
    defaultTee: "Тии по умолчанию",

    // Play
    play: "Играть",
    startRound: "Начать раунд",
    findAnyCourse: "Найти любое поле",
    searchPlaceholder: "Название поля или клуба…",
    unfinishedRound: "Незавершённый раунд",
    holesPlayed: "Сыграно лунок",
    lastRound: "Последний раунд",
    savedCourses: "Сохранённые поля",
    golfClubMinsk: "Golf Club Minsk",
    russianCourses: "Российские поля",

    // Round
    round: "Раунд",
    rounds: "Раундов",
    completedRound: "Раунд завершён",
    finishRound: "ЗАВЕРШИТЬ РАУНД",
    cancelRound: "Отменить раунд",
    deleteRound: "Удалить раунд",

    // Course
    course: "Поле",
    courses: "Поля",
    holes: "лунок",
    tees: "Тии",
    designer: "Дизайнер:",
    loadingCourse: "Загружаем поле…",
    courseFound: "Поле найдено",
    courseNotFound: "Поле не найдено",
    failedToLoadCourse: "Не удалось загрузить поле",

    // Stats
    stats: "Статистика",
    best: "Лучший",
    avg: "Средний",
    last: "последние",
    all: "все",

    // Scoring
    holeScoring: "Счёт по лункам",

    // Performance
    puttsPerRound: "ПАТТЫ / РАУНД",
    penalties: "ШТРАФЫ",
    drive: "ДРАЙВ",

    // Settings
    language: "Язык",
    theme: "Тема",
    dark: "Тёмная",
    light: "Светлая",
    statistics: "Статистика",
    allRounds: "Все раунды",
    lastRoundOnly: "Последний раунд",

    // Players
    players: "Игроки",
    addPlayer: "Добавить игрока",
    searchPlayers: "Имя или @username...",
    noPlayersFound: "Никого не найдено",
    noOtherPlayers: "Нет других игроков",
    added: "Добавлен",

    // Tournament
    tournaments: "Турниры",
    tournament: "Турнир",
    format: "Формат",

    // Confirmation
    confirmation: "Подтверждение",
    areYouSure: "Вы уверены?",

    // Search
    search: "Поиск",
    searching: "Поиск",
    find: "Найти",

    // Date/Time
    today: "Сегодня",
    yesterday: "Вчера",

    // Messages
    getting: "Получаем",

    // Units
    meters: "м",

    // Additional
    manual: "вручную",
    deletePhoto: "Удалить фото",
    saveChanges: "Сохранить изменения",
    frequentPartners: "Частые партнёры",
    add: "Добавить",
    addRoundPhoto: "Добавить фото раунда",
    back9: "Вторые 9",
    confirmRound: "Подтвердить раунд",
    courseInfo: "информацию о поле",
    done: "Готово",
    editScore: "Изменить счёт",
    findCourse: "Найти поле",
    front9: "Первые 9",
    photoAdded: "Фото добавлено!",
    player: "Игрок",
    replacePhoto: "Заменить фото",
    roundStartedNoScores: "Раунд начат, счёт не введён",
    saving: "Сохранение…",
    selectTee: "Выберите тии",
    suggested: "Рек.",
    tee: "Тии",
  },
};
