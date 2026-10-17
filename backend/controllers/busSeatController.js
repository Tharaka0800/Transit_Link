import TicketJourney from '../models/TicketJourney.js';
import TicketQuote from '../models/TicketQuote.js';
import BusTrip from '../models/BusTrip.js';
import { seatLabels, tripView } from '../services/busSeatService.js';

export async function getBusTrips(req, res, next) {
  try {
    if (!/^[a-f0-9]{24}$/i.test(req.params.journeyId))
      return res.status(400).json({ message: 'Choose an available bus journey.' });
    const journey = await TicketJourney.findOne({ _id: req.params.journeyId, mode: 'Bus', active: true });
    if (!journey) return res.status(404).json({ message: 'Bus journey not found.' });
    await BusTrip.init();
    // Sample services at 08:00, 12:00, 16:00 and 20:00 Sri Lanka time.
    const now = new Date();
    const local = new Date(now.getTime() + 330 * 60000);
    const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - 330 * 60000;
    const departures = Array.from({ length: 7 }, (_, day) =>
      [8, 12, 16, 20].map(hour => new Date(midnight + day * 86400000 + hour * 3600000))
    ).flat().filter(date => date > now);
    for (const departureAt of departures) {
      try {
        await BusTrip.updateOne({ journeyId: journey._id, departureAt }, {
          $setOnInsert: {
            journeyId: journey._id, departureAt,
            busName: `${journey.code} · Bus 01`,
            seats: seatLabels.map(label => ({ label, booked: false })),
          },
        }, { upsert: true });
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
    }
    const trips = await BusTrip.find({ journeyId: journey._id, departureAt: { $in: departures } }).sort({ departureAt: 1 });
    res.json({ trips: trips.map(tripView), demoSchedule: true });
  } catch (error) { next(error); }
}

export async function releaseSeatHold(req, res, next) {
  try {
    if (!/^[a-f0-9]{24}$/i.test(req.params.quoteId))
      return res.status(400).json({ message: 'Invalid fare quote.' });
    const quote = await TicketQuote.findOne({ _id: req.params.quoteId, userId: req.user._id });
    if (!quote) return res.status(404).json({ message: 'Fare quote not found.' });
    if (quote.purchaseStartedAt)
      return res.status(409).json({ message: 'This purchase has started. Check My Tickets.' });
    if (quote.tripId) {
      const trip = await BusTrip.findOneAndUpdate({
        _id: quote.tripId,
        seats: { $not: { $elemMatch: { quoteId: quote._id, booked: true } } },
      }, { $unset: { 'seats.$[held].quoteId': '', 'seats.$[held].heldUntil': '' } }, {
        arrayFilters: [{ 'held.quoteId': quote._id, 'held.booked': false }], new: true,
      });
      if (!trip) return res.status(409).json({ message: 'This purchase has started. Check My Tickets.' });
    }
    await TicketQuote.updateOne({ _id: quote._id }, { $set: { expiresAt: new Date() } });
    res.json({ message: 'Seat hold released.' });
  } catch (error) { next(error); }
}
