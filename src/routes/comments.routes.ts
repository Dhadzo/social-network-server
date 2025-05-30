import { Router } from 'express';
import { authenticateUser } from '../middleware/auth.middleware';
import { CommentsController } from '../controllers/comments.controller';

const router = Router();
const commentsController = new CommentsController();

router.get('/posts/:id/comments', commentsController.getCommentsByPostId);

router.post(
  '/create-comment',
  authenticateUser,
  commentsController.createComment
);

export default router;
