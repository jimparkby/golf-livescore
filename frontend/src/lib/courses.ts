export type Hole = { number: number; par: number; yards: number; hcp: number };
export type Course = {
  id: string;
  name: string;
  club: string;
  address: string;
  website: string;
  phone: string;
  designer?: string;
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
    address: "Калодзищи, Минский район, Беларусь",
    website: "https://golfminsk.com",
    phone: "+375 (44) 700-22-77",
    designer: "Paul Thomas",
    tee: "Yellow",
    rating: 70.9,
    slope: 102,
    totalYards: 6602,
    totalPar: 72,
    holes: [
      { number: 1,  par: 4, yards: 365, hcp: 7  },
      { number: 2,  par: 5, yards: 510, hcp: 3  },
      { number: 3,  par: 3, yards: 175, hcp: 15 },
      { number: 4,  par: 4, yards: 430, hcp: 1  },
      { number: 5,  par: 4, yards: 390, hcp: 9  },
      { number: 6,  par: 3, yards: 180, hcp: 17 },
      { number: 7,  par: 5, yards: 545, hcp: 5  },
      { number: 8,  par: 4, yards: 410, hcp: 11 },
      { number: 9,  par: 4, yards: 350, hcp: 13 },
      { number: 10, par: 4, yards: 415, hcp: 6  },
      { number: 11, par: 3, yards: 185, hcp: 16 },
      { number: 12, par: 5, yards: 555, hcp: 2  },
      { number: 13, par: 4, yards: 380, hcp: 10 },
      { number: 14, par: 4, yards: 440, hcp: 4  },
      { number: 15, par: 3, yards: 160, hcp: 18 },
      { number: 16, par: 5, yards: 510, hcp: 8  },
      { number: 17, par: 4, yards: 395, hcp: 12 },
      { number: 18, par: 4, yards: 407, hcp: 14 },
    ],
  },
  {
    id: "academy",
    name: "Academy",
    club: "Golf Club Minsk",
    address: "Калодзищи, Минский район, Беларусь",
    website: "https://golfminsk.com",
    phone: "+375 (44) 700-22-77",
    tee: "Yellow",
    rating: 55.3,
    slope: 83,
    totalYards: 859,
    totalPar: 27,
    holes: [
      { number: 1, par: 3, yards: 85,  hcp: 9 },
      { number: 2, par: 3, yards: 100, hcp: 3 },
      { number: 3, par: 3, yards: 115, hcp: 7 },
      { number: 4, par: 3, yards: 75,  hcp: 1 },
      { number: 5, par: 3, yards: 95,  hcp: 5 },
      { number: 6, par: 3, yards: 110, hcp: 8 },
      { number: 7, par: 3, yards: 80,  hcp: 2 },
      { number: 8, par: 3, yards: 105, hcp: 6 },
      { number: 9, par: 3, yards: 94,  hcp: 4 },
    ],
  },
];
