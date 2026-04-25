export type FormatId =
  | "stroke_play"
  | "stableford"
  | "match_play"
  | "scramble"
  | "best_ball"
  | "foursomes"
  | "skins"
  | "greensomes";

export type GolfFormat = {
  id: FormatId;
  name: string;
  emoji: string;
  players: string;
  description: string;
  tip: string;
  forGroup: boolean;
};

export const FORMATS: GolfFormat[] = [
  {
    id: "stroke_play",
    name: "Стэйк-Плей",
    emoji: "🏅",
    players: "1–4 игрока",
    description: "Классика. Считается каждый удар — побеждает тот, у кого меньше всего ударов за раунд.",
    tip: "Идеально для официальных гандикапов и серьёзных раундов",
    forGroup: false,
  },
  {
    id: "stableford",
    name: "Стейблфорд",
    emoji: "⭐",
    players: "1–4 игрока",
    description: "Очки за лунку: Богги=1, Пар=2, Бёрди=3, Игл=4. Один плохой хол не рушит весь раунд.",
    tip: "Отличный выбор для высокогандикапников — плохая лунка не катастрофа",
    forGroup: true,
  },
  {
    id: "match_play",
    name: "Матч-Плей",
    emoji: "⚔️",
    players: "2 или 4 игрока",
    description: "Победа на каждой лунке, а не суммарно. Выигрывает тот, кто взял больше лунок.",
    tip: "Напряжённый формат — каждая лунка решает исход матча",
    forGroup: false,
  },
  {
    id: "scramble",
    name: "Скрэмбл",
    emoji: "🤝",
    players: "2–4 игрока (команда)",
    description: "Все бьют — выбирается лучший удар, и все играют от него. Командный формат, снижающий давление.",
    tip: "Лучший выбор для корпоративов и компаний с разным уровнем игры",
    forGroup: true,
  },
  {
    id: "best_ball",
    name: "Лучший Мяч",
    emoji: "🎯",
    players: "4 игрока (2 пары)",
    description: "Каждый играет своим мячом, на каждой лунке засчитывается лучший результат пары.",
    tip: "Позволяет раскрыться индивидуально — лучший игрок пары делает победный удар",
    forGroup: true,
  },
  {
    id: "foursomes",
    name: "Попеременные Удары",
    emoji: "🔄",
    players: "4 игрока (2 пары)",
    description: "Партнёры бьют один мяч по очереди: один — ти-шот, второй — следующий, и так далее.",
    tip: "Требует идеальной коммуникации — вы не контролируете каждый удар",
    forGroup: true,
  },
  {
    id: "skins",
    name: "Скины",
    emoji: "💰",
    players: "2–4 игрока",
    description: "Каждая лунка «стоит» скин. При ничьей скин переходит на следующую лунку — интрига до конца.",
    tip: "Добавляет азарт: ситуацию можно переломить до самой последней лунки",
    forGroup: true,
  },
  {
    id: "greensomes",
    name: "Гринсомс",
    emoji: "🌿",
    players: "4 игрока (2 пары)",
    description: "Оба делают ти-шот, выбирается лучший, затем удары чередуются. Смесь Best Ball и Foursomes.",
    tip: "Менее жёсткий вариант Foursomes — сохраняет важность ти-шота для обоих партнёров",
    forGroup: true,
  },
];

export const getFormat = (id: FormatId): GolfFormat =>
  FORMATS.find((f) => f.id === id) ?? FORMATS[0];

export const stablefordPoints = (score: number, par: number): number =>
  Math.max(0, 2 + par - score);
