import mongoose from 'mongoose';

const ticketQuoteSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    journeyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TicketJourney',
      required: true,
    },
    journey: { type: mongoose.Schema.Types.Mixed, required: true },
    ticketType: { type: String, required: true },
    ticketTypeLabel: { type: String, required: true },
    fareMinor: { type: Number, required: true },
    passengerCount: { type: Number, default: 1, min: 1, max: 10 },
    purchaseStartedAt: Date,
    paymentMethod: { type: String, enum: ['transit-balance', 'card', 'mobile-wallet'] },
    tripId: { type: mongoose.Schema.Types.ObjectId, ref: 'BusTrip' },
    busName: String,
    seats: [String],
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

export default mongoose.model('TicketQuote', ticketQuoteSchema);
