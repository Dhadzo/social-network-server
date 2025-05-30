import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool from '../config/database';
import { SignupDTO, SigninDTO, User, SafeUser } from '../types/auth.types';
import { environment } from '../config/environment';
import { ResultSetHeader, RowDataPacket } from 'mysql2';

export class AuthService {
  async signup(userData: SignupDTO) {
    const [existing] = await pool.execute<RowDataPacket[]>(
      'SELECT id FROM users WHERE email = ?',
      [userData.email]
    );

    if (existing.length) {
      throw new Error('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    let result: any;
    const connection = await pool.getConnection();

    try {
      // Start a transaction using the connection
      await connection.query('START TRANSACTION');

      // Insert user
      [result] = await connection.execute<ResultSetHeader>(
        'INSERT INTO users (username, password, email, name) VALUES (?, ?, ?, ?)',
        [userData.username, hashedPassword, userData.email, userData.name]
      );

      // Get the default user role
      const [roles] = await connection.execute<RowDataPacket[]>(
        'SELECT id FROM roles WHERE name = ?',
        ['user']
      );

      if (roles.length) {
        // Assign the default user role
        await connection.execute(
          'INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)',
          [result.insertId, roles[0].id]
        );
      }

      await connection.query('COMMIT');
    } catch (error) {
      await connection.query('ROLLBACK');
      console.error('Database error:', error);
      throw error;
    } finally {
      connection.release();
    }

    const safeUser: SafeUser = {
      id: result.insertId,
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
  }

  async signin(credentials: SigninDTO) {
    const [result] = await pool.execute('SELECT 1');
    try {
      const [users] = await pool.execute<RowDataPacket[]>(
        'SELECT id, email, password, username, name FROM users WHERE email = ?',
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
    const [result] = await pool.execute<ResultSetHeader>(
      'DELETE FROM users WHERE id = ?',
      [parseInt(id, 10)]
    );

    if (result.affectedRows === 0) {
      throw new Error('User not found');
    }

    return true;
  }

  async updateProfile(
    updateData: Partial<Omit<User, 'password'>>
  ): Promise<SafeUser> {
    // If email is being updated, check for duplicates
    if (updateData.email) {
      const [existing] = await pool.execute<User[]>(
        'SELECT id FROM users WHERE email = ? AND id != ?',
        [updateData.email, updateData.id]
      );

      if (existing.length) {
        throw new Error('Email already in use');
      }
    }

    // If username is being updated, check for duplicates
    if (updateData.username) {
      const [existing] = await pool.execute<User[]>(
        'SELECT id FROM users WHERE username = ? AND id != ?',
        [updateData.username, updateData.id]
      );

      if (existing.length) {
        throw new Error('Username already taken');
      }
    }

    // Build the SET clause dynamically
    const updateFields = Object.keys(updateData)
      .filter((key) => key !== 'id') // Exclude id from update fields
      .map((key) => `${key} = ?`)
      .join(', ');

    const values = Object.keys(updateData)
      .filter((key) => key !== 'id')
      .map((key) => updateData[key as keyof typeof updateData]);

    values.push(updateData.id);

    // Add the id for the WHERE clause
    const [result] = await pool.execute<ResultSetHeader>(
      `UPDATE users SET ${updateFields} WHERE id = ?`,
      values
    );

    if (result.affectedRows === 0) {
      throw new Error('User not found');
    }

    // Fetch and return updated user data
    const [users] = await pool.execute<User[]>(
      'SELECT id, email, username, name FROM users WHERE id = ?',
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
    const [users] = await pool.execute<User[]>(
      'SELECT id, email, username, name FROM users WHERE id = ?',
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
