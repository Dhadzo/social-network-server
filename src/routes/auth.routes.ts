import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import {
  validateSignup,
  validateSignin
} from '../middleware/validation.middleware';
import { authenticateUser } from '../middleware/auth.middleware';
import { hasRole } from '../middleware/permission.middleware';

const router = Router();
const authController = new AuthController();

router.post('/signout', authController.signout);
router.post('/signup', validateSignup, authController.signup);
router.post('/signin', validateSignin, authController.signin);
router.post('/update-profile', authenticateUser, authController.updateProfile);
router.post('/refresh', authenticateUser, authController.refreshToken);

router.delete(
  '/delete-account/:id',
  authenticateUser,
  // hasRole('admin'),
  authController.deleteAccount
);

export default router;
