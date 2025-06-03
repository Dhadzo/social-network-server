import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { SignupDTO, SigninDTO, User, SafeUser } from '../types/auth.types';
import { environment } from '../config/environment';

export class AuthService {
  async signup(userData: SignupDTO) {
    const { rows: existing } = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [userData.email]
    );

    if (existing.length) {
      throw new Error('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Insert user
      const {
        rows: [result]
      } = await client.query(
        'INSERT INTO users (username, password, email, name) VALUES ($1, $2, $3, $4) RETURNING id',
        [userData.username, hashedPassword, userData.email, userData.name]
      );

      // Get the default user role
      const { rows: roles } = await client.query(
        'SELECT id FROM roles WHERE name = $1',
        ['user']
      );

      if (roles.length) {
        // Assign the default user role
        await client.query(
          'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)',
          [result.id, roles[0].id]
        );
      }

      await client.query('COMMIT');

      const safeUser: SafeUser = {
        id: result.id,
        username: userData.username,
        email: userData.email,
        name: userData.name
      };

      const token = jwt.sign(
        { user: safeUser },
        environment.jwtSecret as string,
        {
          expiresIn: '2h'
        }
      );

      return { user: safeUser, token };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Database error:', error);
      throw error;
    } finally {
      client.release();
    }
  }

  async signin(credentials: SigninDTO) {
    try {
      const { rows: users } = await pool.query(
        'SELECT id, email, password, username, name FROM users WHERE email = $1',
        [credentials.email]
      );

      const user = users[0];
      if (!user) {
        throw new Error('Invalid credentials');
      }

      const isValid = await bcrypt.compare(credentials.password, user.password);
      if (!isValid) {
        throw new Error('Invalid credentials');
      }

      const safeUser: SafeUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        name: user.name
      };

      const token = jwt.sign(
        { user: safeUser },
        environment.jwtSecret as string,
        { expiresIn: '2h' }
      );

      return { user: safeUser, token };
    } catch (error) {
      console.error('Database error:', error);
      throw error;
    }
  }

  async deleteAccount(id: string): Promise<boolean> {
    const { rowCount } = await pool.query('DELETE FROM users WHERE id = $1', [
      parseInt(id, 10)
    ]);

    if (rowCount === 0) {
      throw new Error('User not found');
    }

    return true;
  }

  async updateProfile(
    updateData: Partial<Omit<User, 'password'>>
  ): Promise<SafeUser> {
    // If email is being updated, check for duplicates
    if (updateData.email) {
      const { rows: existing } = await pool.query(
        'SELECT id FROM users WHERE email = $1 AND id != $2',
        [updateData.email, updateData.id]
      );

      if (existing.length) {
        throw new Error('Email already in use');
      }
    }

    // If username is being updated, check for duplicates
    if (updateData.username) {
      const { rows: existing } = await pool.query(
        'SELECT id FROM users WHERE username = $1 AND id != $2',
        [updateData.username, updateData.id]
      );

      if (existing.length) {
        throw new Error('Username already taken');
      }
    }

    // Build the SET clause dynamically
    const updateFields = Object.keys(updateData)
      .filter((key) => key !== 'id')
      .map((key, index) => `${key} = $${index + 1}`)
      .join(', ');

    const values = Object.keys(updateData)
      .filter((key) => key !== 'id')
      .map((key) => updateData[key as keyof typeof updateData]);

    values.push(updateData.id);

    const { rowCount } = await pool.query(
      `UPDATE users SET ${updateFields} WHERE id = $${values.length}`,
      values
    );

    if (rowCount === 0) {
      throw new Error('User not found');
    }

    // Fetch and return updated user data
    const { rows: users } = await pool.query(
      'SELECT id, email, username, name FROM users WHERE id = $1',
      [updateData.id]
    );

    const updatedUser: SafeUser = {
      id: users[0].id,
      username: users[0].username,
      email: users[0].email,
      name: users[0].name
    };

    return updatedUser;
  }

  async refreshToken(userId: number): Promise<{ token: string }> {
    const { rows: users } = await pool.query(
      'SELECT id, email, username, name FROM users WHERE id = $1',
      [userId]
    );

    if (!users.length) {
      throw new Error('User not found');
    }

    const user = users[0];
    const safeUser: SafeUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      name: user.name
    };

    const token = jwt.sign(
      { user: safeUser },
      environment.jwtSecret as string,
      { expiresIn: '2h' }
    );

    return { token };
  }
}

export const authService = new AuthService();
