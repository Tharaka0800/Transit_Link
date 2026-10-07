import mongoose from 'mongoose';

const ticketJourneySchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true },
    mode: { type: String, enum: ['Bus', 'Train'], required: true },
    from: { type: String, required: true, trim: true },
    to: { type: String, required: true, trim: true },
    durationMinutes: { type: Number, required: true, min: 1 },
    ticketTypes: [
      {
        code: { type: String, required: true },
        label: { type: String, required: true },
        fareMinor: { type: Number, required: true, min: 1 },
      },
    ],
    validityMinutes: { type: Number, required: true, min: 1 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model('TicketJourney', ticketJourneySchema);
