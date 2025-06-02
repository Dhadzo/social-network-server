import { Response } from 'express';
import { AuthRequest } from '../types/auth.types';
import { followsService } from '../services/follows.service';

export class FollowsController {
  async toggleFollow(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const followingId = parseInt(req.params.id);
      const isFollowing = await followsService.toggleFollow(
        req.user.id,
        followingId
      );

      res.json({
        message: isFollowing
          ? 'User followed successfully'
          : 'User unfollowed successfully',
        isFollowing
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async getSuggestedUsers(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 3;

      const suggestions = await followsService.getSuggestedUsers(
        req.user.id,
        limit
      );

      res.json({
        message: 'Suggested users retrieved successfully',
        suggestions
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async getFollowing(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const following = await followsService.getFollowing(req.user.id);

      res.json({
        message: 'Following list retrieved successfully',
        following
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async getFollowers(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const followers = await followsService.getFollowers(req.user.id);

      res.json({
        message: 'Followers list retrieved successfully',
        followers
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async getUserFollowers(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const userId = parseInt(req.params.id);
      const followers = await followsService.getUserFollowers(userId);

      res.json({
        message: 'User followers retrieved successfully',
        followers
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async getUserFollowing(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const userId = parseInt(req.params.id);
      const following = await followsService.getUserFollowing(userId);

      res.json({
        message: 'User following retrieved successfully',
        following
      });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }
}
