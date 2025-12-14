
import { Router } from 'express';
import * as collectionsController from '../controllers/collectionsController';

const router = Router();

router.get('/', collectionsController.getCollections);
router.get('/:id', collectionsController.getCollectionById);
router.post('/', collectionsController.createCollection);
router.put('/:id', collectionsController.updateCollection);
router.delete('/:id', collectionsController.deleteCollection);

// Entries
router.post('/:id/entries', collectionsController.addEntry);
router.delete('/:id/entries/:articleId', collectionsController.removeEntry);
router.post('/:id/entries/:articleId/flag', collectionsController.flagEntry);

export default router;
