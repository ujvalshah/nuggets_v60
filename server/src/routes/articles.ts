import { Router } from 'express';
import * as articlesController from '../controllers/articlesController.js';
import { authenticateToken } from '../middleware/authenticateToken.js';

const router = Router();

// GET /api/articles - Get all articles (optionally filtered by authorId via query param)
router.get('/', articlesController.getArticles);

// GET /api/articles/:id - Get specific article
router.get('/:id', articlesController.getArticleById);

// POST /api/articles - Create new article (requires authentication)
router.post('/', authenticateToken, articlesController.createArticle);

// PUT /api/articles/:id - Update article (requires authentication)
router.put('/:id', authenticateToken, articlesController.updateArticle);

// PATCH /api/articles/:id - Partial update article (requires authentication)
router.patch('/:id', authenticateToken, articlesController.updateArticle);

// DELETE /api/articles/:id - Delete article (requires authentication)
router.delete('/:id', authenticateToken, articlesController.deleteArticle);

export default router;
