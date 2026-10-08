import { randomBytes } from 'node:crypto';

export function ticketStatus(ticket, now = new Date()) {
  if (ticket.status === 'Used') return 'Used';
  if (new Date(ticket.validUntil) <= now) return 'Expired';
  if (new Date(ticket.validFrom) > now) return 'Upcoming';
  return 'Active';
}

export function ticketView(ticket, includeQR = false) {
  const data = {
    id: String(ticket._id),
    reference: ticket.reference,
    journey: ticket.journey,
    passengerName: ticket.passengerName,
    bookingId: String(ticket.quoteId),
    passengerNumber: ticket.passengerNumber || 1,
    passengerCount: ticket.passengerCount || 1,
    seatLabel: ticket.seatLabel,
    busName: ticket.busName,
    tripId: ticket.tripId ? String(ticket.tripId) : undefined,
    ticketType: ticket.ticketType,
    ticketTypeLabel: ticket.ticketTypeLabel,
    fareMinor: ticket.fareMinor,
    currency: ticket.currency,
    purchaseMode: ticket.purchaseMode,
    status: ticketStatus(ticket),
    purchasedAt: ticket.createdAt,
    validFrom: ticket.validFrom,
    validUntil: ticket.validUntil,
    usedAt: ticket.usedAt || null,
  };
  if (includeQR && ticket.qrToken) data.qrPayload = `TL1:${ticket.qrToken}`;
  return data;
}

export const newTicketReference = () =>
  `TL-${randomBytes(10).toString('hex').toUpperCase()}`;
export const newTicketToken = () => randomBytes(32).toString('hex');

export function parseTicketPayload(payload) {
  if (typeof payload !== 'string' || !/^TL1:[a-f0-9]{64}$/.test(payload.trim()))
    return null;
  return payload.trim().slice(4);
}

export function validateJourneyImport(data) {
  if (!Array.isArray(data) || !data.length)
    throw new Error('Provide a nonempty JSON array of journeys.');
  const codes = new Set();
  return data.map((item) => {
    if (!item || typeof item !== 'object')
      throw new Error('Each journey must be an object.');
    for (const field of ['code', 'from', 'to']) {
      if (typeof item[field] !== 'string' || !item[field].trim())
        throw new Error(`${field} is required.`);
    }
    if (
      !['Bus', 'Train'].includes(item.mode) ||
      item.from.trim() === item.to.trim()
    )
      throw new Error('Invalid transport or journey endpoints.');
    for (const field of ['durationMinutes', 'validityMinutes']) {
      if (
        !Number.isSafeInteger(item[field]) ||
        item[field] < 1 ||
        item[field] > 10080
      )
        throw new Error(`Invalid ${field}.`);
    }
    if (codes.has(item.code.trim())) throw new Error('Duplicate journey code.');
    codes.add(item.code.trim());
    const types = new Set();
    if (!Array.isArray(item.ticketTypes) || !item.ticketTypes.length)
      throw new Error('Ticket types are required.');
    const ticketTypes = item.ticketTypes.map((type) => {
      if (
        !type ||
        typeof type.code !== 'string' ||
        !type.code.trim() ||
        typeof type.label !== 'string' ||
        !type.label.trim() ||
        !Number.isSafeInteger(type.fareMinor) ||
        type.fareMinor < 1 ||
        types.has(type.code.trim())
      )
        throw new Error('Invalid or duplicate ticket type/fare.');
      types.add(type.code.trim());
      return {
        code: type.code.trim(),
        label: type.label.trim(),
        fareMinor: type.fareMinor,
      };
    });
    return {
      code: item.code.trim(),
      from: item.from.trim(),
      to: item.to.trim(),
      mode: item.mode,
      durationMinutes: item.durationMinutes,
      validityMinutes: item.validityMinutes,
      ticketTypes,
      active: item.active !== false,
    };
  });
}
