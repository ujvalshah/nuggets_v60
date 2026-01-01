import { Router } from 'express';
import { publishBatch } from '../controllers/batchController.js';
import { authenticateToken } from '../middleware/authenticateToken.js';

const router = Router();

/**
 * POST /api/batch/publish
 * 
 * Publish multiple draft nuggets by setting their visibility to 'public'
 * 
 * Requires authentication
 */
router.post('/publish', authenticateToken, publishBatch);

export default router;




