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
    const { journeyId, ticketType, departureAt } = req.body;
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
    // A quote is the idempotency key. Retrying a completed purchase returns the same ticket.
    const existing = await Ticket.findOne({
      quoteId,
      userId: req.user._id,
    }).select('+qrToken');
    if (existing) return res.json({ ticket: ticketView(existing, true) });
    const quote = await TicketQuote.findOne({
      _id: quoteId,
      userId: req.user._id,
    });
    if (!quote)
      fail(res, 404, 'Fare quote not found. Review your journey again.');
    if (quote.expiresAt <= new Date())
      fail(res, 409, 'Your fare quote expired. Review your journey again.');
    if (!(await TicketJourney.exists({ _id: quote.journeyId, active: true })))
      fail(res, 409, 'This journey is no longer available.');
    let ticket;
    try {
      ticket = await Ticket.create({
        reference: newTicketReference(),
        qrToken: newTicketToken(),
        userId: req.user._id,
        quoteId: quote._id,
        journeyId: quote.journeyId,
        journey: quote.journey,
        passengerName: req.user.fullName,
        ticketType: quote.ticketType,
        ticketTypeLabel: quote.ticketTypeLabel,
        fareMinor: quote.fareMinor,
        validFrom: quote.validFrom,
        validUntil: quote.validUntil,
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      ticket = await Ticket.findOne({ quoteId, userId: req.user._id }).select(
        '+qrToken'
      );
      if (!ticket) throw error;
    }
    res.status(201).json({ ticket: ticketView(ticket, true) });
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
