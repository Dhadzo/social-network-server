import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.middleware';
import { AuthRequest } from '../types/auth.types';
import { Response } from 'express';
import { usersController } from '../controllers/users.controller';

const router = Router();

// Protected route that requires authentication
router.get('/profile', authenticateUser, (req: AuthRequest, res: Response) => {
  // req.user is available because of the authenticateUser middleware
  res.json({
    message: 'Profile retrieved successfully',
    user: req.user
  });
});

// Search users endpoint
router.get('/search', authenticateUser, usersController.searchUsers);

router.get('/:username', authenticateUser, usersController.getUserByUsername);

export default router;
