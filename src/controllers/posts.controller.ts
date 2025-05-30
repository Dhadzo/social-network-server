import { Response } from 'express';
import { AuthRequest } from '../types/auth.types';
import { PostsService } from '../services/posts.service';

const postsService = new PostsService();

export class PostsController {
  async createPost(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const post = await postsService.createPost(req.user.id, req.body);
      res.status(201).json({
        message: 'Post created successfully',
        post
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async getAllPosts(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 10;

      const { posts, total, hasMore, page } = await postsService.getAllPosts(
        req.user.id,
        offset,
        limit
      );

      res.json({
        message: 'Posts retrieved successfully',
        posts,
        total,
        hasMore,
        page
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async getPostById(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const postId = parseInt(req.params.id);
      const post = await postsService.getPostById(postId, req.user.id);

      if (!post) {
        res.status(404).json({ message: 'Post not found' });
        return;
      }

      res.json({
        message: 'Post retrieved successfully',
        post
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async toggleLike(req: AuthRequest, res: Response): Promise<void> {
    try {
      const postId = parseInt(req.params.id);
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const updatedPost = await postsService.toggleLike(postId, userId);
      res.json({
        message: 'Post liked/unliked successfully',
        post: updatedPost
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async getUserPosts(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const userId = parseInt(req.params.id);
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 10;

      const { posts, total, hasMore, page } = await postsService.getUserPosts(
        userId,
        req.user.id,
        offset,
        limit
      );

      res.json({
        message: 'User posts retrieved successfully',
        posts,
        total,
        hasMore,
        page
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async getUserLikes(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const userId = parseInt(req.params.id);
      const offset = parseInt(req.query.offset as string) || 0;
      const limit = parseInt(req.query.limit as string) || 10;

      const { posts, total, hasMore, page } = await postsService.getUserLikes(
        userId,
        req.user.id,
        offset,
        limit
      );

      res.json({
        message: 'User liked posts retrieved successfully',
        posts,
        total,
        hasMore,
        page
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
