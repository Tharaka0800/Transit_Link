export const upcomingTickets = [
  {
    id: 'TXN10492813',
    mode: 'Train',
    status: 'Active',
    from: 'Colombo Fort',
    to: 'Kandy',
    date: '12 Sep 2026',
    time: '10:30 AM',
  },
  {
    id: 'TXN10782940',
    mode: 'Bus',
    status: 'Active',
    from: 'Colombo Fort',
    to: 'Galle',
    date: '15 Sep 2026',
    time: '08:15 AM',
  },
];

export const pastTickets = [
  {
    id: 'TXN09881220',
    mode: 'Bus',
    status: 'Used',
    from: 'Maharagama',
    to: 'Colombo Fort',
    date: '01 Sep 2026',
    time: '07:45 AM',
  },
  {
    id: 'TXN09774110',
    mode: 'Train',
    status: 'Used',
    from: 'Kandy',
    to: 'Colombo Fort',
    date: '20 Aug 2026',
    time: '04:10 PM',
  },
];

export const favouriteRoutes = [
  {
    id: 'r1',
    from: 'Colombo',
    to: 'Kandy',
    mode: 'Train',
    duration: '2h 30m',
    favorite: true,
    muted: false,
  },
  {
    id: 'r2',
    from: 'Colombo Fort',
    to: 'Galle',
    mode: 'Bus',
    duration: '2h 15m',
    favorite: true,
    muted: false,
  },
  {
    id: 'r3',
    from: 'Maharagama',
    to: 'Pettah',
    mode: 'Bus',
    duration: '45m',
    favorite: false,
    muted: true,
  },
  {
    id: 'r4',
    from: 'Negombo',
    to: 'Colombo Fort',
    mode: 'Train',
    duration: '1h 05m',
    favorite: false,
    muted: true,
  },
];

export const generalFares = [
  { route: 'Colombo Fort → Kandy', bus: 320, train: 450 },
  { route: 'Colombo Fort → Galle', bus: 280, train: 400 },
  { route: 'Maharagama → Pettah', bus: 60, train: null },
  { route: 'Negombo → Colombo Fort', bus: 150, train: 220 },
];
