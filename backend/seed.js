import dotenv from 'dotenv';
import connectDB from './config/db.js';
import seedDemoData from './utils/seedData.js';

dotenv.config();

const seedData = async () => {
  try {
    await connectDB();
    // Full reset so Atlas always gets complete component coverage data
    await seedDemoData({ reset: true });
    console.log('Seed data created successfully on Atlas / configured MongoDB');
    process.exit(0);
  } catch (error) {
    console.error(`Seed error: ${error.message}`);
    process.exit(1);
  }
};

seedData();
