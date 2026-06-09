export type TeeColor = "black" | "white" | "yellow" | "blue" | "red";

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
  blue:   { label: "Blue",   cssColor: "rgba(59,130,246,0.4)",   border: "#3b82f6" },
  red:    { label: "Red",    cssColor: "rgba(239,68,68,0.4)",    border: "#ef4444" },
};

export const COURSES: Course[] = [
  {
    id: "championship",
    name: "Championship",
    club: "Golf Club Minsk",
    address: "Kalodishchi, Minsk District, Belarus",
    website: "https://golfminsk.com",
    phone: "+375 (44) 700-22-77",
    designer: "Paul Thomas",
    tees: [
      { color: "black",  label: "Black",  cssColor: "#1f2937", rating: 75.1, slope: 137, totalMeters: 6602 },
      { color: "white",  label: "White",  cssColor: "#f8fafc", rating: 71.9, slope: 131, totalMeters: 6307 },
      { color: "yellow", label: "Yellow", cssColor: "#f59e0b", rating: 70.1, slope: 125, totalMeters: 5919 },
      { color: "blue",   label: "Blue",   cssColor: "#3b82f6", rating: 69.7, slope: 125, totalMeters: 5542 },
      { color: "red",    label: "Red",    cssColor: "#ef4444", rating: 67.5, slope: 115, totalMeters: 5178 },
    ],
    totalPar: 72,
    holes: [
      // hcp = Stroke Index from official scorecard
      { number: 1,  par: 4, hcp: 8,  meters: { black: 393, white: 371, yellow: 350, blue: 318, red: 318 } },
      { number: 2,  par: 5, hcp: 12, meters: { black: 490, white: 442, yellow: 438, blue: 413, red: 390 } },
      { number: 3,  par: 3, hcp: 18, meters: { black: 153, white: 153, yellow: 142, blue: 104, red: 104 } },
      { number: 4,  par: 4, hcp: 6,  meters: { black: 370, white: 359, yellow: 349, blue: 292, red: 286 } },
      { number: 5,  par: 4, hcp: 2,  meters: { black: 382, white: 358, yellow: 358, blue: 307, red: 307 } },
      { number: 6,  par: 4, hcp: 14, meters: { black: 343, white: 332, yellow: 294, blue: 294, red: 274 } },
      { number: 7,  par: 3, hcp: 16, meters: { black: 172, white: 172, yellow: 149, blue: 142, red: 131 } },
      { number: 8,  par: 4, hcp: 4,  meters: { black: 370, white: 332, yellow: 341, blue: 300, red: 294 } },
      { number: 9,  par: 5, hcp: 10, meters: { black: 493, white: 478, yellow: 431, blue: 420, red: 387 } },
      { number: 10, par: 4, hcp: 17, meters: { black: 358, white: 358, yellow: 320, blue: 311, red: 282 } },
      { number: 11, par: 3, hcp: 9,  meters: { black: 209, white: 200, yellow: 191, blue: 185, red: 176 } },
      { number: 12, par: 4, hcp: 1,  meters: { black: 459, white: 405, yellow: 382, blue: 374, red: 338 } },
      { number: 13, par: 5, hcp: 11, meters: { black: 482, white: 444, yellow: 444, blue: 435, red: 413 } },
      { number: 14, par: 4, hcp: 7,  meters: { black: 431, white: 425, yellow: 383, blue: 383, red: 333 } },
      { number: 15, par: 4, hcp: 5,  meters: { black: 403, white: 393, yellow: 311, blue: 311, red: 311 } },
      { number: 16, par: 3, hcp: 15, meters: { black: 180, white: 171, yellow: 158, blue: 158, red: 125 } },
      { number: 17, par: 5, hcp: 3,  meters: { black: 536, white: 536, yellow: 499, blue: 449, red: 445 } },
      { number: 18, par: 4, hcp: 13, meters: { black: 378, white: 378, yellow: 379, blue: 346, red: 264 } },
    ],
  },
  {
    id: "academy",
    name: "Academy",
    club: "Golf Club Minsk",
    address: "Kalodishchi, Minsk District, Belarus",
    website: "https://golfminsk.com",
    phone: "+375 (44) 700-22-77",
    tees: [
      { color: "yellow", label: "Yellow", cssColor: "#f59e0b", rating: 55.3, slope: 83, totalMeters: 785 },
      { color: "red",    label: "Red",    cssColor: "#ef4444", rating: 53.0, slope: 78, totalMeters: 695 },
    ],
    totalPar: 27,
    holes: [
      { number: 1, par: 3, hcp: 9, meters: { black: 78,  white: 78,  yellow: 78,  blue: 78,  red: 69 } },
      { number: 2, par: 3, hcp: 3, meters: { black: 91,  white: 91,  yellow: 91,  blue: 91,  red: 82 } },
      { number: 3, par: 3, hcp: 7, meters: { black: 105, white: 105, yellow: 105, blue: 105, red: 91 } },
      { number: 4, par: 3, hcp: 1, meters: { black: 69,  white: 69,  yellow: 69,  blue: 69,  red: 59 } },
      { number: 5, par: 3, hcp: 5, meters: { black: 87,  white: 87,  yellow: 87,  blue: 87,  red: 78 } },
      { number: 6, par: 3, hcp: 8, meters: { black: 101, white: 101, yellow: 101, blue: 101, red: 87 } },
      { number: 7, par: 3, hcp: 2, meters: { black: 73,  white: 73,  yellow: 73,  blue: 73,  red: 64 } },
      { number: 8, par: 3, hcp: 6, meters: { black: 96,  white: 96,  yellow: 96,  blue: 96,  red: 82 } },
      { number: 9, par: 3, hcp: 4, meters: { black: 86,  white: 86,  yellow: 86,  blue: 86,  red: 82 } },
    ],
  },
];
