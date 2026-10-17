import mongoose from 'mongoose';

const busTripSchema = new mongoose.Schema({
  journeyId: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketJourney', required: true },
  departureAt: { type: Date, required: true },
  busName: { type: String, required: true },
  seats: [{
    _id: false,
    label: { type: String, required: true },
    quoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'TicketQuote' },
    heldUntil: Date,
    booked: { type: Boolean, default: false },
  }],
}, { timestamps: true });
busTripSchema.index({ journeyId: 1, departureAt: 1 }, { unique: true });
export default mongoose.model('BusTrip', busTripSchema);
