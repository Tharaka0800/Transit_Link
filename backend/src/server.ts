import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import jwt from 'jsonwebtoken';
import { createServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import {
  INCIDENT_UPDATED_EVENT,
  type IncidentServerToClientEvents,
} from '../../shared/incident.js';
import userRoutes from '../routes/userRoutes.js';
import notificationRoutes from '../routes/notificationRoutes.js';
import User from '../models/User.js';
import { protect } from '../middleware/authMiddleware.js';
import { notFound, errorHandler } from '../middleware/errorMiddleware.js';
import { createSupabaseClient, type IncidentSupabaseClient } from './config/supabase.js';
import { createIncidentController, type EmitIncidentUpdated } from './controllers/IncidentController.js';
import { SupabaseIncidentRepository, type IncidentRepository } from './repositories/IncidentRepository.js';

export type AuthenticateSocket = (token: unknown) => Promise<void>;

export async function authenticateIncidentSocket(token: unknown): Promise<void> {
  if (typeof token !== 'string' || !token || !process.env.JWT_SECRET) {
    throw new Error('Not authorized. Please sign in again.');
  }
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  if (typeof decoded === 'string' || typeof decoded.id !== 'string') {
    throw new Error('Not authorized. Please sign in again.');
  }
  const user = await User.findById(decoded.id).select('_id');
  if (!user) throw new Error('Not authorized. Please sign in again.');
}

interface AppOptions {
  repository: IncidentRepository;
  emit: EmitIncidentUpdated;
  authenticate?: RequestHandler;
  corsOrigins?: string[];
}

export function createApp(options: AppOptions) {
  const app = express();
  app.use(cors({ origin: options.corsOrigins ?? true }));
  app.use(express.json({ limit: '32kb' }));
  app.use(express.urlencoded({ extended: true }));
  if (process.env.NODE_ENV === 'development') app.use(morgan('dev'));
  app.get('/', (_req, res) => {
    res.json({ message: 'TransitLink API is running', version: '1.0.0' });
  });
  app.use('/api/users', userRoutes);
  app.use('/api/notifications', notificationRoutes);

  const incidents = express.Router();
  const controller = createIncidentController(options.repository, options.emit);
  incidents.use(options.authenticate ?? protect);
  incidents.route('/').get(controller.getIncidents).post(controller.addIncident);
  incidents.route('/:id').put(controller.updateIncident).delete(controller.deleteIncident);
  app.use('/api/incidents', incidents);

  const bodyErrorHandler: ErrorRequestHandler = (error, _req, res, next) => {
    if (error?.type === 'entity.parse.failed') {
      res.status(400).json({ message: 'Request body must contain valid JSON.' });
      return;
    }
    if (error?.type === 'entity.too.large') {
      res.status(413).json({ message: 'Request body is too large.' });
      return;
    }
    next(error);
  };
  app.use(bodyErrorHandler);
  app.use(notFound);
  app.use(errorHandler);
  return app;
}

interface IncidentServerOptions {
  repository?: IncidentRepository;
  supabase?: IncidentSupabaseClient;
  authenticate?: RequestHandler;
  authenticateSocket?: AuthenticateSocket;
  corsOrigins?: string[];
}

export function createIncidentServer(options: IncidentServerOptions = {}) {
  const repository = options.repository ?? new SupabaseIncidentRepository(
    options.supabase ?? createSupabaseClient(),
  );
  const corsOrigins = options.corsOrigins ?? process.env.CORS_ORIGINS
    ?.split(',').map((origin) => origin.trim()).filter(Boolean);
  let io: Server<Record<string, never>, IncidentServerToClientEvents>;
  const app = createApp({
    repository,
    authenticate: options.authenticate,
    corsOrigins,
    emit: (event) => { io.emit(INCIDENT_UPDATED_EVENT, event); },
  });
  const httpServer = createServer(app);
  io = new Server(httpServer, { cors: { origin: corsOrigins ?? true } });
  const authenticateSocket = options.authenticateSocket ?? authenticateIncidentSocket;
  io.use((socket: Socket, next) => {
    authenticateSocket(socket.handshake.auth.token).then(
      () => next(),
      () => next(new Error('Not authorized. Please sign in again.')),
    );
  });
  return { app, httpServer, io };
}
