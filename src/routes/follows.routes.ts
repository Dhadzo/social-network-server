import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.middleware';
import { FollowsController } from '../controllers/follows.controller';

const router = Router();
const followsController = new FollowsController();

// Toggle follow/unfollow a user
router.post('/toggle/:id', authenticateUser, followsController.toggleFollow);

// Get suggested users to follow
router.get(
  '/suggestions',
  authenticateUser,
  followsController.getSuggestedUsers
);

// Get users that the current user is following
router.get('/following', authenticateUser, followsController.getFollowing);

// Get users that are following the current user
router.get('/followers', authenticateUser, followsController.getFollowers);

router.get(
  '/followers/:id',
  authenticateUser,
  followsController.getUserFollowers
);

router.get(
  '/following/:id',
  authenticateUser,
  followsController.getUserFollowing
);

export default router;
