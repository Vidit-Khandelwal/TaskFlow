import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ override: true });

const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017/task_manager';

export async function connectMongo() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(mongoUrl, {
    dbName: process.env.MONGO_DB || 'task_manager'
  });
}

export default mongoose;
