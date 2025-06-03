import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { environment } from '../config/environment';
import { AuthRequest } from '../types/auth.types';
export class AuthController {
  async signup(req: Request, res: Response): Promise<void> {
    try {
      const { user, token } = await authService.signup(req.body);
      res.cookie('token', token, {
        httpOnly: true,
        secure: environment.nodeEnv === 'production',
        sameSite: environment.nodeEnv === 'production' ? 'lax' : 'strict',
        maxAge: 2 * 60 * 60 * 1000 // 2 hours
      });

      res.status(201).json({
        message: 'User created successfully',
        user
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === 'Email already registered'
      ) {
        res.status(409).json({ message: error.message });
        return;
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async signin(req: Request, res: Response): Promise<void> {
    try {
      const { user, token } = await authService.signin(req.body);
      res.cookie('token', token, {
        httpOnly: true,
        secure: environment.nodeEnv === 'production',
        sameSite: environment.nodeEnv === 'production' ? 'lax' : 'strict',
        maxAge: 2 * 60 * 60 * 1000 // 2 hours
      });
      res.json({ message: 'Successfully signed in', user: user });
    } catch (error) {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  }

  async signout(req: Request, res: Response): Promise<void> {
    res.clearCookie('token', {
      httpOnly: true
    });
    res.json({ message: 'Successfully signed out' });
  }

  async deleteAccount(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      await authService.deleteAccount(id);
      res.clearCookie('token', {
        httpOnly: true
      });
      res.json({ message: 'Account deleted successfully' });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async updateProfile(req: AuthRequest, res: Response): Promise<void> {
    try {
      const { email, username, name } = req.body;
      const updatedUser = await authService.updateProfile({
        id: req.user?.id,
        email,
        username,
        name
      });
      res.json({ message: 'Profile updated successfully', user: updatedUser });
    } catch (error) {
      res.status(500).json({ message: 'Internal server error' });
    }
  }

  async refreshToken(req: AuthRequest, res: Response): Promise<void> {
    try {
      if (!req.user?.id) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const { token } = await authService.refreshToken(req.user.id);

      res.cookie('token', token, {
        httpOnly: true,
        secure: environment.nodeEnv === 'production',
        sameSite: environment.nodeEnv === 'production' ? 'lax' : 'strict',
        maxAge: 2 * 60 * 60 * 1000 // 2 hours
      });

      res.json({ message: 'Token refreshed successfully' });
    } catch (error) {
      res.status(401).json({ message: 'Invalid authentication' });
    }
  }
}
