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
    totalYards: 5919,
    totalPar: 72,
    holes: [
      { number: 1,  par: 4, yards: 350, hcp: 7  },
      { number: 2,  par: 5, yards: 438, hcp: 3  },
      { number: 3,  par: 3, yards: 142, hcp: 17 },
      { number: 4,  par: 4, yards: 349, hcp: 9  },
      { number: 5,  par: 4, yards: 358, hcp: 5  },
      { number: 6,  par: 4, yards: 294, hcp: 15 },
      { number: 7,  par: 3, yards: 149, hcp: 13 },
      { number: 8,  par: 4, yards: 341, hcp: 11 },
      { number: 9,  par: 5, yards: 431, hcp: 1  },
      { number: 10, par: 4, yards: 320, hcp: 10 },
      { number: 11, par: 3, yards: 191, hcp: 16 },
      { number: 12, par: 4, yards: 382, hcp: 8  },
      { number: 13, par: 5, yards: 435, hcp: 4  },
      { number: 14, par: 4, yards: 393, hcp: 6  },
      { number: 15, par: 4, yards: 345, hcp: 12 },
      { number: 16, par: 3, yards: 158, hcp: 18 },
      { number: 17, par: 5, yards: 513, hcp: 2  },
      { number: 18, par: 4, yards: 330, hcp: 14 },
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
