import dotenv from 'dotenv';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import prepareTicketIndexes from '../config/ticketIndexes.js';

dotenv.config();
try {
  if (process.env.USE_MEMORY_DB === 'true') {
    throw new Error('Restart the backend to repair its in-memory database indexes.');
  }
  await connectDB();
  await prepareTicketIndexes();
  console.log('Ticket indexes repaired. Existing tickets were preserved.');
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
