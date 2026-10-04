import express from 'express';
import {
  getNotifications,
  createNotification,
  markAsRead,
  deleteNotification,
} from '../controllers/notificationController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router
  .route('/')
  .get(protect, getNotifications)
  .post(protect, createNotification);

router
  .route('/:id')
  .put(protect, markAsRead)
  .delete(protect, deleteNotification);

export default router;
