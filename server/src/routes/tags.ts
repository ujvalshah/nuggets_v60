import { Router } from 'express';

const router = Router();

// Mock categories/tags data
let CATEGORIES_DB: string[] = ['Tech', 'Business', 'Finance', 'Design', 'Lifestyle'];

// GET /api/categories - Get all categories
router.get('/', (req, res) => {
  res.json(CATEGORIES_DB);
});

// POST /api/categories - Add a new category
router.post('/', (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: 'Category name is required' });
  
  if (!CATEGORIES_DB.includes(name)) {
    CATEGORIES_DB.push(name);
  }
  res.status(201).json({ name });
});

// DELETE /api/categories/:name - Delete a category
router.delete('/:name', (req, res) => {
  const { name } = req.params;
  const index = CATEGORIES_DB.indexOf(name);
  
  if (index === -1) {
    return res.status(404).json({ message: 'Category not found' });
  }
  
  CATEGORIES_DB = CATEGORIES_DB.filter(c => c !== name);
  res.status(204).send();
});

export default router;

