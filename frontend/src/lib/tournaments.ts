export type Tier = "gold" | "platinum" | "diamond" | "closed";
export type Tournament = {
  date: string;
  day: string;
  name: string;
  tier: Tier;
  fee?: string;
  month: string;
};

export const TOURNAMENTS: Tournament[] = [
  // Апрель
  { month: "Апрель", date: "26", day: "СБ-ВС", name: "III Весенний Кубок им. Н. Ермашова by БСБК", tier: "platinum", fee: "1.5" },
  // Май
  { month: "Май", date: "9", day: "СБ", name: "Hole in One Challenge (Академическое поле)", tier: "gold", fee: "1.2" },
  { month: "Май", date: "16-17", day: "СБ-ВС", name: "Whitebird Spring Open Cup", tier: "platinum", fee: "1.7" },
  { month: "Май", date: "22-23", day: "ПТ-СБ", name: "Международные соревнования / Minsk Golf Invitational 2026", tier: "closed" },
  { month: "Май", date: "31", day: "ВС", name: "Международный детский гольф-турнир «Луч»", tier: "gold", fee: "1.5" },
  // Июнь
  { month: "Июнь", date: "7", day: "ВС", name: "XVIII Rookie Cup 2026", tier: "gold", fee: "1.2" },
  { month: "Июнь", date: "12", day: "ПТ", name: "Hardy Cup", tier: "closed", fee: "1.3" },
  { month: "Июнь", date: "13", day: "СБ", name: "Pets Day", tier: "platinum", fee: "1.3" },
  { month: "Июнь", date: "26-28", day: "ПТ-ВС", name: "PRIME LINE CUP", tier: "diamond", fee: "1.4" },
  // Июль
  { month: "Июль", date: "4", day: "СБ", name: "BELAVIA Golf Open 2026", tier: "gold", fee: "1.5" },
  { month: "Июль", date: "5", day: "ВС", name: "XIX Rookie Cup 2026", tier: "gold", fee: "1.2" },
  { month: "Июль", date: "10-12", day: "ПТ-ВС", name: "VIII Кубок Гольф-клуба Минск", tier: "platinum", fee: "1.9" },
  { month: "Июль", date: "19", day: "ВС", name: "ФУТГОЛЬФ. Belarus Open", tier: "closed" },
  { month: "Июль", date: "24", day: "ПТ", name: "II Кубок Братства: Беларусь — Россия by WhiteBird", tier: "closed" },
  { month: "Июль", date: "25-26", day: "СБ-ВС", name: "Лига Гольфа (РФ) 3 этап, Минск", tier: "closed" },
  // Август
  { month: "Август", date: "1", day: "СБ", name: "X Time to Golf 2026 (три клюшки)", tier: "gold", fee: "1.2" },
  { month: "Август", date: "8", day: "СБ", name: "Ladies Golf Open", tier: "gold", fee: "1.2" },
  { month: "Август", date: "22", day: "СБ", name: "AVATR Golf Cup (Belarus-China)", tier: "platinum", fee: "1.3" },
  { month: "Август", date: "27", day: "ЧТ", name: "Тур «Золотые 50»", tier: "closed" },
  { month: "Август", date: "29", day: "СБ", name: "Активлизинг Investment Cup", tier: "platinum", fee: "1.6" },
  // Сентябрь
  { month: "Сентябрь", date: "5", day: "СБ", name: "Infinity Golf Cup 2026", tier: "platinum", fee: "1.4" },
  { month: "Сентябрь", date: "11-13", day: "ПТ-ВС", name: "Лига гольфа (РФ) 4 этап и финал (Москва)", tier: "platinum" },
  { month: "Сентябрь", date: "13", day: "ВС", name: "XX Rookie Cup", tier: "gold", fee: "1.2" },
  { month: "Сентябрь", date: "19-20", day: "СБ-ВС", name: "XX Belarus Golf Open Cup", tier: "gold", fee: "1.7" },
  { month: "Сентябрь", date: "26", day: "СБ", name: "«Привет» от Гринкипера by Technogym", tier: "gold", fee: "1.3" },
  // Октябрь
  { month: "Октябрь", date: "2-4", day: "ПТ-ВС", name: "Отбор BMW Golf Cup World Final", tier: "platinum", fee: "1.7" },
  { month: "Октябрь", date: "4", day: "ВС", name: "BMW Challenge Cup 2026", tier: "platinum", fee: "1.6" },
  { month: "Октябрь", date: "7", day: "СР", name: "Этап Евразийской Лиги Гольфа", tier: "closed" },
  { month: "Октябрь", date: "9-10", day: "ПТ-СБ", name: "Minsk Golf InterClub 2026 by Kaspersky", tier: "closed" },
  { month: "Октябрь", date: "11", day: "ВС", name: "Футгольф", tier: "closed" },
  { month: "Октябрь", date: "17", day: "СБ", name: "Благотворительный турнир БСБК", tier: "gold", fee: "1.2" },
  { month: "Октябрь", date: "25", day: "ВС", name: "XXI Rookie Cup", tier: "gold", fee: "1.2" },
  // Ноябрь
  { month: "Ноябрь", date: "*7", day: "СБ", name: "XXII SUPER Rookie Cup", tier: "gold" },
];

export const TIER_LABELS: Record<Tier, string> = {
  gold: "Золотой",
  platinum: "Платиновый",
  diamond: "Бриллиантовый",
  closed: "Закрытый турнир",
};
