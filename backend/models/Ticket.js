import mongoose from 'mongoose';

const ticketSchema = new mongoose.Schema(
  {
    reference: { type: String, required: true, unique: true },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    quoteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TicketQuote',
      required: true,
      unique: true,
    },
    journeyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TicketJourney',
      required: true,
    },
    journey: { type: mongoose.Schema.Types.Mixed, required: true },
    passengerName: { type: String, required: true },
    ticketType: { type: String, required: true },
    ticketTypeLabel: { type: String, required: true },
    fareMinor: { type: Number, required: true },
    currency: { type: String, default: 'LKR', enum: ['LKR'] },
    purchaseMode: { type: String, default: 'demo', enum: ['demo'] },
    qrToken: { type: String, required: true, unique: true, select: false },
    status: { type: String, enum: ['Active', 'Used'], default: 'Active' },
    validFrom: { type: Date, required: true },
    validUntil: { type: Date, required: true },
    usedAt: Date,
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

export default mongoose.model('Ticket', ticketSchema);
