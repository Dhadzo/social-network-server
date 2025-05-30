import { SafeUser } from './auth.types';

export type NotificationType =
  | 'like'
  | 'comment'
  | 'follow'
  | 'mention'
  | 'message';

export interface Notification {
  id: number;
  type: NotificationType;
  message: string;
  read: boolean;
  created_at: string;
  user: SafeUser;
  post?: {
    id: number;
    content: string;
  };
}

export interface CreateNotificationDTO {
  userId: number;
  actorId: number;
  type: NotificationType;
  message: string;
  postId?: number;
  commentId?: number;
}

export interface NotificationsResponse {
  notifications: Notification[];
  total: number;
  hasMore: boolean;
  page: number;
}
