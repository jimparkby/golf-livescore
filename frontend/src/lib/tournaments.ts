export type Tier = "gold" | "platinum" | "diamond" | "closed";
export type Tournament = {
  id: string;
  date: string;
  day: string;
  name: string;
  tier: Tier;
  fee?: string;
  month: string;
};

export const TOURNAMENTS: Tournament[] = [
  // Апрель
  { id: "spring-cup-ermashov", month: "Апрель", date: "26", day: "СБ-ВС", name: "III Весенний Кубок им. Н. Ермашова by БСБК", tier: "platinum", fee: "1.5" },
  // Май
  { id: "hole-in-one-challenge", month: "Май", date: "9", day: "СБ", name: "Hole in One Challenge (Академическое поле)", tier: "gold", fee: "1.2" },
  { id: "whitebird-spring-open", month: "Май", date: "16-17", day: "СБ-ВС", name: "Whitebird Spring Open Cup", tier: "platinum", fee: "1.7" },
  { id: "minsk-golf-invitational", month: "Май", date: "22-23", day: "ПТ-СБ", name: "Международные соревнования / Minsk Golf Invitational 2026", tier: "closed" },
  { id: "luch-kids", month: "Май", date: "31", day: "ВС", name: "Международный детский гольф-турнир «Луч»", tier: "gold", fee: "1.5" },
  // Июнь
  { id: "rookie-cup-18", month: "Июнь", date: "7", day: "ВС", name: "XVIII Rookie Cup 2026", tier: "gold", fee: "1.2" },
  { id: "hardy-cup", month: "Июнь", date: "12", day: "ПТ", name: "Hardy Cup", tier: "closed", fee: "1.3" },
  { id: "pets-day", month: "Июнь", date: "13", day: "СБ", name: "Pets Day", tier: "platinum", fee: "1.3" },
  { id: "prime-line-cup", month: "Июнь", date: "26-28", day: "ПТ-ВС", name: "PRIME LINE CUP", tier: "diamond", fee: "1.4" },
  // Июль
  { id: "belavia-open", month: "Июль", date: "4", day: "СБ", name: "BELAVIA Golf Open 2026", tier: "gold", fee: "1.5" },
  { id: "rookie-cup-19", month: "Июль", date: "5", day: "ВС", name: "XIX Rookie Cup 2026", tier: "gold", fee: "1.2" },
  { id: "club-cup-8", month: "Июль", date: "10-12", day: "ПТ-ВС", name: "VIII Кубок Гольф-клуба Минск", tier: "platinum", fee: "1.9" },
  { id: "futgolf-belarus-open", month: "Июль", date: "19", day: "ВС", name: "ФУТГОЛЬФ. Belarus Open", tier: "closed" },
  { id: "bratstvo-cup-2", month: "Июль", date: "24", day: "ПТ", name: "II Кубок Братства: Беларусь — Россия by WhiteBird", tier: "closed" },
  { id: "liga-rf-3", month: "Июль", date: "25-26", day: "СБ-ВС", name: "Лига Гольфа (РФ) 3 этап, Минск", tier: "closed" },
  // Август
  { id: "time-to-golf-10", month: "Август", date: "1", day: "СБ", name: "X Time to Golf 2026 (три клюшки)", tier: "gold", fee: "1.2" },
  { id: "ladies-open", month: "Август", date: "8", day: "СБ", name: "Ladies Golf Open", tier: "gold", fee: "1.2" },
  { id: "avatr-cup", month: "Август", date: "22", day: "СБ", name: "AVATR Golf Cup (Belarus-China)", tier: "platinum", fee: "1.3" },
  { id: "golden-50", month: "Август", date: "27", day: "ЧТ", name: "Тур «Золотые 50»", tier: "closed" },
  { id: "activleasing-cup", month: "Август", date: "29", day: "СБ", name: "Активлизинг Investment Cup", tier: "platinum", fee: "1.6" },
  // Сентябрь
  { id: "infinity-cup", month: "Сентябрь", date: "5", day: "СБ", name: "Infinity Golf Cup 2026", tier: "platinum", fee: "1.4" },
  { id: "liga-rf-4", month: "Сентябрь", date: "11-13", day: "ПТ-ВС", name: "Лига гольфа (РФ) 4 этап и финал (Москва)", tier: "platinum" },
  { id: "rookie-cup-20", month: "Сентябрь", date: "13", day: "ВС", name: "XX Rookie Cup", tier: "gold", fee: "1.2" },
  { id: "belarus-open-20", month: "Сентябрь", date: "19-20", day: "СБ-ВС", name: "XX Belarus Golf Open Cup", tier: "gold", fee: "1.7" },
  { id: "greenkeeper", month: "Сентябрь", date: "26", day: "СБ", name: "«Привет» от Гринкипера by Technogym", tier: "gold", fee: "1.3" },
  // Октябрь
  { id: "bmw-qualifier", month: "Октябрь", date: "2-4", day: "ПТ-ВС", name: "Отбор BMW Golf Cup World Final", tier: "platinum", fee: "1.7" },
  { id: "bmw-challenge", month: "Октябрь", date: "4", day: "ВС", name: "BMW Challenge Cup 2026", tier: "platinum", fee: "1.6" },
  { id: "eurasian-league", month: "Октябрь", date: "7", day: "СР", name: "Этап Евразийской Лиги Гольфа", tier: "closed" },
  { id: "interclub-kaspersky", month: "Октябрь", date: "9-10", day: "ПТ-СБ", name: "Minsk Golf InterClub 2026 by Kaspersky", tier: "closed" },
  { id: "futgolf-oct", month: "Октябрь", date: "11", day: "ВС", name: "Футгольф", tier: "closed" },
  { id: "bsbk-charity", month: "Октябрь", date: "17", day: "СБ", name: "Благотворительный турнир БСБК", tier: "gold", fee: "1.2" },
  { id: "rookie-cup-21", month: "Октябрь", date: "25", day: "ВС", name: "XXI Rookie Cup", tier: "gold", fee: "1.2" },
  // Ноябрь
  { id: "super-rookie-22", month: "Ноябрь", date: "*7", day: "СБ", name: "XXII SUPER Rookie Cup", tier: "gold" },
];

export const TIER_LABELS: Record<Tier, string> = {
  gold: "Золотой",
  platinum: "Платиновый",
  diamond: "Бриллиантовый",
  closed: "Закрытый турнир",
};
