import { Router } from 'express';
import * as authController from '../controllers/authController.js';
import { authenticateToken } from '../middleware/authenticateToken.js';
import { loginLimiter, signupLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Public routes with rate limiting
router.post('/login', loginLimiter, authController.login);
router.post('/signup', signupLimiter, authController.signup);

// Protected route (requires authentication middleware)
router.get('/me', authenticateToken, authController.getMe);

export default router;
