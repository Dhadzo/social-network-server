import { Request } from 'express';
import { RowDataPacket } from 'mysql2';

export interface Role extends RowDataPacket {
  id: number;
  name: string;
  description: string;
}

export interface Permission extends RowDataPacket {
  id: number;
  name: string;
  description: string;
}

export interface User extends RowDataPacket {
  id: number;
  username: string;
  email: string;
  password: string;
  name: string;
  roles?: Role[];
  permissions?: Permission[];
}

export interface SafeUser {
  id: number;
  username: string;
  email: string;
  name: string;
  roles?: Role[];
  permissions?: Permission[];
}

export interface AuthRequest extends Request {
  user?: SafeUser;
  params: {
    [key: string]: string;
  };
  query: {
    [key: string]: string | undefined;
  };
}

export interface SignupDTO {
  username: string;
  password: string;
  email: string;
  name: string;
}

export interface SigninDTO {
  email: string;
  password: string;
}
