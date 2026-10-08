import api from './api';
export type TicketStatus = 'Upcoming' | 'Active' | 'Used' | 'Expired';
export interface Journey {
  id: string;
  code: string;
  mode: 'Bus' | 'Train';
  from: string;
  to: string;
  durationMinutes: number;
  validityMinutes: number;
  ticketTypes: Array<{ code: string; label: string; fareMinor: number }>;
}
export interface Quote {
  id: string;
  journey: Pick<Journey, 'code' | 'mode' | 'from' | 'to' | 'durationMinutes'>;
  ticketType: string;
  ticketTypeLabel: string;
  fareMinor: number;
  passengerCount?: number;
  totalFareMinor?: number;
  seats?: string[];
  tripId?: string;
  busName?: string;
  currency: string;
  validFrom: string;
  validUntil: string;
  expiresAt: string;
}
export interface Ticket extends Omit<Quote, 'expiresAt'> {
  reference: string;
  passengerName: string;
  status: TicketStatus;
  purchasedAt: string;
  usedAt: string | null;
  purchaseMode: 'demo';
  qrPayload?: string;
  bookingId?: string;
  passengerNumber?: number;
  seatLabel?: string;
}
export interface BusTrip {
  id: string;
  busName: string;
  departureAt: string;
  availableSeats: number;
  seats: Array<{ label: string; status: 'available' | 'occupied' | 'reserved' }>;
}
export const loadBusTrips = async (journeyId: string): Promise<BusTrip[]> =>
  (await api.get(`/tickets/journeys/${encodeURIComponent(journeyId)}/trips`)).data.trips;
export const releaseSeatHold = async (quoteId: string): Promise<void> => {
  await api.post(`/tickets/quotes/${encodeURIComponent(quoteId)}/release`);
};
export const loadJourneys = async (): Promise<Journey[]> =>
  (await api.get('/tickets/journeys')).data.journeys;
export const quoteJourney = async (
  journeyId: string,
  ticketType: string,
  departureAt: string,
  passengerCount = 1,
  seatSelection?: { tripId: string; seats: string[] }
): Promise<Quote> =>
  (await api.post('/tickets/quotes', { journeyId, ticketType, departureAt, passengerCount, ...seatSelection }))
    .data.quote;
export const purchaseQuote = async (quoteId: string): Promise<Ticket> =>
  (await api.post('/tickets/purchase', { quoteId })).data.ticket;
export const loadTickets = async (): Promise<Ticket[]> =>
  (await api.get('/tickets')).data.tickets;
export const loadTicket = async (id: string): Promise<Ticket> =>
  (await api.get(`/tickets/${encodeURIComponent(id)}`)).data.ticket;
export const verifyQR = async (
  payload: string
): Promise<{ ticket: Ticket; eligible: boolean }> =>
  (await api.post('/tickets/verify', { payload })).data;
export const redeemQR = async (
  payload: string
): Promise<{ ticket: Ticket; message: string }> =>
  (await api.post('/tickets/redeem', { payload })).data;
export function ticketError(error: unknown): string {
  const failure = error as {
    response?: { status?: number; data?: { message?: string } };
  };
  if (failure.response?.status === 401)
    return 'Your session has ended. Sign in again to continue.';
  return (
    failure.response?.data?.message ||
    'We could not reach TransitLink. Check your connection and try again.'
  );
}
export const isSessionError = (error: unknown) =>
  (error as { response?: { status?: number } }).response?.status === 401;
