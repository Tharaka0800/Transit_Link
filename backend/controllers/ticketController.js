import Ticket from '../models/Ticket.js';
import TicketJourney from '../models/TicketJourney.js';
import TicketQuote from '../models/TicketQuote.js';
import {
  ticketStatus,
  ticketView,
  newTicketReference,
  newTicketToken,
  parseTicketPayload,
} from '../services/ticketService.js';

const validId = (id) => typeof id === 'string' && /^[a-f0-9]{24}$/i.test(id);
const fail = (res, status, message) => {
  res.status(status);
  throw new Error(message);
};

export const getJourneys = async (req, res, next) => {
  try {
    const journeys = await TicketJourney.find({ active: true }).sort({
      mode: 1,
      from: 1,
      to: 1,
    });
    res.json({
      journeys: journeys.map((j) => ({
        id: String(j._id),
        code: j.code,
        mode: j.mode,
        from: j.from,
        to: j.to,
        durationMinutes: j.durationMinutes,
        validityMinutes: j.validityMinutes,
        ticketTypes: j.ticketTypes.map((t) => ({
          code: t.code,
          label: t.label,
          fareMinor: t.fareMinor,
        })),
      })),
    });
  } catch (error) {
    next(error);
  }
};

export const createQuote = async (req, res, next) => {
  try {
    const { journeyId, ticketType, departureAt, passengerCount = 1 } = req.body;
    if (!Number.isInteger(passengerCount) || passengerCount < 1 || passengerCount > 10)
      fail(res, 400, 'Choose between 1 and 10 passengers.');
    if (!validId(journeyId)) fail(res, 400, 'Choose an available journey.');
    const journey = await TicketJourney.findOne({
      _id: journeyId,
      active: true,
    });
    if (!journey) fail(res, 404, 'This journey is no longer available.');
    const type = journey.ticketTypes.find((t) => t.code === ticketType);
    if (!type || !Number.isSafeInteger(type.fareMinor) || type.fareMinor < 1)
      fail(res, 400, 'Choose an available ticket type.');
    const now = new Date();
    const travelNow = departureAt === 'now';
    const validFrom = travelNow
      ? now
      : typeof departureAt === 'string'
        ? new Date(departureAt)
        : new Date(NaN);
    if (
      !Number.isFinite(validFrom.getTime()) ||
      validFrom < now ||
      validFrom.getTime() > now.getTime() + 30 * 86400000
    ) {
      fail(res, 400, 'Choose a journey time in the next 30 days.');
    }
    const quote = await TicketQuote.create({
      userId: req.user._id,
      journeyId: journey._id,
      journey: {
        code: journey.code,
        mode: journey.mode,
        from: journey.from,
        to: journey.to,
        durationMinutes: journey.durationMinutes,
      },
      ticketType: type.code,
      ticketTypeLabel: type.label,
      fareMinor: type.fareMinor,
      passengerCount,
      validFrom,
      validUntil: new Date(
        validFrom.getTime() + journey.validityMinutes * 60000
      ),
      expiresAt: new Date(
        travelNow
          ? Math.min(
              now.getTime() + 5 * 60000,
              validFrom.getTime() + journey.validityMinutes * 60000
            )
          : Math.min(now.getTime() + 5 * 60000, validFrom.getTime())
      ),
    });
    res
      .status(201)
      .json({
        quote: {
          id: String(quote._id),
          journey: quote.journey,
          ticketType: quote.ticketType,
          ticketTypeLabel: quote.ticketTypeLabel,
          fareMinor: quote.fareMinor,
          passengerCount: quote.passengerCount,
          totalFareMinor: quote.fareMinor * quote.passengerCount,
          currency: 'LKR',
          validFrom: quote.validFrom,
          validUntil: quote.validUntil,
          expiresAt: quote.expiresAt,
        },
      });
  } catch (error) {
    next(error);
  }
};

export const purchaseTicket = async (req, res, next) => {
  try {
    await Ticket.init();
    const { quoteId } = req.body;
    if (!validId(quoteId))
      fail(res, 400, 'Review your fare before confirming.');
    let quote = await TicketQuote.findOne({ _id: quoteId, userId: req.user._id });
    if (!quote) fail(res, 404, 'Fare quote not found. Review your journey again.');
    const existing = await Ticket.find({ quoteId, userId: req.user._id })
      .sort({ passengerNumber: 1 }).select('+qrToken');
    const count = quote.passengerCount || 1;
    const respond = (tickets, status) => res.status(status).json({
      ticket: ticketView(tickets[0], true),
      tickets: tickets.map(ticket => ticketView(ticket, true)),
      bookingId: String(quote._id),
      passengerCount: count,
      totalFareMinor: quote.fareMinor * count,
    });
    if (existing.length === count) return respond(existing, 200);
    if (!quote.purchaseStartedAt) {
      if (quote.expiresAt <= new Date())
        fail(res, 409, 'Your fare quote expired. Review your journey again.');
      if (!(await TicketJourney.exists({ _id: quote.journeyId, active: true })))
        fail(res, 409, 'This journey is no longer available.');
      // Persist the start before issuing tickets so an interrupted group can be retried.
      const started = await TicketQuote.findOneAndUpdate(
        { _id: quote._id, purchaseStartedAt: null, expiresAt: { $gt: new Date() } },
        { $set: { purchaseStartedAt: new Date() } }, { new: true }
      );
      quote = started || await TicketQuote.findById(quote._id);
      if (!quote.purchaseStartedAt)
        fail(res, 409, 'Your fare quote expired. Review your journey again.');
    }
    for (let passengerNumber = 1; passengerNumber <= count; passengerNumber++) {
      const key = { quoteId: quote._id, passengerNumber };
      try {
        await Ticket.updateOne(key, { $setOnInsert: {
          ...key,
          passengerCount: count,
          reference: newTicketReference(),
          qrToken: newTicketToken(),
          userId: req.user._id,
          journeyId: quote.journeyId,
          journey: quote.journey,
          passengerName: req.user.fullName,
          ticketType: quote.ticketType,
          ticketTypeLabel: quote.ticketTypeLabel,
          fareMinor: quote.fareMinor,
          validFrom: quote.validFrom,
          validUntil: quote.validUntil,
        } }, { upsert: true, runValidators: true });
      } catch (error) {
        if (error.code !== 11000 || !(await Ticket.exists(key))) throw error;
      }
    }
    const tickets = await Ticket.find({ quoteId, userId: req.user._id })
      .sort({ passengerNumber: 1 }).select('+qrToken');
    return respond(tickets, 201);
  } catch (error) {
    next(error);
  }
};

export const getTickets = async (req, res, next) => {
  try {
    const tickets = await Ticket.find({ userId: req.user._id }).sort({
      createdAt: -1,
    });
    res.json({ tickets: tickets.map((ticket) => ticketView(ticket)) });
  } catch (error) {
    next(error);
  }
};

export const getTicket = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) fail(res, 404, 'Ticket not found.');
    const ticket = await Ticket.findOne({
      _id: req.params.id,
      userId: req.user._id,
    }).select('+qrToken');
    if (!ticket) fail(res, 404, 'Ticket not found.');
    res.json({ ticket: ticketView(ticket, true) });
  } catch (error) {
    next(error);
  }
};

export const requireTicketVerifier = (req, res, next) => {
  if (req.user.role !== 'admin')
    return res
      .status(403)
      .json({
        message:
          'Ticket verification requires an authorized admin demo account.',
      });
  next();
};

export const verifyTicket = async (req, res, next) => {
  try {
    const token = parseTicketPayload(req.body.payload);
    if (!token) fail(res, 400, 'This is not a TransitLink ticket QR.');
    const ticket = await Ticket.findOne({ qrToken: token });
    if (!ticket) fail(res, 404, 'Ticket not recognized.');
    res.json({
      ticket: ticketView(ticket),
      eligible: ticketStatus(ticket) === 'Active',
    });
  } catch (error) {
    next(error);
  }
};

export const redeemTicket = async (req, res, next) => {
  try {
    const token = parseTicketPayload(req.body.payload);
    if (!token) fail(res, 400, 'This is not a TransitLink ticket QR.');
    const now = new Date();
    const ticket = await Ticket.findOneAndUpdate(
      {
        qrToken: token,
        status: 'Active',
        validFrom: { $lte: now },
        validUntil: { $gt: now },
      },
      { $set: { status: 'Used', usedAt: now, verifiedBy: req.user._id } },
      { new: true }
    );
    if (!ticket) {
      const current = await Ticket.findOne({ qrToken: token });
      if (!current) fail(res, 404, 'Ticket not recognized.');
      return res
        .status(409)
        .json({
          message: `Ticket is ${ticketStatus(current).toLowerCase()} and cannot be used.`,
          ticket: ticketView(current),
        });
    }
    res.json({
      ticket: ticketView(ticket),
      message: 'Ticket validated and marked used.',
    });
  } catch (error) {
    next(error);
  }
};
