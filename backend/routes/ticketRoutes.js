import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getJourneys,
  createQuote,
  purchaseTicket,
  getTickets,
  getTicket,
  requireTicketVerifier,
  verifyTicket,
  redeemTicket,
} from '../controllers/ticketController.js';

const router = express.Router();
router.use(protect);
router.get('/journeys', getJourneys);
router.post('/quotes', createQuote);
router.post('/purchase', purchaseTicket);
router.post('/verify', requireTicketVerifier, verifyTicket);
router.post('/redeem', requireTicketVerifier, redeemTicket);
router.get('/', getTickets);
router.get('/:id', getTicket);
export default router;
