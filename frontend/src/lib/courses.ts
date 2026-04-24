export type Hole = { number: number; par: number; yards: number; hcp: number };
export type Course = {
  id: string;
  name: string;
  club: string;
  tee: string;
  rating: number;
  slope: number;
  totalYards: number;
  totalPar: number;
  holes: Hole[];
};

export const COURSES: Course[] = [
  {
    id: "championship",
    name: "Championship",
    club: "Golf Club Minsk",
    tee: "Yellow",
    rating: 70.9,
    slope: 102,
    totalYards: 6234,
    totalPar: 72,
    holes: [
      { number: 1, par: 4, yards: 365, hcp: 7 },
      { number: 2, par: 5, yards: 510, hcp: 3 },
      { number: 3, par: 3, yards: 175, hcp: 15 },
      { number: 4, par: 4, yards: 410, hcp: 1 },
      { number: 5, par: 4, yards: 380, hcp: 9 },
      { number: 6, par: 3, yards: 165, hcp: 17 },
      { number: 7, par: 5, yards: 525, hcp: 5 },
      { number: 8, par: 4, yards: 395, hcp: 11 },
      { number: 9, par: 4, yards: 340, hcp: 13 },
      { number: 10, par: 4, yards: 405, hcp: 6 },
      { number: 11, par: 3, yards: 180, hcp: 16 },
      { number: 12, par: 5, yards: 540, hcp: 2 },
      { number: 13, par: 4, yards: 370, hcp: 10 },
      { number: 14, par: 4, yards: 425, hcp: 4 },
      { number: 15, par: 3, yards: 155, hcp: 18 },
      { number: 16, par: 5, yards: 495, hcp: 8 },
      { number: 17, par: 4, yards: 385, hcp: 12 },
      { number: 18, par: 4, yards: 415, hcp: 14 },
    ],
  },
  {
    id: "academy",
    name: "Academy",
    club: "Golf Club Minsk",
    tee: "Yellow",
    rating: 55.3,
    slope: 83,
    totalYards: 1878,
    totalPar: 56,
    holes: [
      { number: 1, par: 3, yards: 95, hcp: 13 },
      { number: 2, par: 3, yards: 110, hcp: 7 },
      { number: 3, par: 4, yards: 280, hcp: 1 },
      { number: 4, par: 3, yards: 130, hcp: 9 },
      { number: 5, par: 3, yards: 105, hcp: 15 },
      { number: 6, par: 3, yards: 145, hcp: 5 },
      { number: 7, par: 3, yards: 90, hcp: 17 },
      { number: 8, par: 4, yards: 265, hcp: 3 },
      { number: 9, par: 3, yards: 120, hcp: 11 },
      { number: 10, par: 3, yards: 95, hcp: 14 },
      { number: 11, par: 3, yards: 110, hcp: 8 },
      { number: 12, par: 4, yards: 280, hcp: 2 },
      { number: 13, par: 3, yards: 130, hcp: 10 },
      { number: 14, par: 3, yards: 105, hcp: 16 },
      { number: 15, par: 3, yards: 145, hcp: 6 },
      { number: 16, par: 3, yards: 90, hcp: 18 },
      { number: 17, par: 4, yards: 265, hcp: 4 },
      { number: 18, par: 3, yards: 120, hcp: 12 },
    ],
  },
];
