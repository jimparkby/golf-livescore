export type TeeColor = "black" | "white" | "yellow" | "red";

export type TeeInfo = {
  color: TeeColor;
  label: string;
  cssColor: string;
  rating: number;
  slope: number;
  totalYards: number;
};

export type Hole = { number: number; par: number; hcp: number; yards: Record<TeeColor, number> };
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
      { color: "black",  label: "Black",  cssColor: "#1f2937", rating: 75.1, slope: 137, totalYards: 6602 },
      { color: "white",  label: "White",  cssColor: "#f8fafc", rating: 72.5, slope: 124, totalYards: 6307 },
      { color: "yellow", label: "Yellow", cssColor: "#f59e0b", rating: 70.9, slope: 102, totalYards: 5919 },
      { color: "red",    label: "Red",    cssColor: "#ef4444", rating: 67.5, slope: 95,  totalYards: 5178 },
    ],
    totalPar: 72,
    holes: [
      { number: 1,  par: 4, hcp: 7,  yards: { black: 393, white: 371, yellow: 350, red: 318 } },
      { number: 2,  par: 5, hcp: 3,  yards: { black: 490, white: 442, yellow: 438, red: 390 } },
      { number: 3,  par: 3, hcp: 17, yards: { black: 153, white: 153, yellow: 142, red: 104 } },
      { number: 4,  par: 4, hcp: 9,  yards: { black: 370, white: 359, yellow: 349, red: 286 } },
      { number: 5,  par: 4, hcp: 5,  yards: { black: 382, white: 358, yellow: 358, red: 307 } },
      { number: 6,  par: 4, hcp: 15, yards: { black: 343, white: 332, yellow: 294, red: 274 } },
      { number: 7,  par: 3, hcp: 13, yards: { black: 172, white: 172, yellow: 149, red: 131 } },
      { number: 8,  par: 4, hcp: 11, yards: { black: 370, white: 341, yellow: 341, red: 294 } },
      { number: 9,  par: 5, hcp: 1,  yards: { black: 493, white: 469, yellow: 431, red: 387 } },
      { number: 10, par: 4, hcp: 10, yards: { black: 358, white: 358, yellow: 320, red: 282 } },
      { number: 11, par: 3, hcp: 16, yards: { black: 209, white: 200, yellow: 191, red: 176 } },
      { number: 12, par: 4, hcp: 8,  yards: { black: 459, white: 405, yellow: 382, red: 338 } },
      { number: 13, par: 5, hcp: 4,  yards: { black: 482, white: 444, yellow: 435, red: 413 } },
      { number: 14, par: 4, hcp: 6,  yards: { black: 431, white: 425, yellow: 393, red: 333 } },
      { number: 15, par: 4, hcp: 12, yards: { black: 403, white: 393, yellow: 345, red: 311 } },
      { number: 16, par: 3, hcp: 18, yards: { black: 180, white: 171, yellow: 158, red: 125 } },
      { number: 17, par: 5, hcp: 2,  yards: { black: 536, white: 536, yellow: 513, red: 445 } },
      { number: 18, par: 4, hcp: 14, yards: { black: 378, white: 378, yellow: 330, red: 264 } },
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
      { color: "yellow", label: "Yellow", cssColor: "#f59e0b", rating: 55.3, slope: 83, totalYards: 859 },
      { color: "red",    label: "Red",    cssColor: "#ef4444", rating: 53.0, slope: 78, totalYards: 760 },
    ],
    totalPar: 27,
    holes: [
      { number: 1, par: 3, hcp: 9, yards: { black: 85,  white: 85,  yellow: 85,  red: 75  } },
      { number: 2, par: 3, hcp: 3, yards: { black: 100, white: 100, yellow: 100, red: 90  } },
      { number: 3, par: 3, hcp: 7, yards: { black: 115, white: 115, yellow: 115, red: 100 } },
      { number: 4, par: 3, hcp: 1, yards: { black: 75,  white: 75,  yellow: 75,  red: 65  } },
      { number: 5, par: 3, hcp: 5, yards: { black: 95,  white: 95,  yellow: 95,  red: 85  } },
      { number: 6, par: 3, hcp: 8, yards: { black: 110, white: 110, yellow: 110, red: 95  } },
      { number: 7, par: 3, hcp: 2, yards: { black: 80,  white: 80,  yellow: 80,  red: 70  } },
      { number: 8, par: 3, hcp: 6, yards: { black: 105, white: 105, yellow: 105, red: 90  } },
      { number: 9, par: 3, hcp: 4, yards: { black: 94,  white: 94,  yellow: 94,  red: 90  } },
    ],
  },
];
