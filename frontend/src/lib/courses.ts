export type TeeColor = "black" | "white" | "yellow" | "red";

export type TeeInfo = {
  color: TeeColor;
  label: string;
  cssColor: string;
  rating: number;
  slope: number;
  totalMeters: number;
};

export type Hole = { number: number; par: number; hcp: number; meters: Record<TeeColor, number> };
export type Course = {
  id: string;
  name: string;
  club: string;
  address: string;
  website: string;
  phone: string;
  designer?: string;
  tees: TeeInfo[];
  totalPar: number;
  holes: Hole[];
};

export const TEE_CONFIG: Record<TeeColor, { label: string; cssColor: string; border: string }> = {
  black:  { label: "Black",  cssColor: "rgba(20,20,20,0.95)",    border: "#6b7280" },
  white:  { label: "White",  cssColor: "rgba(248,250,252,0.95)", border: "#94a3b8" },
  yellow: { label: "Yellow", cssColor: "rgba(245,158,11,0.4)",   border: "#f59e0b" },
  red:    { label: "Red",    cssColor: "rgba(239,68,68,0.4)",    border: "#ef4444" },
};

export const COURSES: Course[] = [
  {
    id: "championship",
    name: "Championship",
    club: "Golf Club Minsk",
    address: "Калодзищи, Минский район, Беларусь",
    website: "https://golfminsk.com",
    phone: "+375 (44) 700-22-77",
    designer: "Paul Thomas",
    tees: [
      { color: "black",  label: "Black",  cssColor: "#1f2937", rating: 75.1, slope: 137, totalMeters: 6037 },
      { color: "white",  label: "White",  cssColor: "#f8fafc", rating: 72.5, slope: 124, totalMeters: 5767 },
      { color: "yellow", label: "Yellow", cssColor: "#f59e0b", rating: 70.9, slope: 102, totalMeters: 5412 },
      { color: "red",    label: "Red",    cssColor: "#ef4444", rating: 67.5, slope: 95,  totalMeters: 4735 },
    ],
    totalPar: 72,
    holes: [
      { number: 1,  par: 4, hcp: 7,  meters: { black: 359, white: 339, yellow: 320, red: 291 } },
      { number: 2,  par: 5, hcp: 3,  meters: { black: 448, white: 404, yellow: 401, red: 357 } },
      { number: 3,  par: 3, hcp: 17, meters: { black: 140, white: 140, yellow: 130, red: 95  } },
      { number: 4,  par: 4, hcp: 9,  meters: { black: 338, white: 328, yellow: 319, red: 262 } },
      { number: 5,  par: 4, hcp: 5,  meters: { black: 349, white: 327, yellow: 327, red: 281 } },
      { number: 6,  par: 4, hcp: 15, meters: { black: 314, white: 304, yellow: 269, red: 251 } },
      { number: 7,  par: 3, hcp: 13, meters: { black: 157, white: 157, yellow: 136, red: 120 } },
      { number: 8,  par: 4, hcp: 11, meters: { black: 338, white: 312, yellow: 312, red: 269 } },
      { number: 9,  par: 5, hcp: 1,  meters: { black: 451, white: 429, yellow: 394, red: 354 } },
      { number: 10, par: 4, hcp: 10, meters: { black: 327, white: 327, yellow: 293, red: 258 } },
      { number: 11, par: 3, hcp: 16, meters: { black: 191, white: 183, yellow: 175, red: 161 } },
      { number: 12, par: 4, hcp: 8,  meters: { black: 420, white: 370, yellow: 349, red: 309 } },
      { number: 13, par: 5, hcp: 4,  meters: { black: 441, white: 406, yellow: 398, red: 378 } },
      { number: 14, par: 4, hcp: 6,  meters: { black: 394, white: 389, yellow: 359, red: 305 } },
      { number: 15, par: 4, hcp: 12, meters: { black: 369, white: 359, yellow: 315, red: 284 } },
      { number: 16, par: 3, hcp: 18, meters: { black: 165, white: 156, yellow: 144, red: 114 } },
      { number: 17, par: 5, hcp: 2,  meters: { black: 490, white: 490, yellow: 469, red: 407 } },
      { number: 18, par: 4, hcp: 14, meters: { black: 346, white: 346, yellow: 302, red: 241 } },
    ],
  },
  {
    id: "academy",
    name: "Academy",
    club: "Golf Club Minsk",
    address: "Калодзищи, Минский район, Беларусь",
    website: "https://golfminsk.com",
    phone: "+375 (44) 700-22-77",
    tees: [
      { color: "yellow", label: "Yellow", cssColor: "#f59e0b", rating: 55.3, slope: 83, totalMeters: 785 },
      { color: "red",    label: "Red",    cssColor: "#ef4444", rating: 53.0, slope: 78, totalMeters: 695 },
    ],
    totalPar: 27,
    holes: [
      { number: 1, par: 3, hcp: 9, meters: { black: 78,  white: 78,  yellow: 78,  red: 69 } },
      { number: 2, par: 3, hcp: 3, meters: { black: 91,  white: 91,  yellow: 91,  red: 82 } },
      { number: 3, par: 3, hcp: 7, meters: { black: 105, white: 105, yellow: 105, red: 91 } },
      { number: 4, par: 3, hcp: 1, meters: { black: 69,  white: 69,  yellow: 69,  red: 59 } },
      { number: 5, par: 3, hcp: 5, meters: { black: 87,  white: 87,  yellow: 87,  red: 78 } },
      { number: 6, par: 3, hcp: 8, meters: { black: 101, white: 101, yellow: 101, red: 87 } },
      { number: 7, par: 3, hcp: 2, meters: { black: 73,  white: 73,  yellow: 73,  red: 64 } },
      { number: 8, par: 3, hcp: 6, meters: { black: 96,  white: 96,  yellow: 96,  red: 82 } },
      { number: 9, par: 3, hcp: 4, meters: { black: 86,  white: 86,  yellow: 86,  red: 82 } },
    ],
  },
];
