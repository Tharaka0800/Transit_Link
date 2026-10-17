import { readFile } from 'node:fs/promises';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import TicketJourney from '../models/TicketJourney.js';
import { validateJourneyImport } from '../services/ticketService.js';

dotenv.config();
try {
  if (!process.argv[2])
    throw new Error('Usage: npm run tickets:import -- path/to/journeys.json');
  if (process.env.USE_MEMORY_DB === 'true')
    throw new Error(
      'Import requires persistent MongoDB. A separate memory database would disappear when this command exits.'
    );
  const journeys = validateJourneyImport(
    JSON.parse(await readFile(process.argv[2], 'utf8'))
  );
  await connectDB();
  await TicketJourney.bulkWrite(
    journeys.map((journey) => ({
      updateOne: {
        filter: { code: journey.code },
        update: { $set: journey },
        upsert: true,
      },
    }))
  );
  console.log(
    `Imported ${journeys.length} ticket journeys. Other collections were unchanged.`
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
