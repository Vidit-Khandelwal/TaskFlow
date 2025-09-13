import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import session from 'express-session';
import MongoStore from 'connect-mongo';
import cookieParser from 'cookie-parser';
import authRoutes from './routes/auth.js';
import taskRoutes from './routes/tasks.js';
import userRoutes from './routes/users.js';
import { connectMongo } from './db/index.js';
import { startNotificationScheduler } from './services/notificationScheduler.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Trust proxy for correct rate-limit client IP when behind proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet());
app.use(cors({
  origin: true,  // Allow all origins
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});
app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Sessions (Mongo-backed)
const mongoUrl = process.env.MONGO_URL || 'mongodb://localhost:27017';
const mongoDbName = process.env.MONGO_DB || 'task_manager';
app.use(session({
  name: 'sid',
  secret: process.env.SESSION_SECRET || 'dev_session_secret_change_me',
  resave: false,
  saveUninitialized: true,  // Changed to true
  cookie: {
    httpOnly: false,  // Changed to false for debugging
    sameSite: 'none',
    secure: true,
    maxAge: 90 * 24 * 60 * 60 * 1000
  },
  store: MongoStore.create({ mongoUrl, dbName: mongoDbName, collectionName: 'sessions' })
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ message: 'Server is running', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

async function start() {
  try {
    await connectMongo();
    
    // Start notification scheduler
    startNotificationScheduler();
    
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (e) {
    console.error('Failed to start server:', e);
    process.exit(1);
  }
}

start();
