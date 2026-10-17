import BusTrip from '../models/BusTrip.js';

export const seatLabels = Array.from({ length: 5 }, (_, row) =>
  ['A', 'B', 'C', 'D'].map(column => `${String(row + 1).padStart(2, '0')}${column}`)
).flat();

export function tripView(trip) {
  const now = Date.now();
  const seats = trip.seats.map(seat => ({
    label: seat.label,
    status: seat.booked ? 'occupied' : seat.heldUntil?.getTime() > now ? 'reserved' : 'available',
  }));
  return {
    id: String(trip._id), busName: trip.busName, departureAt: trip.departureAt,
    seats, availableSeats: seats.filter(seat => seat.status === 'available').length,
  };
}

// All seats are held by one atomic update on the trip document. No partial holds.
export async function holdSeats(tripId, labels, quoteId, heldUntil) {
  const now = new Date();
  return BusTrip.findOneAndUpdate({
    _id: tripId,
    departureAt: { $gt: now },
    seats: { $not: { $elemMatch: {
      label: { $in: labels },
      $or: [{ booked: true }, { heldUntil: { $gt: now } }],
    } } },
  }, { $set: {
    'seats.$[chosen].quoteId': quoteId,
    'seats.$[chosen].heldUntil': heldUntil,
    'seats.$[chosen].booked': false,
  } }, { arrayFilters: [{ 'chosen.label': { $in: labels } }], new: true });
}

export async function confirmSeats(quote) {
  const now = new Date();
  return BusTrip.findOneAndUpdate({
    _id: quote.tripId,
    $and: quote.seats.map(label => ({ seats: { $elemMatch: {
      label, quoteId: quote._id,
      $or: [{ booked: true }, ...(quote.expiresAt > now ? [{ heldUntil: { $gt: now } }] : [])],
    } } })),
  }, { $set: { 'seats.$[chosen].booked': true } }, {
    arrayFilters: [{ 'chosen.label': { $in: quote.seats }, 'chosen.quoteId': quote._id }],
    new: true,
  });
}
