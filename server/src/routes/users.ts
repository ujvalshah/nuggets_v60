
import { Router } from 'express';
import * as usersController from '../controllers/usersController';

const router = Router();

router.get('/', usersController.getUsers);
router.get('/:id', usersController.getUserById);
router.put('/:id', usersController.updateUser);
router.delete('/:id', usersController.deleteUser);
router.get('/:id/feed', usersController.getPersonalizedFeed);

export default router;
