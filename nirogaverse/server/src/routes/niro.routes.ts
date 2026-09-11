import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  createSession,
  deleteSession,
  getSession,
  getSessions,
  sendMessage,
} from '../controllers/niro.controller';

const router = Router();

router.use(authMiddleware);
router.get('/sessions', getSessions);
router.post('/sessions', createSession);
router.get('/sessions/:sessionId', getSession);
router.post('/message', sendMessage);
router.delete('/sessions/:sessionId', deleteSession);

export default router;
