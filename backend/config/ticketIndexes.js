import Ticket from '../models/Ticket.js';

// Retain existing tickets while replacing the single-passenger booking constraint.
export default async function prepareTicketIndexes() {
  await Ticket.init();
  await Ticket.updateMany(
    { passengerNumber: { $exists: false } },
    { $set: { passengerNumber: 1, passengerCount: 1 } }
  );
  await Ticket.collection.createIndex(
    { quoteId: 1, passengerNumber: 1 },
    { unique: true }
  );
  const indexes = await Ticket.collection.indexes();
  const legacyNumberIndex = indexes.find(
    (index) => index.unique && !index.sparse && !index.partialFilterExpression &&
      index.key.ticketNumber === 1 && Object.keys(index.key).length === 1
  );
  if (legacyNumberIndex) {
    // Current tickets use reference instead. Keep legacy numbers unique without
    // treating every new ticket's absent ticketNumber as the same null value.
    await Ticket.collection.createIndex(
      { ticketNumber: 1 },
      { unique: true, sparse: true, name: 'ticketNumber_legacy_unique_sparse' }
    );
    await Ticket.collection.dropIndex(legacyNumberIndex.name);
  }
  const oldIndex = indexes.find(
    (index) => index.unique && index.key.quoteId === 1 && Object.keys(index.key).length === 1
  );
  if (oldIndex) await Ticket.collection.dropIndex(oldIndex.name);
}
