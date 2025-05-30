import { SafeUser } from './auth.types';

export interface Post {
  id: number;
  content: string;
  user_id: number;
  created_at: string;
}

export interface CreatePostDTO {
  content: string;
}

export interface PostWithUser extends Post {
  user: SafeUser;
}
