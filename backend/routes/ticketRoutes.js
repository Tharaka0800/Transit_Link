import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getBusTrips, releaseSeatHold } from '../controllers/busSeatController.js';
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
router.get('/journeys/:journeyId/trips', getBusTrips);
router.post('/quotes/:quoteId/release', releaseSeatHold);
router.post('/quotes', createQuote);
router.post('/purchase', purchaseTicket);
router.post('/verify', requireTicketVerifier, verifyTicket);
router.post('/redeem', requireTicketVerifier, redeemTicket);
router.get('/', getTickets);
router.get('/:id', getTicket);
export default router;
