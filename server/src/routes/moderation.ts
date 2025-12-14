import { Router } from 'express';
import * as moderationController from '../controllers/moderationController.js';
import { authenticateToken } from '../middleware/authenticateToken.js';

const router = Router();

// Public route - anyone can create a report
router.post('/reports', moderationController.createReport);

// Protected routes - require authentication (admin access)
router.get('/reports', authenticateToken, moderationController.getReports);
router.patch('/reports/:id/resolve', authenticateToken, moderationController.resolveReport);

export default router;
