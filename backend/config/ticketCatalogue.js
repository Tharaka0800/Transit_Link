import { readFile } from 'node:fs/promises';
import TicketJourney from '../models/TicketJourney.js';
import { validateJourneyImport } from '../services/ticketService.js';

export default async function loadTicketCatalogue() {
  const file =
    process.env.TICKET_JOURNEYS_FILE?.trim() ||
    (process.env.USE_MEMORY_DB === 'true'
      ? new URL('../data/ticket-journeys.demo.json', import.meta.url)
      : null);
  if (!file) return;
  const journeys = validateJourneyImport(
    JSON.parse(await readFile(file, 'utf8'))
  );
  await TicketJourney.bulkWrite(
    journeys.map((journey) => ({
      updateOne: {
        filter: { code: journey.code },
        update: { $set: journey },
        upsert: true,
      },
    }))
  );
  console.log(`Loaded ${journeys.length} configured ticket journeys.`);
}
