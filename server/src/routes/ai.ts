
import { Router } from 'express';
import * as aiController from '../controllers/aiController';

const router = Router();

// POST /api/ai/summarize
router.post('/summarize', aiController.summarizeText);

// POST /api/ai/takeaways
router.post('/takeaways', aiController.generateTakeaways);

export default router;
