import mongoose from 'mongoose';

let memoryServer = null;

const connectDB = async () => {
  try {
    let uri = process.env.MONGO_URI;

    if (process.env.USE_MEMORY_DB === 'true') {
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      memoryServer = await MongoMemoryServer.create();
      uri = memoryServer.getUri();
      console.log('Using in-memory MongoDB (USE_MEMORY_DB=true)');
    }

    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    console.error(
      'Tip: Start MongoDB locally, run Docker Mongo, or set USE_MEMORY_DB=true in .env'
    );
    process.exit(1);
  }
};

export default connectDB;
