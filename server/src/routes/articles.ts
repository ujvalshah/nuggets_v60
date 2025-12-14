
import { Router } from 'express';
import * as articlesController from '../controllers/articlesController';

const router = Router();

// GET /api/articles - Get all articles (optionally filtered by authorId via query param)
router.get('/', articlesController.getArticles);

// GET /api/articles/:id - Get specific article
router.get('/:id', articlesController.getArticleById);

// POST /api/articles - Create new article
router.post('/', articlesController.createArticle);

// PUT /api/articles/:id - Update article
router.put('/:id', articlesController.updateArticle);

// DELETE /api/articles/:id - Delete article
router.delete('/:id', articlesController.deleteArticle);

export default router;
