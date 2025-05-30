import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.middleware';
import { PostsController } from '../controllers/posts.controller';

const router = Router();

const postsController = new PostsController();

router.get('/posts', authenticateUser, postsController.getAllPosts);

router.get('/:id', authenticateUser, postsController.getPostById);

router.post('/create-post', authenticateUser, postsController.createPost);

router.post('/toggle-like/:id', authenticateUser, postsController.toggleLike);

router.get('/user/:id', authenticateUser, postsController.getUserPosts);

router.get('/user/:id/likes', authenticateUser, postsController.getUserLikes);

export default router;
