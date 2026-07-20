// Detailed tournament results extracted from photos

export type TournamentGroup = {
  name: string;
  format?: string;
  results: {
    place: number;
    player: string;
    score?: number | string;
    day1?: number;
    day2?: number;
    total?: number;
    net?: number;
    gross?: number;
  }[];
};

export type TournamentNomination = {
  title: string;
  winner: string;
  value?: string;
};

export type TournamentData = {
  tournamentId: string;
  name: string;
  date: string;
  groups: TournamentGroup[];
  nominations: TournamentNomination[];
  photos: string[];
};

export const TOURNAMENT_DATA: Record<string, TournamentData> = {
  'spring-cup-ermashov': {
    tournamentId: 'spring-cup-ermashov',
    name: 'III Весенний Кубок имени Николая Ермашова',
    date: '25 апреля 2026',
    groups: [
      {
        name: 'Группа Man HCP по 13,5',
        format: 'Stroke net',
        results: [
          { place: 1, player: 'Дворников Анатолий', net: 66 },
          { place: 2, player: 'Прокопович Алексей', net: 71 },
          { place: 3, player: 'Михалкевич Андрей', net: 71 },
        ],
      },
      {
        name: 'Группа Man HCP 13,6-22',
        format: 'Stroke net',
        results: [
          { place: 1, player: 'Антонов Павел', net: 67 },
          { place: 2, player: 'Ярец Николай', net: 68 },
          { place: 3, player: 'Козельский Захар', net: 69 },
        ],
      },
      {
        name: 'Группа Man HCP 22,1-36',
        format: 'Stableford',
        results: [
          { place: 1, player: 'Нечипоренко Андрей', score: 44 },
          { place: 2, player: 'Громов Сергей', score: 43 },
          { place: 3, player: 'Чергинец Игорь', score: 43 },
        ],
      },
      {
        name: 'Группа Woman HCP по 22',
        format: 'Stroke net',
        results: [
          { place: 1, player: 'Шевченко Ирина', net: 70 },
          { place: 2, player: 'Козельская Татьяна', net: 71 },
          { place: 3, player: 'Гончаренок Жанна', net: 72 },
        ],
      },
      {
        name: 'Группа Woman HCP 22,1-36',
        format: 'Stableford',
        results: [
          { place: 1, player: 'Сергеева Варвара', score: 50 },
          { place: 2, player: 'Хасанова Алина', score: 46 },
          { place: 3, player: 'Шибеко Светлана', score: 41 },
        ],
      },
    ],
    nominations: [
      { title: 'Переходящий кубок', winner: 'Дик Ольга' },
      { title: 'Best gross Man', winner: 'Пригожий Георгий' },
      { title: 'Best gross Woman', winner: 'Дик Ольга' },
      { title: 'Longest Drive Man', winner: 'Безбородько Вадим' },
      { title: 'Longest Drive Woman', winner: 'Ластовская Елена' },
      { title: 'Closest to the pin Man', winner: 'Девятовский Вадим 1.25м' },
      { title: 'Closest to the pin Woman', winner: 'Сергеева Варвара 6.8м' },
    ],
    photos: [
      '/tournament-results/photo_2026-04-25_21-42-51.jpg',
      '/tournament-results/photo_2026-04-25_21-43-01.jpg',
      '/tournament-results/photo_2026-04-25_21-43-16.jpg',
      '/tournament-results/photo_2026-04-25_21-43-35.jpg',
    ],
  },

  'hole-in-one-challenge': {
    tournamentId: 'hole-in-one-challenge',
    name: 'Hole in One Challenge',
    date: '9 мая 2026',
    groups: [
      {
        name: 'Группа Man HCP по 14',
        results: [
          { place: 1, player: 'Жаловский Денис', net: 25 },
          { place: 2, player: 'Граков Алексей', net: 25 },
          { place: 3, player: 'Мацкевич Дмитрий', net: 28 },
        ],
      },
      {
        name: 'Группа Man HCP 14,1-28',
        results: [
          { place: 1, player: 'Савченко Юрий', net: 24 },
          { place: 2, player: 'Козельский Сергей', net: 25 },
          { place: 3, player: 'Бобченко Валерий', net: 25 },
        ],
      },
      {
        name: 'Группа Man HCP 28,1-36',
        results: [
          { place: 1, player: 'Зубков Андрей', net: 23 },
          { place: 2, player: 'Саликов Андрей', net: 27 },
          { place: 3, player: 'Ермашов Алексей', net: 31 },
        ],
      },
      {
        name: 'Группа Woman HCP по 24',
        results: [
          { place: 1, player: 'Лычковская Алла', net: 23 },
          { place: 2, player: 'Гончаренок Жанна', net: 24 },
          { place: 3, player: 'Ластовская Елена', net: 29 },
        ],
      },
      {
        name: 'Группа Woman HCP 24,1-36',
        results: [
          { place: 1, player: 'Сухова Анастасия', net: 25 },
          { place: 2, player: 'Колосовская Мария', net: 30 },
          { place: 3, player: 'Сочнева Елена', net: 32 },
        ],
      },
      {
        name: 'Группа ДШГ',
        results: [
          { place: 1, player: 'Ясинская София', score: '35 ударов' },
          { place: 2, player: 'Знахарчук Александр', score: '35 ударов' },
          { place: 3, player: 'Козельский Матвей', score: '40 ударов' },
        ],
      },
      {
        name: 'Группа Начинающих',
        results: [
          { place: 1, player: 'Рудена Андрей', score: '33 очка' },
          { place: 2, player: 'Климук Александр', score: '29 очков' },
          { place: 3, player: 'Колосовский Евгений', score: '22 очка' },
        ],
      },
    ],
    nominations: [
      { title: 'HOLE IN ONE', winner: 'Жаловский Денис (8 лунка)' },
      { title: 'Closest to the Pin Man', winner: 'Агеев Захар 1,21 м' },
      { title: 'Closest to the Pin Woman', winner: 'Чибисова Ольга 3,18 м' },
    ],
    photos: [
      '/tournament-results/photo_2026-05-09_21-05-24.jpg',
      '/tournament-results/photo_2026-05-10_17-43-44.jpg',
      '/tournament-results/photo_2026-05-10_17-43-54.jpg',
    ],
  },

  'whitebird-spring-open': {
    tournamentId: 'whitebird-spring-open',
    name: 'Whitebird Spring Open Cup',
    date: '16-17 мая 2026',
    groups: [
      {
        name: 'Группа Man HCP по 13,5',
        format: 'Stableford (2 дня)',
        results: [
          { place: 1, player: 'Пригожий Георгий', day1: 38, day2: 30, total: 68 },
          { place: 2, player: 'Прокорим Александр', day1: 33, day2: 34, total: 67 },
          { place: 3, player: 'Примак Виталий', day1: 33, day2: 30, total: 63 },
        ],
      },
      {
        name: 'Группа Man HCP 13,6-22',
        format: 'Stableford (2 дня)',
        results: [
          { place: 1, player: 'Козельский Захар', day1: 38, day2: 34, total: 72 },
          { place: 2, player: 'Фетисов Валентин', day1: 31, day2: 35, total: 66 },
          { place: 2, player: 'Ярец Николай', day1: 35, day2: 31, total: 66 },
        ],
      },
      {
        name: 'Группа Man HCP 22,1-36',
        format: 'Stableford (2 дня)',
        results: [
          { place: 1, player: 'Лагутик Сергей', day1: 34, day2: 28, total: 62 },
          { place: 2, player: 'Вашкевич Артем', day1: 27, day2: 32, total: 59 },
          { place: 2, player: 'Левчук Андрей', day1: 29, day2: 30, total: 59 },
        ],
      },
      {
        name: 'Группа Woman HCP по 24',
        format: 'Stableford (2 дня)',
        results: [
          { place: 1, player: 'Ластовская Елена', day1: 30, day2: 34, total: 64 },
          { place: 2, player: 'Толкачева Полина', day1: 28, day2: 32, total: 60 },
          { place: 3, player: 'Козельская Татьяна', day1: 29, day2: 30, total: 59 },
        ],
      },
      {
        name: 'Группа Woman HCP 24,1-36',
        format: 'Stableford (2 дня)',
        results: [
          { place: 1, player: 'Черевикова Юлия', day1: 34, day2: 27, total: 61 },
          { place: 2, player: 'Сергеева Варвара', day1: 28, day2: 29, total: 57 },
          { place: 3, player: 'Хасанова Алина', day1: 32, day2: 23, total: 55 },
        ],
      },
    ],
    nominations: [
      { title: 'Главный приз Man', winner: 'Прокопович Алексей 73 очка' },
      { title: 'Главный приз Woman', winner: 'Шибеко Светлана 66 очков' },
      { title: 'Longest Drive Man', winner: 'Примак Виталий' },
      { title: 'Longest Drive Woman', winner: 'Ластовская Елена' },
      { title: 'Closest to the pin Man', winner: 'Девятовский Вадим 3,64 м' },
      { title: 'Closest to the pin Woman', winner: 'Колосовская Мария 8,54 м' },
    ],
    photos: [
      '/tournament-results/photo_2026-05-17_22-07-26.jpg',
      '/tournament-results/photo_2026-05-17_22-07-31.jpg',
      '/tournament-results/photo_2026-05-17_22-07-41.jpg',
      '/tournament-results/photo_2026-05-17_22-07-51.jpg',
    ],
  },

  'luch-kids': {
    tournamentId: 'luch-kids',
    name: 'Международный детский гольф-турнир «Луч»',
    date: '31 мая 2026',
    groups: [
      {
        name: 'Академическое поле: Группа 5-9 лет',
        results: [
          { place: 1, player: 'Жишкевич Мирослав', score: 14 },
          { place: 2, player: 'Бегун Агата', score: 11 },
          { place: 3, player: 'Агеев Лука', score: 11 },
        ],
      },
      {
        name: 'Академическое поле: Группа 10-11 лет',
        results: [
          { place: 1, player: 'Петрович Яна', score: 14 },
          { place: 2, player: 'Дергач Елизавета', score: 13 },
          { place: 3, player: 'Кондратенко Семен', score: 13 },
        ],
      },
      {
        name: 'Академическое поле: Группа 12-15 лет',
        results: [
          { place: 1, player: 'Рачек Данила', score: 15 },
          { place: 2, player: 'Босякова София', score: 10 },
          { place: 3, player: 'Шалимо Артур', score: 8 },
        ],
      },
      {
        name: 'Чемпионское поле: Группа 7-11 лет',
        results: [
          { place: 1, player: 'Браславская Ева', score: 18 },
          { place: 2, player: 'Агеев Захар', score: 17 },
          { place: 3, player: 'Туманов Роман', score: 16 },
        ],
      },
      {
        name: 'Чемпионское поле: Группа 12-15 лет',
        results: [
          { place: 1, player: 'Сухова Анастасия', score: 18 },
          { place: 2, player: 'Козельский Захар', score: 18 },
          { place: 3, player: 'Ясинская София', score: 17 },
        ],
      },
    ],
    nominations: [
      { title: 'Closest to the pin мальчики АП', winner: 'Жишкевич Мирослав 6,21м' },
      { title: 'Closest to the pin девочки АП', winner: 'Дергач Елизавета 5,79м' },
      { title: 'Closest to the pin мальчики ЧП', winner: 'Ткач Милан 3,67м' },
      { title: 'Closest to the pin девочки ЧП', winner: 'Ясинская София 4,9м' },
    ],
    photos: [
      '/tournament-results/photo_2026-05-31_18-14-58.jpg',
      '/tournament-results/photo_2026-05-31_18-15-07.jpg',
      '/tournament-results/photo_2026-05-31_18-15-14.jpg',
    ],
  },

  'rookie-cup-18': {
    tournamentId: 'rookie-cup-18',
    name: 'XVIII Rookie Cup 2026',
    date: '7 июня 2026',
    groups: [
      {
        name: 'Группа Man',
        format: 'Stableford',
        results: [
          { place: 1, player: 'Петрович Александр', score: 27 },
          { place: 2, player: 'Шарафутдинов Артем', score: 26 },
          { place: 3, player: 'Погорелов Сергей', score: 22 },
        ],
      },
      {
        name: 'Группа Woman',
        format: 'Stableford',
        results: [
          { place: 1, player: 'Жабкина Алина', score: 16 },
          { place: 2, player: 'Рыбакова Людмила', score: 15 },
          { place: 3, player: 'Харламова Елена', score: 12 },
        ],
      },
      {
        name: 'Группа Junior',
        format: 'Stableford',
        results: [
          { place: 1, player: 'Знахарчук Александр', score: 26 },
          { place: 2, player: 'Быков Архип', score: 19 },
          { place: 3, player: 'Петрович Яна', score: 19 },
        ],
      },
    ],
    nominations: [
      { title: 'Longest Drive Man', winner: 'Петрович Александр' },
      { title: 'Longest Drive Woman', winner: 'Харламова Елена' },
      { title: 'Closest to the pin Man', winner: 'Ковалев Андрей 14,66м' },
      { title: 'Closest to the pin Woman', winner: 'Сочнева Елена 2,65м' },
      { title: 'Longest Drive Junior', winner: 'Знахарчук Александр' },
      { title: 'Closest to the pin Junior', winner: 'Знахарчук Александр 1м' },
    ],
    photos: [
      '/tournament-results/photo_2026-06-03_09-32-12.jpg',
      '/tournament-results/photo_2026-06-03_09-32-19.jpg',
      '/tournament-results/photo_2026-06-03_09-32-29.jpg',
      '/tournament-results/photo_2026-06-07_19-30-47.jpg',
      '/tournament-results/photo_2026-06-07_19-30-53.jpg',
    ],
  },

  'pets-day': {
    tournamentId: 'pets-day',
    name: 'Pets Day',
    date: '13 июня 2026',
    groups: [
      {
        name: 'Группа Man по 14 HCP',
        format: 'Stableford',
        results: [
          { place: 1, player: 'Фетисов Валентин', score: 39 },
          { place: 2, player: 'Прокопович Максим', score: 36 },
          { place: 3, player: 'Михалкевич Андрей', score: 36 },
        ],
      },
      {
        name: 'Группа Man 14,1-22 HCP',
        format: 'Stableford',
        results: [
          { place: 1, player: 'Антонов Павел', score: 39 },
          { place: 2, player: 'Козельский Захар', score: 35 },
          { place: 3, player: 'Литвинчик Степан', score: 35 },
        ],
      },
      {
        name: 'Группа Man 22,1-36 HCP',
        format: 'Stableford',
        results: [
          { place: 1, player: 'Вашков Иван', score: 40 },
          { place: 2, player: 'Денисов Роман', score: 38 },
          { place: 3, player: 'Вашкевич Артем', score: 36 },
        ],
      },
      {
        name: 'Группа Woman по 22 HCP',
        format: 'Stableford',
        results: [
          { place: 1, player: 'Козельская Татьяна', score: 34 },
          { place: 2, player: 'Видевич Наталья', score: 32 },
          { place: 3, player: 'Ластовская Елена', score: 29 },
        ],
      },
      {
        name: 'Группа Woman 22,1-36 HCP',
        format: 'Stableford',
        results: [
          { place: 1, player: 'Хасанова Алина', score: 45 },
          { place: 2, player: 'Ясинская София', score: 42 },
          { place: 3, player: 'Тарасик Ольга', score: 37 },
        ],
      },
    ],
    nominations: [
      { title: 'Best Stableford gross Man', winner: 'Захсенмайер Патрик' },
      { title: 'Best Stableford gross Woman', winner: 'Туманова Наталья' },
      { title: 'Longest Drive Man', winner: 'Захсенмайер Патрик' },
      { title: 'Longest Drive Woman', winner: 'Дик Ольга' },
      { title: 'Closest to the pin Man', winner: 'Литвинчик Степан 0.79м' },
      { title: 'Closest to the pin Woman', winner: 'Толкачева Полина 4.83м' },
    ],
    photos: [
      '/tournament-results/photo_2026-06-13_22-17-59.jpg',
      '/tournament-results/photo_2026-06-13_22-18-08.jpg',
      '/tournament-results/photo_2026-06-13_22-18-17.jpg',
    ],
  },
};

export function getTournamentData(tournamentId: string): TournamentData | null {
  return TOURNAMENT_DATA[tournamentId] || null;
}
